import {
    bool,float,Fn,If,instancedArray,instanceIndex,uint,
    uniform,varying,vec2,vec3,vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';

const GLOBAL_SCALE = 1/2000 

export function createPointMaterial({
    count,
} : { count: number, usePoints?: boolean}){
    const positions = instancedArray(count, 'vec3')
    const texCoords = instancedArray(count, 'vec3')
    const values = instancedArray(count, 'uint')

    const calcPositions = Fn(() => {
        const p = positions.element(instanceIndex)
        const t = texCoords.element(instanceIndex)
        const depth = uint( u.pointShape.x );
        const height = uint( u.pointShape.y );
        const width = uint( u.pointShape.z ).toVar();
        const scale = width.toFloat().mul(GLOBAL_SCALE);
        const px = instanceIndex.mod(width).toFloat()
        const py = instanceIndex.div(width).mod(height).toFloat() 
        const pz = instanceIndex.div(height.mul(width)).toFloat() 
        const offset = vec3(width,0,depth).mul(scale.div(2)).negate()
        p.assign(vec3(
            px, py, pz
        ).mul(scale).add(offset))
        t.assign(vec3(px, py,pz)
            .div(vec3(width,height,depth))
            .sub(0.5)
            .mul(2)
        )
    })().compute(count)

    function updateValues(array: Uint8Array){
        const attr = values.value;          
        attr.array.set(array);         
        attr.needsUpdate = true; 
    }
    const rawValue = values.element(instanceIndex).toFloat().div(255)
    const spriteValue = varying(h.rescaler(rawValue))
    const spriteCoord = varying(texCoords.element(instanceIndex))
    
    const pointScaler = Fn(()=>{
        const pointScale = u.pointSize.toVar()
        const p = spriteCoord
        const multiplier = float(0.01);
        pointScale.mulAssign(multiplier)
        If(u.scaleByVal, ()=>{
            const strength = spriteValue.pow(u.scaleIntensity);
            pointScale.mulAssign(strength)
        })
        const isNan = h.isNaNBits(spriteValue).or(u.useF16.not().and(spriteValue.equal(1.0)))
        const outOfBounds = p.x.greaterThan(u.flatBounds.x.negate())
                .or(p.x.lessThan(u.flatBounds.y.negate()))
                .or(p.z.negate().greaterThan(u.flatBounds.z.negate()))
                .or(p.z.negate().lessThan(u.flatBounds.w.negate()))
                .or(p.y.lessThan(u.vertBounds.x))
                .or(p.y.greaterThan(u.vertBounds.y))
                .or(isNan);
        If(outOfBounds, ()=>{
            pointScale.assign(0)
        })
        return vec2(pointScale)
    })
    const material = new THREE.SpriteNodeMaterial()
    material.positionNode = positions.element(instanceIndex).mul(vec3(1,1,u.timeScale))
    material.scaleNode = pointScaler()
    material.colorNode = vec4(u.cmap.sample(vec2(spriteValue,0.5)).rgb, 1);
    return {material, calcPositions, updateValues}
}