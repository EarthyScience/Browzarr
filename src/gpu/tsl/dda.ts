import {
    abs, any, bool, Break, clamp, EPSILON, float, floor, Fn, greaterThanEqual, If, int,
    ivec3, lessThan, Loop, max, normalize, select, sign, vec2, vec3
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';
import { colorTexel, finishRay, rayAccumulators, rayBounds, rayVaryings, sampleVoxel, shouldSkip } from './utils/volumeHelpers';

const ddaColor = Fn(([vOrigin, vDirection] : [any, any]) =>{
    const rayDir = normalize( vDirection ).toVar("rayDir");
    const bounds = rayBounds( vOrigin, rayDir );

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
    const acc = rayAccumulators();

    // //Steps
    Loop( maxSteps, () => {
        If( t.greaterThan( bounds.y ), () => {Break();});
        // Sample at the center of the current voxel.
        const pCenter = boxMin.add( vec3( voxel ).add( 0.5 ).mul( voxelSize ) );
        const texCoord = vec3(0).toVar("texCoord");
        const maskUV = vec2(0).toVar("maskUV");
        const skip = shouldSkip(pCenter, texCoord, maskUV) as any;

        If(skip.not(), () => {
            const d = float(0.0).toVar();
            const biVal = float(0.0).toVar();
            const isNan = bool(false).toVar();
            const inRange = sampleVoxel(texCoord, d, biVal, isNan);
            If(inRange, () => {
                colorTexel(d, biVal, isNan, acc.accumColor, acc.alphaAcc)
                If(acc.alphaAcc.greaterThanEqual(0.99), () => {
                    If(u.useBorderTexture, () => {
                        const pHit = vOrigin.add(t.mul(rayDir)).toVar();
                        const localPosContinuous = pHit.xy.sub(boxMin).div(u.volumeScale).toVar();
                        const borderUV = h.reprojectMask(localPosContinuous.xy)
                        acc.borderHit.assign(h.isBorder(borderUV))
                    });
                    Break();
                });
            });
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
    return finishRay(acc);
})

export const createDDAMaterial = (isOrtho=false) => {
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    const { vOrigin, vDirection } = rayVaryings(material, isOrtho);
    material.colorNode = ddaColor(vOrigin, vDirection);
    return material
}
