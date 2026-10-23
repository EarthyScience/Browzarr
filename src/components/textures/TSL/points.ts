import {
    bool,float,Fn,fract,If,instancedArray,instanceIndex,int,ivec3,min,mod,select,texture,uint,
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

export function createPointMaterial(bivariate: boolean){
    const depth = uint( u.pointShape.x );
    const height = uint( u.pointShape.y );
    const width = uint( u.pointShape.z ).toVar();
    const aspect = height.toFloat().div(width)
    const timeAspect = depth.toFloat().div(width)
    const offset = userData('offset', 'int')
    const globalIndex = instanceIndex.add(offset)
    const iX = globalIndex.mod(width).toFloat()
    const iY = globalIndex.div(width).mod(height)
    const iZ = globalIndex.div(height.mul(width))
    const globalCoord = ivec3(iX, iY, iZ); // PixelIndex
    const texCoord = Fn(() => {
        const normX = globalCoord.x.toFloat().div(width.sub(1)).toVar()
        const normY = globalCoord.y.toFloat().div(height.sub(1)).toVar()
        const normZ = globalCoord.z.toFloat().div(depth.sub(1)).toVar()
        return vec3(normX, normY, fract(normZ.sub(u.animateProg)));
    })()
    const positon = Fn(()=>{
        const px = texCoord.x.sub(0.5).mul(2)
        const py = texCoord.y.sub(0.5).mul(2).mul(aspect)
        const pz = texCoord.z.sub(0.5).mul(2).mul(timeAspect)
        const scale = width.toFloat().mul(GLOBAL_SCALE)
        return vec3(px, py, pz).mul(scale);
    })()

    const rawValue = h.load2ToOrder(globalCoord, uint(0))
    const isNaN = bool(false).toVar();
    const spriteValue = varying(h.rescaler(rawValue.r))
    const spriteCoord = texCoord
    const pointColor = Fn(()=>{
        const color = vec3(0);
        If(bool(false), ()=>{
            const c1 = rawValue.r;
            const c2 = rawValue.g
            color.assign(select(u.bivariateSelection, 
                h.colorMixer(c1, c2),
                h.colorMixer(c2, c1)
            ))
            // isNaN.assign(
            //     h.isNaNBits(c1).or(u.useF16.not().and(c1.equal(1.0)))
            //     .or(h.isNaNBits(c2).or(u.useF16.not().and(c2.equal(1.0))))
            // )
        }).Else(()=>{
            const remapped = spriteValue.mul( u.cScale ).toVar();
            remapped.assign( min( remapped.add( u.cOffset ), 0.995 ) );
            color.assign(u.cmap.sample(vec2(remapped,0.5)).rgb)
            isNaN.assign(h.isNaNBits(rawValue.r).or(u.useF16.not().and(rawValue.r.equal(1.0))))

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
    material.colorNode = vec4(u.cmap.sample(vec2(rawValue.g,0.5)).rgb, 1);
    return material
}