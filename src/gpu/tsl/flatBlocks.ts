import {
    bool, float, Fn, positionGeometry, positionLocal,
    select,
    varying, vec2, vec3, vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';
import { instanceColor, instanceUV, sampleBlockStrength } from './utils/blockHelpers';

const getUVs = Fn(([thisUV, isValid] : [any, any]) =>{
    const instanceUV = thisUV.toVar();
    const maskUV = instanceUV.toVar();
    const valid = h.reprojector(instanceUV, maskUV).toVar();
    isValid.assign(valid)
    return vec4(instanceUV, maskUV)
})

export function createFlatBlocksMaterial(count: number){

    // --- VERTEX --- //
    const resolution = u.displacementResolution
    const width = resolution.x;
    const height = resolution.y;
    const thisUV = instanceUV()
    const position = Fn(() => {
        const aspect = height.toFloat().div(width)
        const posX = thisUV.x.sub(0.5).mul(2);
        const posY = thisUV.y.sub(0.5).mul(2).mul(aspect)
        return vec2(posX, posY)
    })()

    const material = new THREE.NodeMaterial();
    const isValid = bool(true).toVar();

    const uvInfo = varying(getUVs(thisUV, isValid))
    const newV = uvInfo.xy.toVar();
    const maskUV = uvInfo.zw.toVar();
    const {localCoord, textureIdx} = h.getLocalCoord(newV)
    const {strength, isNan, colorIn} = sampleBlockStrength(localCoord, textureIdx);
    const heightFactor = strength.sub(u.displaceZero).mul(u.displacement);
    const scaledPosition = vec3(
        positionLocal.x, positionLocal.y, positionLocal.z.mul(heightFactor)
    )
    const newPos = scaledPosition.add(vec3(position, 0));
    const clipped = strength.greaterThan(u.threshold.y)
            .or(strength.lessThan(u.threshold.x))
            .or(isValid.not())
            .or(isNan)
    const masked = h.maskOut(maskUV)
    material.positionNode = select(clipped.or(masked), vec3(0), newPos);
    const aspect = width.toFloat().div(height);
    const gridExtent = vec2(2, float(2).div(aspect));
    const vertUV = varying(thisUV.add(positionGeometry.xy.div(gridExtent))).toVar();
    // fragment stage
     const vertMask = h.reprojectUV(vertUV)
    const borderHit = h.isBorder(vertMask.rg);
    material.colorNode = select(borderHit, u.borderColor, instanceColor(colorIn));
    return material
}
