import { Fn, min, max, clamp, abs, round, mix, select, bool,
    texture, floatBitsToUint, uint, fract, float, vec2, vec3,
    vec4, If, texture3D, ivec2, ivec3,
    Break} from 'three/tsl';
import * as u from './commonUniforms';


// --- TEXTURE SAMPLERS ---//
const sampleMap = Fn(([p, index]: [any, any]) => {
    const result = vec4(0).toVar();
    u.map.forEach( ( tex, i ) => {
        If( index.equal( i ), () => {
            result.assign( tex.sample( p ) );
        } );
    } );
    return result;
  });
export const sample1 = Fn(([p, index]: [any, any]) => sampleMap(p, index).r);
export const sample2 = Fn(([p, index]: [any, any]) => sampleMap(p, index).rg);

export const sample2ToOrder = Fn(([p, index, variable]: [any, any, any]) => {
  const biVar = sample2(p, index);
  return select(variable.equal(0), biVar, biVar.gr);
});

export const getLocalCoord = (thisUV : any) =>{
	const zStepSize = uint(u.textureDepths.y).mul(uint(u.textureDepths.x));
	const yStepSize = uint(u.textureDepths.x);
	const sampleCoord = thisUV.toVar("sampleCoord");
	let textureIdx, localCoord;
	if (u.isFlat.value) {
		const idx = clamp(ivec2(sampleCoord.mul(u.textureDepths.xy)), ivec2(0), ivec2(u.textureDepths.xy).sub(1));
		textureIdx = idx.y.mul(yStepSize).add(idx.x);
		localCoord = fract(sampleCoord.mul(u.textureDepths.xy));
	} else {
		const texCoord = vec3(sampleCoord, u.animateProg);
		const idx = clamp(ivec3(texCoord.mul(u.textureDepths)), ivec3(0), ivec3(u.textureDepths).sub(1));
		textureIdx = idx.z.mul(zStepSize).add(idx.y.mul(yStepSize)).add(idx.x);
		localCoord = fract(texCoord.mul(u.textureDepths));
	}
	return localCoord
}


// --- GEOHELPER --- //
export const realCoords = Fn(([uv]: [any]) => {
  // Radians -> fraction of a full turn. Longitudes in -180..180 need shifting by 0.5.
  const lonRange = u.lonBounds.div(2 * Math.PI);
  const normalizedLon = select(u.is360, lonRange, lonRange.add(0.5));
 
  // Latitude: -PI/2..PI/2 -> 0..1
  const normalizedLat = u.latBounds.div(Math.PI).add(0.5);
 
  const lonScale = normalizedLon.y.sub(normalizedLon.x);
  const latScale = normalizedLat.y.sub(normalizedLat.x);
 
  const thisU = uv.x.mul(lonScale).add(normalizedLon.x);
  const thisV = uv.y.mul(latScale).add(normalizedLat.x);
 
  return vec2(thisU, thisV);
});


// --- BIVARIATE COLORS --- //
export const lerpColors = Fn(([A, B, fac]: [any, any, any]) => {
  const steps = u.resolution.sub(1);
  const snapped = round(fac.mul(steps)).div(steps);
  return mix(A, B, snapped);
});

export const darkenColors = (A: any, B: any) => min(A, B);
export const lightenColors = (A: any, B: any) => max(A, B);
export const multiplyColors = (A: any, B: any) => clamp(A.mul(B), 0, 1);
export const differenceColors = (A: any, B: any) => abs(A.sub(B));

export const colorMixer = Fn(([A, B]: [any, any]) => {
  const bottomColor = lerpColors(u.bottomLeft, u.bottomRight, A);
  const leftColor = lerpColors(u.bottomLeft, u.topLeft, B);
 
  // Pick the blend mode (falls back to darken)
  return select(
    u.mixMode.equal(1), lightenColors(bottomColor, leftColor),
    select(
      u.mixMode.equal(2), multiplyColors(bottomColor, leftColor),
      select(
        u.mixMode.equal(3), differenceColors(bottomColor, leftColor),
        darkenColors(bottomColor, leftColor),
      ),
    ),
  );
});

export function createBivariateColor() {
  return Fn(([p, index]: [any, any]) => {
    const biValues = sample2(p, index);
    const hasNaN = isNaNBits(biValues.r).or(isNaNBits(biValues.g));
 
    const color = select(hasNaN, vec3(0, 0, 0), colorMixer(biValues.r, biValues.g));
    return vec4(color, select(hasNaN, float(1), float(0)));
  });
}

// --- VALUE SCALING --- //
export const denorm = (x: any) => x.mul(u.valueRange.y.sub(u.valueRange.x)).add(u.valueRange.x);
export const norm = (x: any) => x.sub(u.valueRange.x).div(u.valueRange.y.sub(u.valueRange.x));
export const rescaler = (x: any) => x;


// --- REPROJECTOR --- //
export function reprojector(texCoord: any, maskUV: any) {
  const valid = bool(true).toVar()
  if (u.reproject.value) {
    // Each output pixel looks up where it comes from in the source data
    const remap = texture(u.remapTexture, texCoord.xy).rgb.toVar();
    texCoord.assign(vec3(remap.rg, texCoord.z));
    maskUV = realCoords(remap.rg);
    valid.assign(remap.b.greaterThan(0.5))
  } else {
    // Reprojected data is already -180..180, so no adjusting needed.
    const originalCoord = texCoord.xy;
    const tempV = realCoords(originalCoord).toVar();
    // Regularly gridded data: the remap texture's .ba channels hold the mask coords.
    // (Original note: not certain the y-flip is robust.)
    const flipped = vec2(originalCoord.x, float(1).sub(originalCoord.y));
    const remappedMask = texture(u.remapTexture, flipped).ba;
    maskUV.assign(select(u.remapBorders, remappedMask, tempV));
  }
  // For 0–360 data, wrap longitude by half a turn
  // if (is360) maskUV.x.assign(fract(maskUV.x.add(0.5)));
  return valid
}

// --- NANNERS ---//
export const isNaNBits = Fn(([x]: [any]) => {
  const bits = floatBitsToUint(x);
  const exponent = bits.bitAnd(uint(0x7f800000));
  const mantissa = bits.bitAnd(uint(0x007fffff));
  return exponent.equal(uint(0x7f800000)).and(mantissa.notEqual(uint(0)));
});