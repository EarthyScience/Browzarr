import {
    bool, cos, cross, Fn, If,
    mat3, normalize, positionLocal,
    positionWorld, select, sin, texture,
    vec2, vec3, vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';
import { instanceColor, instanceUV, sampleBlockStrength } from './utils/blockHelpers';

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

export function createSphereBlocksMaterial(){
    const thisUV = instanceUV()

    const material = new THREE.NodeMaterial();
    material.depthWrite = true;
    material.depthTest = true;
    material.side = THREE.DoubleSide;

    // --- VERTEX --- //
    const position = getSpherePosition(thisUV);
    const newV = select(u.remapBorders, texture(u.remapTexture, h.realCoords(thisUV.xy)), thisUV);
    const instanceUVVar = newV.toVar();
    const {localCoord, textureIdx} = h.getLocalCoord(instanceUVVar.xy)
    const {strength, isNan, colorIn} = sampleBlockStrength(localCoord, textureIdx);
    const heightFactor = strength.sub(u.displaceZero).mul(u.displacement);
    const scaledPosition = vec3(
        positionLocal.x.mul(position.w).mul(u.widthFactor),
        positionLocal.y.mul(heightFactor),
        positionLocal.z.mul(u.vertFactor),
    ).toVar();
    const orientation = getOrientation(position.xyz);
    const newPos = position.xyz.add(orientation.mul(scaledPosition));
    const clipped = strength.greaterThan(u.threshold.y)
            .or(strength.lessThan(u.threshold.x))
            .or(isNan)

    const masked = h.maskOut(h.giveMaskUV(position.xyz))
    material.positionNode = select(clipped.or(masked), vec3(0), newPos);

    // --- Frag --- //
    // Only build the mask UV when borders are on
    const borderHit = Fn(() => {
        const hit = bool(false).toVar();
        If(u.useBorderTexture, () => { hit.assign(h.isBorder(h.giveMaskUV(positionWorld))); });
        return hit;
    })();
    material.colorNode = select(borderHit, vec4(u.borderColor, 1), instanceColor(colorIn));
    return material;
}
