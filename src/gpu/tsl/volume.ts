import {
    abs, any, Break, ceil, clamp, Discard, EPSILON, float, floor, Fn, greaterThanEqual, If, int,
    ivec3, lessThan, Loop, max, min, normalize, select, sign, vec3, bool
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';
import { hitBox, locateSample, readVoxel, rayVaryings } from './utils/volumeHelpers';
import { Compositor, makeCompositor, VolumeMode } from './utils/compositors';

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
    if (useBricks) skipLeadingEmpty(vOrigin, rayDir, bounds);
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

// --- EMPTY-SPACE SKIP --- //
// Moves bounds.x to the entry of the first coarse brick whose [min,max] overlaps the threshold range.
// Discards the pixel if no brick along the ray is occupied.
const skipLeadingEmpty = (vOrigin: any, rayDir: any, bounds: any) => {
	const gridRes = u.coarseShape;
	const boxMin = u.volumeScale.mul(0.5).negate();
	// Brick size = kernelShape fine voxels, so partial edge bricks still line up with the fine grid
	const voxelSize = u.volumeScale.div(u.dataShape).mul(u.coarseKernel);

	const p0 = vOrigin.add(bounds.x.mul(rayDir));
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

	const t = bounds.x.toVar('cT');
	const found = bool(false).toVar('found');
	const maxSteps = int(gridRes.x.add(gridRes.y).add(gridRes.z)).add(4);

	Loop(maxSteps, () => {
		If(t.greaterThan(bounds.y), () => { Break(); });

		const mm = u.coarseVolume.load(cell).toVar();	// .x = min, .y = max
		// u8 all-NaN bricks are coded 255 -> 1.0 after unorm; f16 NaN fails the comparisons on its own
		const allNaN = mm.x.greaterThan(254.5 / 255);
		const occupied = allNaN.not().and(mm.y.greaterThanEqual(u.threshold.x)).and(mm.x.lessThanEqual(u.threshold.y));
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
	bounds.x.assign(t);
};
