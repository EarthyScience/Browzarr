import {
    asin, atan, bool, clamp, cos, cross, float, Fn,
    If,
    instanceIndex,
    mat3, mix, mul, normalize, PI, positionLocal,
    positionWorld, select, sin, texture,
    varying,
    vec2, vec3, vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import * as h from './utils/commonHelpers';
import * as u from './utils/uniforms';

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
        const biCol = h.colorMixer( strengths.x, strengths.y ).toVar();
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
        //@ts-ignore .level does exist
        const distance =  u.borderTexture.sample(thisUV).level(0).r;
        If(distance.lessThanEqual(u.borderWidth), () => {
            isBorder.assign(bool(true)); 
        });
    })
    return isBorder;
})

export function createSphereBlocksMaterial(){
    const resolution = u.displacementResolution;

    const thisUV = Fn(()=>{
        const w = resolution.x;
        const hi = resolution.y;
        const px = instanceIndex.mod(w);
        const py = instanceIndex.div(w).mod(hi);
        const thisUV = vec2(
            px.toFloat().add(0.5), 
            py.toFloat().add(0.5)
        ).div(resolution)
        return thisUV
    })()
    
    const material = new THREE.NodeMaterial();
    material.depthWrite = true;
    material.depthTest = true;
    material.side = THREE.DoubleSide;

    // --- VERTEX --- //
    const position = getSpherePosition(thisUV);
    const tempUV = thisUV;
    const newV = select(u.remapBorders, texture(u.remapTexture, h.realCoords(thisUV.xy)), tempUV);
    const instanceUV = newV.toVar();
    const {localCoord, textureIdx} = h.getLocalCoord(instanceUV.xy)
    let strength, biVal, isNan;
    let colorIn; // what the fragment stage receives: vec2(first, second), unswapped for bivariate
    if (u.bivariate.value){
        const raw = h.sample2(localCoord, textureIdx);
        isNan = h.isNaNBits(raw.r).or(h.isNaNBits(raw.g))
            .or(u.useF16.not().and(raw.r.equal(1.0)))
            .or(u.useF16.not().and(raw.g.equal(1.0)));
        strength = mix(raw.r, raw.g, u.bivariateSelection) // For some reason select and Ifs don't work as expected on vertex/varying. Mix works though
        biVal    = mix(raw.g, raw.r, u.bivariateSelection)
        colorIn = varying(raw, 'vBivar');
    } else {
        strength = h.sample1(localCoord, textureIdx).toVar();
        strength = h.rescaler(strength);
        isNan = h.isNaNBits(strength).or(u.useF16.not().and(strength.equal(1.0)));
        strength = clamp(strength.mul(u.cScale).add(u.cOffset), 0.0, 0.995);
        biVal = float(0);
        colorIn = vec2(varying(strength, 'vStrength'), float(0));
    }
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

    const masked = h.maskOut(giveMaskUV(position.xyz))
    material.positionNode = select(clipped.or(masked), vec3(0), newPos);

    // --- Frag --- //
    const borderHit = isBorder()
    material.colorNode = select(borderHit, vec4(u.borderColor, 1), instanceColor(colorIn));
    return material;
}