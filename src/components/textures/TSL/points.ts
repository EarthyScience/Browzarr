import { Fn, vec4, vec3, abs, any, greaterThan, If, lessThan, normalize, pow, EPSILON, Discard, int, ceil, Loop,
	min, max, vec2, select, cameraPosition, positionLocal, varying, float, bool,sub,
	Break, modelWorldMatrixInverse, modelWorldMatrix, floor,sign, mix, greaterThanEqual,
	texture, mod, clamp, ivec3, fract, 
    cameraWorldMatrix,
    instancedArray,
    instanceIndex,
    hash,
    uniform,
    uint} from 'three/tsl';
import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as THREE from 'three/webgpu'

const GLOBAL_SCALE = 1/1000 

export const pointShape = uniform(vec3(0))
export const globalScale = uniform(float(0))
export const pointSize = uniform(float(0))
export const timeScale = uniform(float(0))
export const scaleByVal = uniform(bool(false))
export const scaleIntensity = uniform(float(0))

export function createPointMaterial({
    count,
    usePoints=false,
} : { count: number, usePoints?: boolean}){
    const positions = instancedArray(count, 'vec3')
    const values = instancedArray(count, 'uint')

    const calcPositions = Fn(() => {
        const p = positions.element(instanceIndex)
        const depth = uint( pointShape.x );
        const height = uint( pointShape.y );
        const width = uint( pointShape.z ).toVar();
        const scale = width.toFloat().mul(GLOBAL_SCALE);
        const px = instanceIndex.mod(width).toFloat()
        const py = instanceIndex.div(width).mod(height).toFloat() 
        const pz = instanceIndex.div(height.mul(width)).toFloat() 
        const offset = vec3(width,0,depth).mul(scale.div(2)).negate()
        p.assign(vec3(
            px, py, pz
        ).mul(scale).add(offset))
    })().compute(count)
    
    function updateValues(array: Uint8Array){
        const attr = values.value;          
        attr.array.set(array);         
        attr.needsUpdate = true; 
    }
    const spriteValue = varying(values.element(instanceIndex).toFloat().div(255))
    const pointScaler = Fn(()=>{
        const pointScale = pointSize.toVar()
        const multiplier = float(0.01);
        pointScale.mulAssign(multiplier)
        If(scaleByVal, ()=>{
            const strength = spriteValue.pow(scaleIntensity);
            pointScale.mulAssign(strength)
        })
        return vec2(pointScale)
    })
    const material = new THREE.SpriteNodeMaterial()
    material.positionNode = positions.element(instanceIndex).mul(vec3(1,1,timeScale))
    material.scaleNode = pointScaler()
    material.colorNode = vec4(u.cmap.sample(vec2(spriteValue,0.5)).rgb, 1);
    return {material, calcPositions, updateValues}
}