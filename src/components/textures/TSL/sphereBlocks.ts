import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as THREE from 'three/webgpu'
import { displacement, displaceZero } from './utils/displacementUniforms';
import { Fn, instanceIndex, normalize, asin, atan, PI, mul, mod, vec2, vec4, If, vec3, float, bool,
    fract, select, min, clamp, ivec3, all, cos, positionGeometry, greaterThanEqual, lessThanEqual, 
    int, sin, 
    instancedArray,
    uniform} from 'three/tsl';

    
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

const maskAndBorder = Fn( () => {
    const result = vec4( 0, 0, 0, - 1 ).toVar( 'maskResult' );
    If( u.maskValue.notEqual( 0 ).or( u.useBorderTexture ), () => {
        const maskUV = giveMaskUV( positionGeometry );
        If( u.is360, () => {
            maskUV.x.assign( fract( maskUV.x ) );
        });
        If( u.maskValue.notEqual( 0 ), () => {
            //@ts-ignore level does exist on this node
            const mask = u.maskTexture.sample( maskUV ).level(0).r;
            const cond = select( u.maskValue.equal( 1 ), mask.lessThan( 0.5 ), mask.greaterThanEqual( 0.5 ) );
            If( cond, () => {
                result.assign( vec4( u.nanColor, 1. ) );
                result.a.assign( u.nanAlpha );
            });
        })
        If(u.useBorderTexture, () => {
            //@ts-ignore level does exist on this node
            const borderDist = u.borderTexture.sample( maskUV ).level(0).r;
            const latFac = cos( maskUV.y );
            If( borderDist.lessThanEqual( u.borderWidth.mul( latFac ) ), () => {
                result.assign( vec4( u.borderColor, 1.0 ) );
            });
        });
    } );
    return result;
});

export const resolution = uniform(vec2(0.0))

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
	const cosLat =  cos( latitude );
	const x = cosLat.mul( cos( longitude ) );
	const y = sin( latitude );
	const z = cosLat.mul( sin( longitude ) );
	return vec3( x, y, z );
})

const sampleColor = Fn(([instanceUV] : [any]) => {

})

export function createSphereBlocksMaterial(count : number){
    const instanceUVs = instancedArray(count, 'vec2');
    const positions = instancedArray(count, 'vec3');
    const calcPositions = Fn(() => {
        const p = positions.element(instanceIndex);
        const u = instanceUVs.element(instanceIndex);
        const w = resolution.x.toUint();
        const h = resolution.y.toUint();
        const px = instanceIndex.mod(w);
        const py = instanceIndex.div(w).mod(h);
        const thisUV = vec2(px.toFloat(), py.toFloat()).div(resolution).toVar();
        u.assign(thisUV);
        p.assign(givePosition(giveLonLat(thisUV)));
    })().compute(count)
    const material = new THREE.NodeMaterial();
    material.positionNode = positionGeometry.add(positions.element(instanceIndex))
    
    return {material, calcPositions, positions, instanceUVs};
}