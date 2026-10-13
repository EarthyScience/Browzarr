import { abs, bool, Discard, float, Fn, If, min, mix, select, struct, uv, vec2, vec4 } from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';

const twoVs = struct({
  remap: 'vec2',
  maskUV: 'vec2',
  valid: 'bool'
});
const getUVs = Fn(([thisUV] : [any]) =>{
    const newV = thisUV.toVar("instanceUV");
    const maskUV = newV.toVar('maskUV');
    const valid = h.reprojector(newV, maskUV);
    return twoVs(newV, maskUV, valid)
})

const maskAndBorder = Fn(([thisUV] : [any]) =>{
    const outColor = vec4(-1).toVar();
    outColor.assign(mix(vec4(u.nanColor, u.nanAlpha), vec4(-1), float(h.maskOut(thisUV))));
    outColor.assign(mix(vec4(-1), vec4(u.borderColor, 1), float(h.isBorder(thisUV))));
    return outColor;
})

const faceColor = Fn( ([thisUV] : [any]) => {
    const Color = vec4( 0 ).toVar( 'Color' );
    const {localCoord, textureIdx} = h.getLocalCoord(thisUV)
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
        strength.assign(h.rescaler(strength))
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
    If( valid.not().or( abs( strength.sub( u.fillValue ) ).lessThan( 0.005 ) ), () => {
        Color.assign( vec4( 0. ) );
    } );
    return Color;
} );

export function createFlatMapMaterial(){
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    material.side = THREE.DoubleSide;
    material.colorNode = Fn( () => {
        const Color = vec4( 0 ).toVar( 'FinalColor' );
        const texCoord = uv().toVar( 'texCoord' );
        const uvInfo = getUVs(texCoord)
        const maskUV = uvInfo.get('maskUV')
        const isValid = uvInfo.get('valid')
        const newV = uvInfo.get('remap')
        If(isValid.not(), () =>{ Discard(); })
        const maskNBorders = maskAndBorder(maskUV).toVar( 'early' );
        If( maskNBorders.a.greaterThanEqual( 0 ), () => {
            Color.assign( maskNBorders );              
        } ).Else( () => {
            Color.assign( faceColor(newV) );  
        } );
        return Color;
    } )();
    return material
}

