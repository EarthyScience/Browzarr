import {
    Fn,If,
    instancedArray,
    instanceIndex,
    positionLocal,
    varying, vec3,
    vec2, vec4, clamp,
    select, float, bool,
    positionGeometry,
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/commonUniforms';
import { displacement, displaceZero, resolution } from './utils/displacementUniforms';

const instanceColor = Fn(([strengths] : [any])=>{
   if (u.bivariate.value){
        const flipOrder = u.bivariateSelection.notEqual( 0 );
        const biCol = select( flipOrder, h.colorMixer( strengths.y, strengths.x ), h.colorMixer( strengths.x, strengths.y ) ).toVar();
        return vec4(biCol.rgb, 1)
    } else{
        const color = u.cmap.sample(vec2(strengths.x, 0.5))
        return vec4(color.rgb, 1)
    }
})

const isBorder = Fn(([instanceUV] : [any])=>{
    const isBorder = bool(false).toVar();
    If(u.useBorderTexture, ()=>{
        const thisUV = instanceUV.add(positionGeometry.xy.div(2));
        thisUV.assign(h.realCoords(thisUV))
        //@ts-ignore .level does exist
        const distance =  u.borderTexture.sample(thisUV).level(0).r;
        If(distance.lessThanEqual(u.borderWidth), () => {
            isBorder.assign(bool(true)); 
        });
    })
    return isBorder;
})

export function createFlatBlocksMaterial(count: number){
    const instanceUVs = instancedArray(count, 'vec2');
    const positions = instancedArray(count, 'vec2');
    const calcPositions = Fn(() => {
        const p = positions.element(instanceIndex);
        const u = instanceUVs.element(instanceIndex);
        const w = resolution.x.toUint();
        const h = resolution.y.toUint();
        const px = instanceIndex.mod(w);
        const py = instanceIndex.div(w).mod(h);
        const thisUV = vec2(
            px.toFloat().add(0.5), 
            py.toFloat().add(0.5)
            ).div(resolution).toVar();
        u.assign(thisUV);
        const aspect = h.toFloat().div(w)
        const posX = thisUV.x.sub(0.5).mul(2);
        const posY = thisUV.y.sub(0.5).mul(2).mul(aspect)
        p.assign(vec2(posX, posY));
    })().compute(count)
    const material = new THREE.NodeMaterial();
    const instanceUV = instanceUVs.element(instanceIndex);
    const {localCoord, textureIdx} = h.getLocalCoord(instanceUV)
    let strength, biVal, isNan;
    if (u.bivariate.value){
        const bivar = h.sample2ToOrder(localCoord, textureIdx, u.bivariateSelection).toVar();
        strength = bivar.r;
        biVal = bivar.g;
        isNan = h.isNaNBits(strength).or(h.isNaNBits(biVal))
            .or(u.useF16.not().and(strength).equal(1.0))
            .or(u.useF16.not().and(biVal.equal(1.0)))
    } else {
        strength = h.sample1(localCoord, textureIdx)
        isNan = h.isNaNBits(strength).or(u.useF16.not().and(strength.equal(1.0)))
        strength = clamp(strength.mul(u.cScale).add(u.cOffset), 0.0, 0.995)
        biVal = float(0)
    }
    const vStrength = varying(strength, 'vStrength'); // explicit vertex -> fragment
    const vBiVal = varying(biVal, 'biVal');
    const heightFactor = vStrength.sub(displaceZero).mul(displacement);
    const scaledPosition = vec3(
        positionLocal.x, positionLocal.y, positionLocal.z.mul(heightFactor)
    )
    const newPos = scaledPosition.add(vec3(positions.element(instanceIndex), 0));
    const clipped = vStrength.greaterThan(u.threshold.y)
            .or(vStrength.lessThan(u.threshold.x))
    const masked = h.maskOut(instanceUV)
    const borderHit = isBorder(instanceUV)
    material.positionNode = select(clipped.or(masked), vec3(0), newPos);
    material.colorNode = select(borderHit, u.borderColor, instanceColor(vec2(vStrength, vBiVal)));
    return {material, calcPositions}
}