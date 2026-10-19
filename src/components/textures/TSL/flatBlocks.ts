import {
    bool,clamp,float,Fn, If,instancedArray,
    instanceIndex,mix,positionGeometry,positionLocal,
    select,struct,varying,vec2,vec3,vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';

const instanceColor = Fn(([strengths] : [any])=>{
   if (u.bivariate.value){
        const biCol = h.colorMixer( strengths.x, strengths.y ).toVar();
        return vec4(biCol.rgb, 1)
    } else{
        const color = u.cmap.sample(vec2(strengths.x, 0.5))
        return vec4(color.rgb, 1)
    }
})
const isBorder = Fn(([instanceUV] : [any])=>{
    const isBorder = bool(false).toVar();
    If(u.useBorderTexture, ()=>{
        const resolution = u.displacementResolution
        const aspect = resolution.x.toFloat().div(resolution.y)
        const gridExtent = vec2(2, float(2).div(aspect));
        const thisUV = instanceUV.add(positionGeometry.xy.div(gridExtent));
        thisUV.assign(h.reprojectMask(thisUV, bool(true)));
        If(u.remapBorders.and(u.flipY), ()=>{thisUV.y.assign(thisUV.y.oneMinus())})
        isBorder.assign(h.isBorder(thisUV.fract()));
    })
    return isBorder;
})
const getUVs = Fn(([thisUV, isValid] : [any, any]) =>{
    const instanceUV = thisUV.toVar();
    const maskUV = instanceUV.toVar();
    const valid = h.reprojector(instanceUV, maskUV).toVar();
    maskUV.y.assign(select(u.flipY,
        maskUV.y.oneMinus(),
        maskUV.y))
    isValid.assign(valid)
    return vec4(instanceUV, maskUV)
})

export function createFlatBlocksMaterial(count: number){
    const resolution = u.displacementResolution
    const width = resolution.x;
    const height = resolution.y;
    const thisUV = Fn(() => {
        const resolution = u.displacementResolution
        const px = instanceIndex.mod(width);
        const py = instanceIndex.div(width).mod(height);
        return vec2(
            px.toFloat().add(0.5), 
            py.toFloat().add(0.5)
            ).div(resolution)
    })()
    const position = Fn(() => {
        const aspect = height.toFloat().div(width)
        const posX = thisUV.x.sub(0.5).mul(2);
        const posY = thisUV.y.sub(0.5).mul(2).mul(aspect)
        return vec2(posX, posY)
    })()

    const material = new THREE.NodeMaterial();
    const isValid = bool(true).toVar();
    const uvInfo = getUVs(varying(thisUV), isValid)
    const newV = uvInfo.xy.toVar();
    const maskUV = uvInfo.zw.toVar();
    const {localCoord, textureIdx} = h.getLocalCoord(newV)
    
    let strength, biVal, isNan;
    let colorIn; // what the fragment stage receives: vec2(first, second), unswapped for bivariate
    if (u.bivariate.value){
        const raw = h.sample2(localCoord, textureIdx);
        isNan = h.isNaNBits(raw.r).or(h.isNaNBits(raw.g))
            .or(u.useF16.not().and(raw.r.equal(1.0)))
            .or(u.useF16.not().and(raw.g.equal(1.0)));
        strength = mix(raw.r, raw.g, u.bivariateSelection) // For some reason select and Ifs don't work as expected on vertex/varying. Mix works though
        biVal    = mix(raw.g, raw.r, u.bivariateSelection)
        colorIn = varying(raw, 'vBivar');
    } else {
        strength = h.sample1(localCoord, textureIdx).toVar();
        strength = h.rescaler(strength);
        isNan = h.isNaNBits(strength).or(u.useF16.not().and(strength.equal(1.0)));
        strength = clamp(strength.mul(u.cScale).add(u.cOffset), 0.0, 0.995);
        biVal = float(0);
        colorIn = vec2(varying(strength, 'vStrength'), float(0));
    }
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
    const borderHit = isBorder(maskUV)
    material.positionNode = select(clipped.or(masked), vec3(0), newPos);
    material.colorNode = select(borderHit, u.borderColor, instanceColor(colorIn));
    return material
}