import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as THREE from 'three/webgpu'
import { displacement, displaceZero } from './utils/displacementUniforms';
import { Fn, instanceIndex, normalize, asin, atan, PI, mul, mod, vec2, vec4, If, vec3, float, bool,
    fract, select, min, abs, clamp, all, cos, positionGeometry, positionLocal, greaterThanEqual, lessThanEqual, 
    int, sin, cross, mat3,
    instancedArray,
    uniform,
    varying,
    positionWorld} from 'three/tsl';

// --- UNIFORMS ---//
export const resolution = uniform(vec2(0.0))
export const widthFactor = uniform(1), vertFactor = uniform(1);

const giveMaskUV = Fn( ( [ position ] : [any] ) => {
	const n = normalize( position );
	const latitude = asin( n.y );
	const longitude = atan( n.z, n.x ).negate();
	latitude.divAssign( PI );
	longitude.divAssign( mul( 2., PI ) );
	const u = longitude.add( 0.5 );
	const v = latitude.add( 0.5 );
	return vec2( u, v );
});

const giveLonLat = Fn(([inUV] : [any])=>{
    const longitude = inUV.x.mul( u.lonBounds.y.sub( u.lonBounds.x ) ).add( u.lonBounds.x );
	const latitude = inUV.y.mul( u.latBounds.y.sub( u.latBounds.x ) ).add( u.latBounds.x );
	longitude.assign( longitude.negate() );
	return vec2( longitude, latitude );
})

const givePosition = Fn(([lonlat] : [any])=>{ 
    const longitude = lonlat.x;
	const latitude = lonlat.y;
	// Convert to Cartesian coordinates
	const cosLat =  cos( latitude ).toVar();
	const x = cosLat.mul( cos( longitude ) );
	const y = sin( latitude );
	const z = cosLat.mul( sin( longitude ) );
	return vec4( x, y, z, cosLat );
})

const getSpherePosition= Fn(([instanceUV] : [any]) =>{
    const lonlat = giveLonLat(instanceUV);
    const sp = givePosition(lonlat);
    return sp
})

const getOrientation = Fn(([spherePosition] : [any])=>{
    const normal = normalize(spherePosition);
    const tangent = normalize(cross(vec3(0, 1, 0), normal));
    const bitangent = cross(normal, tangent);
    const orientation = mat3(tangent, normal, bitangent);
    return orientation
})
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

const isBorder = Fn(()=>{
    const isBorder = bool(false).toVar();
    If(u.useBorderTexture, ()=>{
        const thisUV = giveMaskUV(positionWorld).toVar();
        thisUV.x.assign(select(u.is360, fract(thisUV.x.add(0.5)), thisUV.x))
        //@ts-ignore .level does exist
        const distance =  u.borderTexture.sample(thisUV).level(0).r;
        If(distance.lessThanEqual(u.borderWidth), () => {
            isBorder.assign(bool(true)); 
        });
    })
    return isBorder;
})

export function createSphereBlocksMaterial(count : number){
    const instanceUVs = instancedArray(count, 'vec2');
    const positions = instancedArray(count, 'vec4');

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
        const vertPosition = getSpherePosition(thisUV);
        p.assign(vertPosition);
    })().compute(count)
    
    const material = new THREE.NodeMaterial();
    material.depthWrite = true;
    material.depthTest = true;
    const instanceUV = instanceUVs.element(instanceIndex);
    const {localCoord, textureIdx} = h.getLocalCoord(instanceUV)
    let strength, biVal, isNan;
    if (u.bivariate.value){
        const bivar = h.sample2ToOrder(localCoord, textureIdx, u.bivariateSelection).toVar();
        strength = bivar.r;
        biVal = bivar.g;
        isNan = h.isNaNBits(strength).or(h.isNaNBits(biVal))
            .or(u.useF16.not().and(strength))
            .or(u.useF16.not().and(biVal.equal(1.0)))
    } else {
        strength = h.sample1(localCoord, textureIdx)
        isNan = h.isNaNBits(strength).or(u.useF16.not().and(strength.equal(1.0)))
        strength = clamp(strength.mul(u.cScale).add(u.cOffset), 0.0, 0.995)
        biVal = float(0)
    }
    const vStrength = varying(strength, 'vStrength'); 
    const vBiVal = varying(biVal, 'biVal');
    const spherePosition = positions.element(instanceIndex);
    const heightFactor = vStrength.sub(displaceZero).mul(displacement);

    const scaledPosition = vec3(
        positionLocal.x.mul(spherePosition.w).mul(widthFactor),
        positionLocal.y.mul(heightFactor),
        positionLocal.z.mul(vertFactor),
    ).toVar();
    const orientation = getOrientation(spherePosition.xyz);
    const newPos = spherePosition.xyz.add(orientation.mul(scaledPosition));
    const clipped = vStrength.greaterThan(u.threshold.y)
            .or(vStrength.lessThan(u.threshold.x))
    const masked = h.maskOut(instanceUV)
    const borderHit = isBorder()
    material.positionNode = select(clipped.or(masked), vec3(0), newPos);
    material.colorNode = select(borderHit, vec4(u.borderColor, 1), instanceColor(vec2(vStrength, vBiVal)));
    return {material, calcPositions};
}