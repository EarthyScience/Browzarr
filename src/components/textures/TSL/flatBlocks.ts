import {
    Fn,
    instancedArray,
    instanceIndex,
    positionLocal,
    varying, vec3,
    vec2, vec4,
    select
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/commonUniforms';
import { displacement, displaceZero, resolution } from './utils/displacementUniforms';


const instanceColor = Fn(([strength] : [any])=>{
    const color = u.cmap.sample(vec2(strength, 0.5));
    return vec4(color.rgb, 1)
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
    const strength = h.sample1(h.getLocalCoord(instanceUV), 0).toVar();
    const vStrength = varying(strength, 'vStrength'); // explicit vertex -> fragment

    const heightFactor = vStrength.sub(displaceZero).mul(displacement);
    const scaledPosition = vec3(
        positionLocal.x, positionLocal.y, positionLocal.z.mul(heightFactor)
    )
    const newPos = scaledPosition.add(vec3(positions.element(instanceIndex), 0));
    const clipped = vStrength.greaterThan(u.threshold.y)
            .or(vStrength.lessThan(u.threshold.x))
    material.positionNode = select(clipped, vec3(0), newPos);
    material.colorNode = instanceColor(vStrength);
    // material.colorNode = vec4(u.valueRange.x, 0,0,1)
    return {material, calcPositions}
}