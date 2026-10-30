import {
    abs, any, Break, ceil, clamp, EPSILON, float, floor, greaterThanEqual, If, int,
    ivec3, lessThan, Loop, max, min, select, sign, vec3
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';
import { rayVaryings } from './utils/volumeHelpers';
import { compositeAt, Traversal, VolumeMode, volumeShader } from './utils/compositors';

export type VolumeTraversal = 'dda' | 'raymarch';

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

    // //Steps
    Loop( maxSteps, () => {
        If( t.greaterThan( bounds.y ), () => {Break();});
        // Sample at the center of the current voxel; borders use the continuous hit point.
        const pCenter = boxMin.add( vec3( voxel ).add( 0.5 ).mul( voxelSize ) );
        compositeAt(comp, pCenter, () => {
            const pHit = vOrigin.add(t.mul(rayDir)).toVar();
            const localPosContinuous = pHit.xy.sub(boxMin).div(u.volumeScale).toVar();
            return h.reprojectMask(localPosContinuous.xy);
        });
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
// Fixed-size steps along the ray
const marchTraverse: Traversal = (vOrigin, rayDir, bounds, comp) => {
    const inc = vec3(1.0).div(abs(rayDir));
    const delta = min(inc.x, min(inc.y, inc.z)).div(u.steps).toVar('delta');

    const nSteps = int(ceil(bounds.y.sub(bounds.x).div(delta)));
    Loop(nSteps, ({ i }: { i: any }) => {
        const t = bounds.x.add(float(i).mul(delta));
        const p = vOrigin.add(rayDir.mul(t)).toVar("p");
        compositeAt(comp, p, maskUV => maskUV);
    });
}

const traversals: Record<VolumeTraversal, Traversal> = { dda: ddaTraverse, raymarch: marchTraverse };

export const createVolumeMaterial = (type: VolumeTraversal, mode: VolumeMode = 'additive', isOrtho = false) => {
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    material.depthWrite = false;
    const { vOrigin, vDirection } = rayVaryings(material, isOrtho);
    material.colorNode = volumeShader(traversals[type], mode)(vOrigin, vDirection);
    return material
}
