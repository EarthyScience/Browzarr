import {
    bool,float,Fn,fract,If,instancedArray,instanceIndex,int,min,mod,texture,uint,
    uniform,unpackHalf2x16,userData,varying,vec2,vec3,vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';

const GLOBAL_SCALE = 1/500 

export function createBuffer(count: number, useF16: boolean){
    const buffer = instancedArray(Math.ceil(count / (useF16 ? 2 : 4)), 'uint');
    function updateValues(array: Uint8Array | Uint16Array) {
        const attr = buffer.value;
        const { buffer: ab, byteOffset } = attr.array;
        const view = useF16
            ? new Uint16Array(ab, byteOffset, array.length)
            : new Uint8Array(ab, byteOffset, array.length)
        view.set(array)
        attr.needsUpdate = true
    }
    return {buffer, updateValues}
}

export function createPointMaterial(buffer: THREE.StorageBufferNode, bivariate: boolean, useF16: boolean){
    const values = buffer;
    const depth = uint( u.pointShape.x );
    const height = uint( u.pointShape.y );
    const width = uint( u.pointShape.z ).toVar();
    const aspect = height.toFloat().div(width)
    const timeAspect = depth.toFloat().div(width)
    const offset = userData('offset', 'int')
    const globalIndex = instanceIndex.add(offset)
    const texCoord = Fn(() => {
        const normX = globalIndex.mod(width).toFloat().div(width.sub(1)).toVar()
        const normY = globalIndex.div(width).mod(height).toFloat().div(height.sub(1)).toVar()
        const normZ = globalIndex.div(height.mul(width)).toFloat().div(depth.sub(1)).toVar()
        return vec3(normX, normY, fract(normZ.sub(u.animateProg)));
    })()
    const positon = Fn(()=>{
        const px = texCoord.x.sub(0.5).mul(2)
        const py = texCoord.y.sub(0.5).mul(2).mul(aspect)
        const pz = texCoord.z.sub(0.5).mul(2).mul(timeAspect)
        const scale = width.toFloat().mul(GLOBAL_SCALE)
        return vec3(px, py, pz).mul(scale);
    })()
    const getByte = useF16 
        ? Fn(([index]: [any]) => {
            // This is an AI function. I don't understand it fully. 
            const i = uint(index);
            const word = values.element(i.shiftRight(1));   // i / 2 (two uint16 per uint32 word)
            const shift = i.bitAnd(1).mul(16);              // (i % 2) * 16
            const halfFloat = word.shiftRight(shift).bitAnd(0xFFFF);
            return    unpackHalf2x16(halfFloat) 
        })
        : Fn(([index]: [any]) => {
            // This is an AI function. I don't understand it fully. 
            const i = uint(index);
            const word = values.element(i.shiftRight(2));   // i / 4
            const shift = i.bitAnd(3).mul(8);               // (i % 4) * 8
            return word.shiftRight(shift).bitAnd(0xFF);     // uint 0..255
        })

    const thisIndex = instanceIndex.mul(int(Number(bivariate) + 1)).toVar()
    const sizeIndex = bivariate ? thisIndex.add(int(u.bivariateSelection)) : thisIndex // The index used for scaling the points
    const normalizer = useF16 ? 1 : 255
    const rawValue = float(getByte(sizeIndex)).div(normalizer).toVar();
    const isNaN = bool(false).toVar();
    const spriteValue = varying(h.rescaler(rawValue))
    const spriteCoord = texCoord
    const pointColor = Fn(()=>{
        const color = vec3(0);
        If(u.bivariate, ()=>{
            const v1 = float(getByte(thisIndex)).div(255)
            const v2 = float(getByte(thisIndex.add(1))).div(255)
            color.assign(h.colorMixer(v1, v2))
            const v1Nan = h.isNaNBits(v1).or(u.useF16.not().and(v1.equal(1.0)))
            const v2Nan = h.isNaNBits(v2).or(u.useF16.not().and(v2.equal(1.0)))
            isNaN.assign(v1Nan.or(v2Nan))
        }).Else(()=>{
            const remapped = spriteValue.mul( u.cScale ).toVar();
            remapped.assign( min( remapped.add( u.cOffset ), 0.995 ) );
            color.assign(u.cmap.sample(vec2(remapped,0.5)).rgb)
            isNaN.assign(h.isNaNBits(rawValue).or(u.useF16.not().and(rawValue.equal(1.0))))

        })
        return color;
    })()
    
    const pointScaler = Fn(()=>{
        const pointScale = u.pointSize.toVar()
        const p = spriteCoord
        const multiplier = float(0.01);
        pointScale.mulAssign(multiplier)
        If(u.scaleByVal, ()=>{
            const strength = spriteValue.pow(u.scaleIntensity);
            pointScale.mulAssign(strength)
        })
        const outOfBounds = p.x.greaterThan(u.flatBounds.x.negate())
                .or(p.x.lessThan(u.flatBounds.y.negate()))
                .or(p.z.negate().greaterThan(u.flatBounds.z.negate()))
                .or(p.z.negate().lessThan(u.flatBounds.w.negate()))
                .or(p.y.lessThan(u.vertBounds.x))
                .or(p.y.greaterThan(u.vertBounds.y))
                .or(spriteValue.greaterThan(u.threshold.y))
                .or(spriteValue.lessThan(u.threshold.x))
                .or(isNaN);
        If(outOfBounds, ()=>{
            pointScale.assign(0)
        })
        return vec2(pointScale)
    })
    const material = new THREE.SpriteNodeMaterial()
    material.positionNode = positon.mul(vec3(1,1,u.timeScale))
    material.scaleNode = pointScaler()
    material.colorNode = vec4(pointColor, 1);
    return material
}