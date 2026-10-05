import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as THREE from 'three/webgpu'
import { Fn, uv, If, fract, sub, min, abs, select, vec4, int, vec3, clamp, vec2, ivec3, EPSILON, property } from 'three/tsl';
export function createFlatMapMaterial(){
    const material = new THREE.NodeMaterial();
    material.colorNode = Fn( () => {
        const Color = property( 'vec4' );
        // If( u.maskValue.notEqual( 0 ).or( u.useBorderTexture ), () => {
        //     const Color = vec4(0).toVar('Color');
        //     // Get Coordinates
        //     const realUV = h.realCoords( uv() ).toVar('realUV');
        //     If( u.is360, () => {
        //         realUV.x.assign( fract( realUV.x.add( 0.5 ) ) );
        //     } );
        //     If( u.remapBorders, () => {
        //         // All reprojected data is regularly gridded
        //         const remapUV = uv().toVar('remapUV');
        //         remapUV.y.assign( sub( 1.0, remapUV.y ) );
        //         // I'm not certain if this is robust
        //         realUV.xy.assign( u.remapTexture.sample( remapUV ).ba );
        //     } );
        //     If(u.maskValue.notEqual( 0 ), () => {
        //         const mask = u.maskTexture.sample( realUV ).r;
        //         const cond = select( u.maskValue.equal( 1 ), mask.lessThan( 0.5 ), mask.greaterThanEqual( 0.5 ) );
        //         If( cond, () => {
        //             Color.assign( vec4( u.nanColor, 1. ) );
        //             Color.a.assign( u.nanAlpha );
        //             return Color;
        //         } );
        //     }).Else( () => {
        //         const borderDist = u.borderTexture.sample( realUV ).r;
        //         If( borderDist.lessThanEqual( u.borderWidth ), () => {
        //             Color.assign( vec4( u.borderColor, 1.0 ) );
        //             return Color;
        //         });
        //     });
        // });
        const zStepSize = int( u.textureDepths.y ).mul( int( u.textureDepths.x ) );
        const yStepSize = int( u.textureDepths.x );
        const texCoord = vec3( uv(), u.animateProg ).toVar('texCoord');
        texCoord.xy.assign( clamp( texCoord.xy, vec2( 0.0 ), sub( 1., vec2( EPSILON ) ) ) );
        // This prevent the very edges from looping around and causing line artifacts
        const idx = clamp( ivec3( texCoord.mul( u.textureDepths ) ), ivec3( 0 ), ivec3( u.textureDepths ).sub( 1 ) );
        const textureIdx = idx.z.mul( zStepSize ).add( idx.y.mul( yStepSize ) ).add( idx.x );
        const localCoord = texCoord.mul( u.textureDepths ).toVar('localCoord');
        // // Scale up
        localCoord.assign( fract( localCoord ) );
        const strength = property( 'float' ).toVar('strength');
        const biVal = property( 'float' ).toVar('biVal');
        const biNaN = property( 'bool' ).toVar('biNaN'); 
        // If( u.bivariate, () => {
        //     const bivar = h.sample2ToOrder( localCoord, textureIdx, u.bivariateSelection );
        //     strength.assign( bivar.r );
        //     biVal.assign( bivar.g );
        //     biNaN.assign( h.isNaNBits( strength ).or( h.isNaNBits( biVal ) ) );
        // } ).Else( () => {
        //     // strength.assign( h.sample1( localCoord, textureIdx ) );
        //     // h.rescaler( strength );
        // } );
        strength.assign( h.sample1( localCoord, textureIdx ) );
        // const isNan = h.isNaNBits( strength ).or( biNaN ).or( u.useF16.not().and( strength.equal( 1. ) ) );

        // If( isNan, () => {
        //     Color.assign( vec4( u.nanColor, u.nanAlpha ) );
        //     return Color;

        // } ).Else( () => {
        //     If( u.bivariate, () => {
        //         const flipOrder = u.bivariateSelection.notEqual( 0 );
        //         Color.assign( vec4( select( flipOrder, h.colorMixer( biVal, strength ), h.colorMixer( strength, biVal ) ), 1. ) );

        //     } ).Else( () => {
        //         strength.mulAssign( u.cScale );
        //         strength.assign( min( strength.add( u.cOffset ), 0.995 ) );
        //         Color.assign( vec4( u.cmap.sample( vec2( strength, 0.5 ) ).rgb, 1. ) );
        //     } );

        // } );
        // const valid = strength.greaterThanEqual( u.threshold.x ).and( strength.lessThanEqual( u.threshold.y ) );
        // If( valid.not().or( abs( strength.sub( u.fillValue ) ).lessThan( 0.005 ) ), () => {
        //     Color.assign( vec4( 0. ) );
        //     return Color;
        // } );
        return vec4(1, 0, 0, 1);
    })()
    return material
}

