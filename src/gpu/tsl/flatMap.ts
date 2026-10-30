import { abs, Discard, Fn, If, select, struct, uv, vec4 } from 'three/tsl';
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

const maskAndBorder = (thisUV: any) =>{
    const masked = h.maskOut(thisUV);
    const isBorder = h.isBorder(thisUV);
    const maskColor = select(masked, vec4(u.nanColor, u.nanAlpha), vec4(-1),);
    const borderColor = select(isBorder, vec4(u.borderColor, 1), vec4(-1));

    return maskColor.max(borderColor);
}

const faceColor = Fn( ([thisUV] : [any]) => {
    const {localCoord, textureIdx} = h.getLocalCoord(thisUV)
    const { color, strength } = h.sampleSurfaceColor(localCoord, textureIdx);
    If( abs( strength.sub( u.fillValue ) ).lessThan( 0.005 ), () => {
        color.assign( vec4( 0. ) );
    } );
    return color;
} );

export function createFlatMapMaterial(){
    const material = new THREE.NodeMaterial();
    material.transparent = true;
    material.side = THREE.DoubleSide;
    material.colorNode = Fn( () => {
        const texCoord = uv().toVar( 'texCoord' );
        const uvInfo = getUVs(texCoord)
        const maskUV = uvInfo.get('maskUV')
        const isValid = uvInfo.get('valid')
        const newV = uvInfo.get('remap')
        If(isValid.not(), () =>{ Discard(); })
        const maskNBorders = maskAndBorder(maskUV).toVar( 'early' );
        return h.overlayOr(maskNBorders, () => faceColor(newV));
    } )();
    return material
}

