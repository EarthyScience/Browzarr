import { Fn, vec4, vec3, abs, any, greaterThan, If, lessThan, normalize, pow, EPSILON, Discard, int, ceil, Loop,
	min, max, vec2, select, cameraPosition, positionLocal, varying, float, bool,sub,
	Break, modelWorldMatrixInverse, modelWorldMatrix, Continue, floor,sign, mix, greaterThanEqual,
	texture, mod, clamp, ivec3, fract } from 'three/tsl';
import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as vu from './utils/volumeUniforms'
import * as THREE from 'three/webgpu'
import {shouldSkip, sampleVoxel, hitBox} from './utils/volumeHelpers'

const ddaColor = Fn(() =>{
    const vOrigin = varying(modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz);
    const vDirection = varying(positionLocal.sub(vOrigin));
    const rayDir = normalize( vDirection ).toVar("rayDir");
    const bounds = hitBox( vOrigin, rayDir ).toVar("bounds");
    If(bounds.x.greaterThan(bounds.y), () => { Discard(); });
    bounds.x.assign(max(bounds.x, 0.0));

    const gridRes = vu.dataShape;
    const boxMin = vu.scale.mul( 0.5 ).negate();
    const voxelSize = vu.scale.div( gridRes );

    // Initial voxel from the ray's entry point into the box.
    const p0 = vOrigin.add( bounds.x.mul( rayDir ) );
    const localPos = clamp( p0.sub( boxMin ).div( vu.scale ), vec3( 0.0 ), vec3( 1.0 ).sub( vec3( EPSILON ) ) ).mul( gridRes );
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
    const accumColor = vec3( 0.0 ).toVar('accumColor');
    const alphaAcc = float( 0.0 ).toVar('alphaAcc');
    const borderHit = bool(false).toVar("borderHit");

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
                isNan.assign(isNan.or(abs(d.sub(u.fillValue)).lessThan(0.005)));
 
                If(isNan, () => {
                    If(u.nanAlpha.greaterThan(0.0), () => {
                        const nanA = pow(u.nanAlpha, 5.0);
                        accumColor.addAssign(float(1.0).sub(alphaAcc).mul(nanA).mul(u.nanColor));
                        alphaAcc.addAssign(nanA);
                    });
                }).Else(() => {
                    const s = vu.tfLUT.sample(vec2(d, 0.5));
                    const opacity = float(1).sub(alphaAcc);
                    accumColor.addAssign(opacity.mul(s.rgb));
                    alphaAcc.addAssign(opacity.mul(s.a));
                });

                If(alphaAcc.greaterThanEqual(1.0), () => {
                    // If(u.useBorderTexture, () => {
                    //     const pHit = vOrigin.add(t.mul(rayDir));
                    //     const localPosContinuous = pHit.sub(boxMin).div(vu.scale);
                    //     // ASSUMPTION: same vec3(uv.x, uv.y, valid) convention as above
                    //     const rep = h.reprojector(localPosContinuous).toVar();
                    //     const borderDist = u.borderTexture.sample(rep.xy).r;
                    //     If(borderDist.lessThanEqual(u.borderWidth).and(rep.z.greaterThan(0.5)), () => {
                    //         borderHit.assign(bool(true)); // replaces the early `return` in GLSL
                    //     });
                    // });
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
    If( alphaAcc.lessThanEqual( 0.0 ), () => Discard());
    return select(borderHit, vec4(u.borderColor, 1.0), vec4(accumColor, alphaAcc));
})

export const createDDAMaterial = () => {
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    material.side = THREE.BackSide;
    material.colorNode = ddaColor();

    return material
}