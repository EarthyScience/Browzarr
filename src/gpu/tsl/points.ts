import {
    float,Fn,fract,If,instanceIndex,int,ivec3,min,select,uint,
    userData,varying,vec2,vec3,vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';

const GLOBAL_SCALE = 1/500

export function createPointMaterial(bivariate: boolean){
    const depth = uint( u.pointShape.x );
    const height = uint( u.pointShape.y );
    const width = uint( u.pointShape.z ).toVar();
    const aspect = height.toFloat().div(width)
    const timeAspect = depth.toFloat().div(width)
    const offset = userData('offset', 'int')
    const globalIndex = instanceIndex.add(offset)
	const voxel = ivec3(
		int(globalIndex.mod(width)),
		int(globalIndex.div(width).mod(height)),
		int(globalIndex.div(height.mul(width)))
	).toVar()
	const texCoord = Fn(() => {
		const norm = vec3(voxel).div(vec3(width.sub(1), height.sub(1), depth.sub(1))).toVar()
		return vec3(norm.x, norm.y, fract(norm.z.sub(u.animateProg)));
	})()
    const positon = Fn(()=>{
        const px = texCoord.x.sub(0.5).mul(2)
        const py = texCoord.y.sub(0.5).mul(2).mul(aspect)
        const pz = texCoord.z.sub(0.5).mul(2).mul(timeAspect)
        const scale = width.toFloat().mul(GLOBAL_SCALE)
        return vec3(px, py, pz).mul(scale);
    })()
	const texel = Fn(() => {
		const depths = ivec3(u.textureDepths)
		const chunkSize = ivec3(u.pointShape.zyx).div(depths)
		const chunkIdx = min(voxel.div(chunkSize), depths.sub(1))
		const localCoord = voxel.sub(chunkIdx.mul(chunkSize))
		const textureIdx = chunkIdx.z.mul(depths.y.mul(depths.x)).add(chunkIdx.y.mul(depths.x)).add(chunkIdx.x)
		return h.loadMap(localCoord, textureIdx)
	})().toVar()

	const rawValue = (bivariate ? select(u.bivariateSelection.equal(0), texel.r, texel.g) : texel.r).toVar(); // The value used for scaling the points
	// Vertex stage only: instanceIndex doesn't exist in the fragment, so anything colorNode needs goes through a varying
	const nanCheck = (v: any) => h.isNaNBits(v).or(u.useF16.not().and(v.equal(1.0)))
	const isNaN = select(u.bivariate, nanCheck(texel.r).or(nanCheck(texel.g)), nanCheck(rawValue)).toVar();
	const biValues = varying(texel.rg)
    const spriteValue = varying(h.rescaler(rawValue))
    const spriteCoord = texCoord
    const pointColor = Fn(()=>{
        const color = vec3(0);
        If(u.bivariate, ()=>{
			color.assign(h.colorMixer(biValues.x, biValues.y))
        }).Else(()=>{
            const remapped = spriteValue.mul( u.cScale ).toVar();
            remapped.assign( min( remapped.add( u.cOffset ), 0.995 ) );
            color.assign(u.cmap.sample(vec2(remapped,0.5)).rgb)
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