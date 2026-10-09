import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as THREE from 'three/webgpu'
import { displacement, displaceZero } from './utils/displacementUniforms';
import { Fn, instanceIndex, normalize, asin, atan, PI, mul, mod, vec2, vec4, If, vec3, float, bool,
    fract, select, min, abs, ivec3, all, cos, positionGeometry, positionLocal, greaterThanEqual, lessThanEqual, 
    int, sin, cross, mat3,
    instancedArray,
    uniform,
    varying} from 'three/tsl';

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
const instanceColor = Fn(([strength] : [any])=>{
    const color = u.cmap.sample(vec2(strength, 0.5));
    return vec4(color.rgb, 1)
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

    const instanceUV = instanceUVs.element(instanceIndex);
    const strength = h.sample1(h.getLocalCoord(instanceUV), 0).toVar();
    const vStrength = varying(strength, 'vStrength'); 

    const spherePosition = positions.element(instanceIndex);
    const heightFactor = vStrength.sub(displaceZero).mul(displacement);

    const scaledPosition = vec3(
        positionLocal.x.mul(spherePosition.w).mul(widthFactor),
        positionLocal.y.mul(heightFactor),
        positionLocal.z.mul(vertFactor),
    );

    const orientation = getOrientation(spherePosition.xyz);
    const newPos = spherePosition.xyz.add(orientation.mul(scaledPosition));
    const clipped = vStrength.greaterThan(u.threshold.y)
            .or(vStrength.lessThan(u.threshold.x))
    material.positionNode = select(clipped, vec3(0), newPos);
    material.colorNode = instanceColor(vStrength);
    return {material, calcPositions};
}