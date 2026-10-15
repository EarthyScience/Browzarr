import {
    bool,float,Fn,If,instancedArray,instanceIndex,texture,uint,
    uniform,varying,vec2,vec3,vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';

const GLOBAL_SCALE = 1/100 

export function createPointMaterial(count: number){
    const values = instancedArray(Math.ceil(count / 4), 'uint');
   
    const depth = uint( u.pointShape.x );
    const height = uint( u.pointShape.y );
    const width = uint( u.pointShape.z ).toVar();
    const aspect = height.toFloat().div(width)
    const timeAspect = depth.toFloat().div(width)

    const texCoord = Fn(() => {
        const normX = instanceIndex.mod(width).toFloat().div(width).toVar()
        const normY = instanceIndex.div(width).mod(height).toFloat().div(height).toVar()
        const normZ = instanceIndex.div(height.mul(width)).toFloat().div(depth).toVar()
        return vec3(normX, normY, normZ);
    })()
    const positon = Fn(()=>{
        const px = texCoord.x.sub(0.5).mul(2)
        const py = texCoord.y.sub(0.5).mul(2).mul(aspect)
        const pz = texCoord.z.sub(0.5).mul(2).mul(timeAspect)
        const scale = width.toFloat().mul(GLOBAL_SCALE)
        return vec3(px, py, pz).mul(scale);
    })()

    function updateValues(array: Uint8Array) {
        const attr = values.value;

        const bytes = new Uint8Array(Math.ceil(array.length / 4) * 4);
        bytes.set(array);

        attr.array.set(new Uint32Array(bytes.buffer));
        attr.needsUpdate = true;
    }
    const getByte = Fn(([index]: [any]) => {
        const i = uint(index);
        const word = values.element(i.shiftRight(2));   // i / 4
        const shift = i.bitAnd(3).mul(8);               // (i % 4) * 8
        return word.shiftRight(shift).bitAnd(0xFF);     // uint 0..255
    });
    const rawValue = float(getByte(instanceIndex)).div(255)
    const spriteValue = varying(h.rescaler(rawValue))
    const spriteCoord = varying(texCoord)
    
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
    material.positionNode = positon.mul(vec3(1,1,u.timeScale))
    material.scaleNode = pointScaler()
    material.colorNode = vec4(u.cmap.sample(vec2(spriteValue,0.5)).rgb, 1);
    return {material, updateValues}
}