import {
    abs, any, Break, ceil, clamp, Discard, EPSILON, float, floor, Fn, fract, greaterThanEqual, If, int,
    ivec3, lessThan, Loop, max, min, mod, normalize, select, sign, vec3, vec4, bool,
	vec2
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';
import { hitBox, locateSample, readVoxel, rayVaryings } from './utils/volumeHelpers';
import { Compositor, makeCompositor, VolumeMode } from './utils/compositors';

// DEBUG: render the first occupied coarse brick instead of the volume (only when useBricks)
const DEBUG_COARSE = false;

export type VolumeTraversal = 'dda' | 'raymarch';

// Walks the ray from bounds.x to bounds.y, calling compositeAt for every sample position.
type Traversal = (vOrigin: any, rayDir: any, bounds: any, comp: Compositor) => void;

export const createVolumeMaterial = (type: VolumeTraversal, mode: VolumeMode = 'additive', isOrtho = false, useBricks = false) => {
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    material.depthWrite = false;
    const { vOrigin, vDirection } = rayVaryings(material, isOrtho);
    material.colorNode = volumeShader(traversals[type], mode, useBricks)(vOrigin, vDirection);
    return material
}

// --- PER-PIXEL --- //
const volumeShader = (traverse: Traversal, mode: VolumeMode, useBricks=false) => Fn(([vOrigin, vDirection]: [any, any]) => {
    const rayDir = normalize(vDirection).toVar('rayDir');
	// Entry/exit distances, discarding rays that miss the box
	const bounds = hitBox(vOrigin, rayDir).toVar('bounds');
	If(bounds.x.greaterThan(bounds.y), () => { Discard(); });
	bounds.x.assign(max(bounds.x, 0.0));
	if (useBricks && DEBUG_COARSE) {
		const cell = skipEmptyPadding(vOrigin, rayDir, bounds);
		// Color = normalized brick index; checkerboard darkens every other brick so neighbours are distinct
		const checker = mod(float(cell.x.add(cell.y).add(cell.z)), 2.0).mul(0.4).add(0.6);
		return vec4(vec3(cell).add(0.5).div(vec3(u.coarseShape)).mul(checker), 1.0);
	}
    if (useBricks) {
		if(mode == 'additive'){
			// NaN/fill voxels are tinted when nanAlpha > 0, but bricks only track valid min/max, so skipping could hide the tint
			If(u.nanAlpha.lessThanEqual(0.0), () => {
				skipEmptyPadding(vOrigin, rayDir, bounds);
				// Fully opaque rays stop at the first hit, so trailing empty space is never reached
				If(u.transparency.greaterThan(0.0), () => { skipEmptyPadding(vOrigin, rayDir, bounds, true); });
			});
		} else {
			findCoarseMIP(vOrigin, rayDir, bounds, mode)
		}
	}
    const comp = makeCompositor(mode);
    traverse(vOrigin, rayDir, bounds, comp);
    return comp.finish();
});

// --- PER-SAMPLE --- //
// borderUV turns the sample's maskUV into the UV used for the border lookup (identity by default)
const compositeAt = (comp: Compositor, p: any, borderUV = (maskUV: any) => maskUV) => {
	const loc = locateSample(p);
	If(loc.skip.not(), () => {
		const v = readVoxel(loc.texCoord);
		If(v.inRange, () => {
			comp.sample({ d: v.d, biVal: v.biVal, isNan: v.isNan, borderUV: () => borderUV(loc.maskUV) });
		});
	});
};

// --- DDA --- //
// Visits every voxel the ray crosses exactly once
const ddaTraverse: Traversal = (vOrigin, rayDir, bounds, comp) => {
    const gridRes = u.dataShape;
    const boxMin = u.volumeScale.mul( 0.5 ).negate();
    const voxelSize = u.volumeScale.div( gridRes );

    // Initial voxel from the ray's entry point into the box.
    const p0 = vOrigin.add( bounds.x.mul( rayDir ) );
    const localPos = clamp( p0.sub( boxMin ).div( u.volumeScale ), vec3( 0.0 ), vec3( 1.0 ).sub( vec3( EPSILON ) ) ).mul( gridRes );
    const voxel = clamp( ivec3( floor( localPos ) ), ivec3( 0 ), ivec3( gridRes ).sub( 1 ) ).toVar("voxel");
    // Standard 3D DDA (Amanatides & Woo) setup.
    const stepDir = sign( rayDir );
    const stepDirI = ivec3( stepDir );
    const nextBoundary = boxMin.add( vec3( voxel ).add( max( stepDir, 0.0 ) ).mul( voxelSize ) );
    const tMax = nextBoundary.sub( vOrigin ).div( rayDir ).toVar("tMax");
    const tDelta = voxelSize.div( abs( rayDir ) ).toVar("tDelta");
    // // Handle parallel rays. If ray has < eps component in an axis, it will never cross that axis
    // // If it is degen just manually set the interesction distance to someting arbitrarly high
    const degenerate = lessThan( abs( rayDir ), vec3( EPSILON ) );
    tMax.assign( select(degenerate, vec3( 1e30 ), tMax ));
    tDelta.assign( select(  degenerate, vec3( 1e30 ), tDelta ));
    const t = bounds.x.toVar('t');
    const maxSteps = int( gridRes.x.add( gridRes.y ).add( gridRes.z ) ).mul( 2 ).add( 8 );

	// Samples sit at voxel centers, but borders use the continuous hit point so they stay sharp
	const hitPointMaskUV = () => {
		const pHit = vOrigin.add(t.mul(rayDir)).toVar();
		const localPosContinuous = pHit.xy.sub(boxMin).div(u.volumeScale).toVar();
		return h.reprojectMask(localPosContinuous.xy);
	};

    // //Steps
    Loop( maxSteps, () => {
        If( t.greaterThan( bounds.y ), () => {Break();});
        const pCenter = boxMin.add( vec3( voxel ).add( 0.5 ).mul( voxelSize ) );
		compositeAt(comp, pCenter, hitPointMaskUV);
        If(tMax.x.lessThan(tMax.y).and(tMax.x.lessThan(tMax.z)), () => {
            t.assign(tMax.x);
            tMax.x.addAssign(tDelta.x);
            voxel.x.addAssign(stepDirI.x);
        }).ElseIf(tMax.y.lessThan(tMax.z), () => {
            t.assign(tMax.y);
            tMax.y.addAssign(tDelta.y);
            voxel.y.addAssign(stepDirI.y);
        }).Else(() => {
            t.assign(tMax.z);
            tMax.z.addAssign(tDelta.z);
            voxel.z.addAssign(stepDirI.z);
        });

        If(any(lessThan( voxel, ivec3( 0 ) ))
            .or(any( greaterThanEqual( voxel, ivec3( gridRes )))), () =>{
            Break();
        });
    })
}

// --- RAYMARCH --- //
const marchTraverse: Traversal = (vOrigin, rayDir, bounds, comp) => {
    const inc = vec3(1.0).div(abs(rayDir));
    const delta = min(inc.x, min(inc.y, inc.z)).div(u.steps).toVar('delta');

    const nSteps = int(ceil(bounds.y.sub(bounds.x).div(delta)));
    Loop(nSteps, ({ i }: { i: any }) => {
        const t = bounds.x.add(float(i).mul(delta));
        const p = vOrigin.add(rayDir.mul(t)).toVar("p");
		compositeAt(comp, p);
    });
}

const traversals: Record<VolumeTraversal, Traversal> = { dda: ddaTraverse, raymarch: marchTraverse };

// --- COARSE USERS --- //
const decodeBrick = (texelIn: any) => {
    const flip = u.bivariate.and(u.bivariateSelection.notEqual(0));
    const texel = select(flip, texelIn.zw, texelIn.xy).toVar();
    const allNaN = h.isNanVal(texel.x).toVar();
    // Compare raw texels: rescaling/cScale could flip the order
    const someNaN = allNaN.or(texel.x.greaterThanEqual(texel.y)).toVar();
    const a = select(u.bivariate, texel.x, clamp(h.rescaler(texel.x).mul(u.cScale).add(u.cOffset), 0.0, 0.995));
    const b = select(u.bivariate, texel.y, clamp(h.rescaler(texel.y).mul(u.cScale).add(u.cOffset), 0.0, 0.995));
    const lo = min(a, b).toVar();
    const hi = max(a, b).toVar();
    const overlaps = allNaN.not().and(hi.greaterThanEqual(u.threshold.x)).and(lo.lessThanEqual(u.threshold.y));
    return { lo, hi, allNaN, someNaN, overlaps };
};

// Moves bounds.x to the entry of the first coarse brick whose [min,max] overlaps the threshold range.
// reverse: marches back from bounds.y and moves bounds.y to the exit of the last occupied brick instead.
// Discards the pixel if no brick along the ray is occupied.
const skipEmptyPadding = (vOrigin: any, rayDirIn: any, bounds: any, reverse = false) => {
	const rayDir = reverse ? rayDirIn.negate() : rayDirIn;
	const tStart = reverse ? bounds.y.negate() : bounds.x;
	const tEnd = reverse ? bounds.x.negate() : bounds.y;
	const gridRes = u.coarseShape;
	const boxMin = u.volumeScale.mul(0.5).negate();
	// Brick size = kernelShape fine voxels, so partial edge bricks still line up with the fine grid
	const voxelSize = u.volumeScale.div(u.dataShape).mul(u.coarseKernel);

	const p0 = vOrigin.add(tStart.mul(rayDir));
	const localPos = p0.sub(boxMin).div(voxelSize);
	const cell = clamp(ivec3(floor(localPos)), ivec3(0), ivec3(gridRes).sub(1)).toVar('cell');

	const stepDir = sign(rayDir);
	const stepDirI = ivec3(stepDir);
	const nextBoundary = boxMin.add(vec3(cell).add(max(stepDir, 0.0)).mul(voxelSize));
	const tMax = nextBoundary.sub(vOrigin).div(rayDir).toVar('cTMax');
	const tDelta = voxelSize.div(abs(rayDir)).toVar('cTDelta');
	const degenerate = lessThan(abs(rayDir), vec3(EPSILON));
	tMax.assign(select(degenerate, vec3(1e30), tMax));
	tDelta.assign(select(degenerate, vec3(1e30), tDelta));

	const t = tStart.toVar('cT');
	const found = bool(false).toVar('found');
	const maxSteps = int(gridRes.x.add(gridRes.y).add(gridRes.z)).add(4);

	const kz = float(u.coarseKernel.z);
	const Dz = float(u.dataShape.z);
	const lastBrick = int(gridRes.z).sub(1);

	const brickAt = (zNorm: any) => {
			const zShifted = fract(zNorm.add(u.animateProg)); // wrap around the volume
			return clamp(int(floor(zShifted.mul(Dz).div(kz))), int(0), lastBrick);
		};

	Loop(maxSteps, () => {
		If(t.greaterThan(tEnd), () => { Break(); });
		// Each cell covers z-range [z0, z1) of the volume (normalized 0..1). With the z-animation
		// offset applied (and wrapped), find the coarse bricks at both ends of that range.
		const zStart = float(cell.z).mul(kz).div(Dz);
		const zEnd = min(float(cell.z).add(1).mul(kz), Dz).div(Dz).sub(1e-5); // epsilon keeps end inside the cell
		const bS = brickAt(zStart);
		const bE = brickAt(zEnd);
		const brickStart = decodeBrick(u.coarseVolume.load(ivec3(cell.x, cell.y, bS)));
		const brickEnd = decodeBrick(u.coarseVolume.load(ivec3(cell.x, cell.y, bE)));
		const occupied = brickStart.overlaps.or(brickEnd.overlaps).toVar();
		// wrapped: partial last brick lies in between
		If(bE.lessThan(bS), () => {
			occupied.assign(occupied.or(decodeBrick(u.coarseVolume.load(ivec3(cell.x, cell.y, lastBrick))).overlaps));
		});

		If(occupied, () => {
			found.assign(bool(true));
			Break();
		});
		If(tMax.x.lessThan(tMax.y).and(tMax.x.lessThan(tMax.z)), () => {
			t.assign(tMax.x);
			tMax.x.addAssign(tDelta.x);
			cell.x.addAssign(stepDirI.x);
		}).ElseIf(tMax.y.lessThan(tMax.z), () => {
			t.assign(tMax.y);
			tMax.y.addAssign(tDelta.y);
			cell.y.addAssign(stepDirI.y);
		}).Else(() => {
			t.assign(tMax.z);
			tMax.z.addAssign(tDelta.z);
			cell.z.addAssign(stepDirI.z);
		});

		If(any(lessThan(cell, ivec3(0))).or(any(greaterThanEqual(cell, ivec3(gridRes)))), () => {
			Break();
		});
	});

	If(found.not(), () => { Discard(); });
	if (reverse) bounds.y.assign(t.negate());
	else bounds.x.assign(t);
	return cell;
};

const findCoarseMIP = (vOrigin: any, rayDir: any, bounds: any, mode: VolumeMode) => {
	const gridRes = u.coarseShape;
    const boxMin = u.volumeScale.mul( 0.5 ).negate();
    const voxelSize = u.volumeScale.div(u.dataShape).mul(u.coarseKernel);
	const tStart = bounds.x;
	const tEnd = bounds.y;
    const p0 = vOrigin.add(tStart.mul(rayDir));
	const localPos = p0.sub(boxMin).div(voxelSize);
	const cell = clamp(ivec3(floor(localPos)), ivec3(0), ivec3(gridRes).sub(1)).toVar('cell');

	const stepDir = sign(rayDir);
	const stepDirI = ivec3(stepDir);
	const nextBoundary = boxMin.add(vec3(cell).add(max(stepDir, 0.0)).mul(voxelSize));
	const tMax = nextBoundary.sub(vOrigin).div(rayDir).toVar('cTMax');
	const tDelta = voxelSize.div(abs(rayDir)).toVar('cTDelta');
	const degenerate = lessThan(abs(rayDir), vec3(EPSILON));
	tMax.assign(select(degenerate, vec3(1e30), tMax));
	tDelta.assign(select(degenerate, vec3(1e30), tDelta));

    const t = tStart.toVar('cT');
    const maxSteps = int(gridRes.x.add(gridRes.y).add(gridRes.z)).add(4);

    const kz = float(u.coarseKernel.z);
    const Dz = float(u.dataShape.z);
    const lastBrick = int(gridRes.z).sub(1);

    const brickAt = (zNorm: any) => {
        const zShifted = fract(zNorm.add(u.animateProg)); // wrap around the volume
        return clamp(int(floor(zShifted.mul(Dz).div(kz))), int(0), lastBrick);
    };
    const useMin = mode == 'min';
    // Value the ray is guaranteed to reach: max of brick mins (min mode: min of brick maxes).
    // Bricks that can't beat it are skipped; bounds shrink to [first, last] remaining brick.
    const miv = float(useMin ? 1e10 : -1e10).toVar('mivalue');
    const tFirst = float(1e30).toVar('mipFirst');
    const tLast = float(-1e30).toVar('mipLast');
    Loop(maxSteps, () => {
        If(t.greaterThan(tEnd), () => { Break(); });
        const zStart = float(cell.z).mul(kz).div(Dz);
        const zEnd = min(float(cell.z).add(1).mul(kz), Dz).div(Dz).sub(1e-5); // epsilon keeps end inside the cell
        const tExit = min(tMax.x, min(tMax.y, tMax.z)).toVar();
        const consider = (texel: any) => {
            const { lo, hi, someNaN, overlaps } = decodeBrick(texel);
            If(overlaps, () => {
                // Only NaN-free bricks fully inside the threshold guarantee their samples are composited:
                // a ray through a partly NaN brick may only hit NaN voxels and never see lo/hi
                If(someNaN.not().and(lo.greaterThanEqual(u.threshold.x)).and(hi.lessThanEqual(u.threshold.y)), () => {
                    miv.assign(useMin ? min(miv, hi) : max(miv, lo));
                });
                const reachable = useMin
                    ? max(lo, u.threshold.x).lessThanEqual(miv)
                    : min(hi, u.threshold.y).greaterThanEqual(miv);
                If(reachable, () => {
                    tFirst.assign(min(tFirst, t));
                    tLast.assign(max(tLast, tExit));
                });
            });
        };
        const bS = brickAt(zStart);
        const bE = brickAt(zEnd);
        consider(u.coarseVolume.load(ivec3(cell.x, cell.y, bS)));
        consider(u.coarseVolume.load(ivec3(cell.x, cell.y, bE)));
		// wrapped: partial last brick lies in between
		If(bE.lessThan(bS), () => { consider(u.coarseVolume.load(ivec3(cell.x, cell.y, lastBrick))); });

        If(tMax.x.lessThan(tMax.y).and(tMax.x.lessThan(tMax.z)), () => {
            t.assign(tMax.x);
            tMax.x.addAssign(tDelta.x);
            cell.x.addAssign(stepDirI.x);
        }).ElseIf(tMax.y.lessThan(tMax.z), () => {
            t.assign(tMax.y);
            tMax.y.addAssign(tDelta.y);
            cell.y.addAssign(stepDirI.y);
        }).Else(() => {
            t.assign(tMax.z);
            tMax.z.addAssign(tDelta.z);
            cell.z.addAssign(stepDirI.z);
        });

        If(any(lessThan(cell, ivec3(0))).or(any(greaterThanEqual(cell, ivec3(gridRes)))), () => {
            Break();
        });
    });
    If(tLast.lessThan(tFirst), () => { Discard(); });
    bounds.assign(vec2(max(tFirst, bounds.x), min(tLast, bounds.y)));
    return cell;
};
