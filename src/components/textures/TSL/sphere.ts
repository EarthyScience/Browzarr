import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as THREE from 'three/webgpu'
import { displacement, displaceZero } from './utils/displacementUniforms';
import { Fn, normalize, asin, atan, PI, mul, mod, vec2, vec4, If, vec3, float, bool,
    fract, select, min, clamp, ivec3, all, cos, positionGeometry, greaterThanEqual, lessThanEqual, 
    int} from 'three/tsl';

const giveUV = Fn(( [position] : [any]) => {
    const n = normalize( position );
	const latitude = asin( n.y ).toVar();
	const longitude = atan( n.z, n.x ).negate().toVar();
	latitude.assign( latitude.sub( u.latBounds.x ).div( u.latBounds.y.sub( u.latBounds.x ) ) );
	const span = u.lonBounds.y.sub( u.lonBounds.x );
	longitude.assign( mod( longitude.sub( u.lonBounds.x ), mul( 2.0, PI ) ) );
	longitude.assign( longitude.div( span ) );
	return vec2( longitude, latitude );
})

const giveMaskUV = Fn( ( [ position ] : [any] ) => {
	const n = normalize( position );
	const latitude = asin( n.y );
	const longitude = atan( n.z, n.x ).negate();
	latitude.divAssign( PI );
	longitude.divAssign( mul( 2., PI ) );
	const u = longitude.add( 0.5 );
	const v = latitude.add( 0.5 );
	return vec2( u, v );
});

const maskAndBorder = Fn( () => {
    const result = vec4( 0, 0, 0, - 1 ).toVar( 'maskResult' );
    If( u.maskValue.notEqual( 0 ).or( u.useBorderTexture ), () => {
        const maskUV = giveMaskUV( positionGeometry );
        If( u.is360, () => {
            maskUV.x.assign( fract( maskUV.x ) );
        });
        If( u.maskValue.notEqual( 0 ), () => {
            //@ts-ignore level does exist on this node
            const mask = u.maskTexture.sample( maskUV ).level(0).r;
            const cond = select( u.maskValue.equal( 1 ), mask.lessThan( 0.5 ), mask.greaterThanEqual( 0.5 ) );
            If( cond, () => {
                result.assign( vec4( u.nanColor, 1. ) );
                result.a.assign( u.nanAlpha );
            });
        })
        If(u.useBorderTexture, () => {
            //@ts-ignore level does exist on this node
            const borderDist = u.borderTexture.sample( maskUV ).level(0).r;
            const latFac = cos( maskUV.y );
            If( borderDist.lessThanEqual( u.borderWidth.mul( latFac ) ), () => {
                result.assign( vec4( u.borderColor, 1.0 ) );
            });
        });
    } );
    return result;
});

const sphereColor = Fn( () => {
    const Color = vec4( 1,0,0,1 ).toVar( 'Color' );
    const aPosition = positionGeometry.toVar('aPosition');
    const sampleCoord = giveUV(aPosition).toVar('sampleCoord');
    const inBounds = all( greaterThanEqual( sampleCoord, vec2( 0.0 ) ) )
        .and( all( lessThanEqual( sampleCoord, vec2( 1.0 ) ) ) );
    If( inBounds, () => {
        const zStepSize = int( u.textureDepths.y ).mul( int( u.textureDepths.x ) );
        const yStepSize = int( u.textureDepths.x );
        const texCoord = vec3( sampleCoord, u.animateProg );
        const idx = clamp( ivec3( texCoord.mul( u.textureDepths ) ), ivec3( 0 ), ivec3( u.textureDepths ).sub( 1 ) );
        const textureIdx = idx.z.mul( zStepSize ).add( idx.y.mul( yStepSize ) ).add( idx.x );
        const localCoord = fract( texCoord.mul( u.textureDepths ) ).toVar( 'localCoord' );
        // Scale up
        localCoord.assign( fract( localCoord ) );
        const strength = float( 0 ).toVar( 'strength' );
        const biVal = float( 0 ).toVar( 'biVal' );
        const biNaN = bool( false ).toVar( 'biNaN' );
        If( u.bivariate, () => {
            const bivar = h.sample2ToOrder( localCoord, textureIdx, u.bivariateSelection );
            strength.assign( bivar.r );
            biVal.assign( bivar.g );
            biNaN.assign( h.isNaNBits( strength ).or( h.isNaNBits( biVal ) ) );
        } ).Else( () => {
            strength.assign( h.sample1( localCoord, textureIdx ) );
        } );
        const isNan = h.isNaNBits( strength ).or( biNaN ).or( u.useF16.not().and( strength.equal( 1. ) ) );
        If( isNan, () => {
            Color.assign( vec4( u.nanColor, u.nanAlpha ) );
        } ).Else( () => {
            If( u.bivariate, () => {
                const flipOrder = u.bivariateSelection.notEqual( 0 );
                Color.assign( vec4( select( flipOrder, h.colorMixer( biVal, strength ), h.colorMixer( strength, biVal ) ), 1. ) );
            } ).Else( () => {
                strength.mulAssign( u.cScale );
                strength.assign( min( strength.add( u.cOffset ), 0.995 ) );
                Color.assign( vec4( u.cmap.sample( vec2( strength, 0.5 ) ).rgb, 1. ) );
            } );
        } );
        const valid = strength.greaterThanEqual( u.threshold.x ).and( strength.lessThanEqual( u.threshold.y ) );
        If( valid.not(), () => {
            Color.assign( vec4( 0. ) );
        });
    }).Else(() => {Color.assign( vec4( u.nanColor, u.nanAlpha ) )});
    return Color
})

const sphereVertex = Fn(() =>{
    const sampleCoord = giveUV( positionGeometry ).toVar("sampleCoord");
    const inBounds = all( greaterThanEqual( sampleCoord, vec2( 0.0 ) ) ).and( all( lessThanEqual( sampleCoord, vec2( 1.0 ) ) ) );
    const newPosition = positionGeometry.toVar('newPosition');
    If( inBounds, () => {
        const normal = normalize( positionGeometry );
        const zStepSize = int( u.textureDepths.y ).mul( int( u.textureDepths.x ) );
        const yStepSize = int( u.textureDepths.x );
        const texCoord = vec3( sampleCoord, u.animateProg );
        const idx = clamp( ivec3( texCoord.mul( u.textureDepths ) ), ivec3( 0 ), ivec3( u.textureDepths ).sub( 1 ) );
        const textureIdx = idx.z.mul( zStepSize ).add( idx.y.mul( yStepSize ) ).add( idx.x );
        const localCoord = fract( texCoord.mul( u.textureDepths ) ).toVar( 'localCoord' );
        // Scale up
        localCoord.assign( fract( localCoord ) );
        const dispStrength = float( 0 ).toVar( 'dispStrength' );
        If( u.bivariate, () => {
            dispStrength.assign( h.sample2ToOrder( localCoord, textureIdx, u.bivariateSelection ).r );
        } ).Else( () => {
            dispStrength.assign( h.sample1( localCoord, textureIdx ) );
        } );
        const isnan = h.isNaNBits( dispStrength ).or( u.useF16.not().and( dispStrength.equal( 1. ) ) );
        If( isnan.not(), () => {
            newPosition.addAssign( normal.mul( dispStrength.sub( displaceZero ) ).mul( displacement ) );
        } )
    })
    return newPosition;
})

export function createSphereMaterial(){
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    material.positionNode = sphereVertex();
    material.colorNode = Fn( () => {
        const Color = vec4( 0 ).toVar( 'FinalColor' );
        const maskNBorders = maskAndBorder().toVar( 'early' );
        If( maskNBorders.a.greaterThanEqual( 0 ), () => {
            Color.assign( maskNBorders );              
        } ).Else( () => {
            Color.assign( sphereColor() );  
        } );
        return Color;
    } )();
    // material.colorNode = sphereColor();
    return material
}