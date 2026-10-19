import {
    bool,float,Fn,If,instancedArray,instanceIndex,int,texture,uint,
    uniform,varying,vec2,vec3,vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';

const GLOBAL_SCALE = 1/500 

// const pointColor = Fn(([c1, c2] : [any any])=>{
//     const color = vec4(0);
//     If( u.bivariate, () => {

//         const bivar = h.sample2ToOrder( localCoord, textureIdx, u.bivariateSelection );
//         strength.assign( bivar.r );
//         biVal.assign( bivar.g );
//         biNaN.assign( h.isNaNBits( strength ).or( h.isNaNBits( biVal ) ) );
//     } ).Else( () => {
//         strength.assign( h.sample1( localCoord, textureIdx ) );
//         strength.assign(h.rescaler(strength))
//     } );
// })


export function createPointMaterial(count: number, bivariate: boolean){
    const thisCount = bivariate ? count*2: count;
    const values = instancedArray(Math.ceil(thisCount / 4), 'uint');
   
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
        // This is an AI function. I don't understand it. 
        const i = uint(index);
        const word = values.element(i.shiftRight(2));   // i / 4
        const shift = i.bitAnd(3).mul(8);               // (i % 4) * 8
        return word.shiftRight(shift).bitAnd(0xFF);     // uint 0..255
    });

    const thisIndex = instanceIndex.mul(int(Number(bivariate) + 1)).toVar()
    const sizeIndex = bivariate ? thisIndex.add(int(u.bivariateSelection)) : thisIndex // The index used for scaling the points
    const rawValue = float(getByte(sizeIndex)).div(255)
    const isNaN = bool(false).toVar();

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
            color.assign(u.cmap.sample(vec2(spriteValue,0.5)).rgb)
             isNaN.assign(h.isNaNBits(rawValue).or(u.useF16.not().and(rawValue.equal(1.0))))
        })
        return color;
    })()
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
        const outOfBounds = p.x.greaterThan(u.flatBounds.x.negate())
                .or(p.x.lessThan(u.flatBounds.y.negate()))
                .or(p.z.negate().greaterThan(u.flatBounds.z.negate()))
                .or(p.z.negate().lessThan(u.flatBounds.w.negate()))
                .or(p.y.lessThan(u.vertBounds.x))
                .or(p.y.greaterThan(u.vertBounds.y))
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
    return {material, updateValues}
}