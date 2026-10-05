import { Fn, min, max, clamp, abs, round, mix, select, 
    texture, floatBitsToUint, uint, fract, float, vec2, vec3,
    vec4, If } from 'three/tsl';
import { valueRange, resolution, bottomLeft, bottomRight, topLeft, 
    mixMode, lonBounds, latBounds, is360, remapBorders } from './commonUniforms';

const IS_FLAT = true; // or false based on your setup

// Create an array of 12 texture uniform nodes
const maps = Array.from({ length: 12 }, (_, i) => {
  const tex = myThreeTexturesArray[i]; // Your THREE.Texture or THREE.Data3DTexture
  
  return IS_FLAT 
    ? texture(tex)     // Creates 2D sampler uniform node
    : texture3D(tex);  // Creates 3D sampler uniform node
});

// --- TEXTURE SAMPLERS ---//
const sampleMap = Fn(([p, index]: [any, any]) => {
    const result = vec4(0).toVar();
    maps.forEach((map, i) => {
      If(index.equal(i), () => {
        result.assign(texture(map, p));
      });
    });
    return result;
  });

export const sample1 = Fn(([p, index]: [any, any]) => sampleMap(p, index).r);
export const sample2 = Fn(([p, index]: [any, any]) => sampleMap(p, index).rg);

export const sample2ToOrder = Fn(([p, index, variable]: [any, any, any]) => {
const biVar = sample2(p, index);
return select(variable.equal(0), biVar, biVar.gr);
});

// --- GEOHELPER --- //
export const realCoords = Fn(([uv]: [any]) => {
  // Radians -> fraction of a full turn. Longitudes in -180..180 need shifting by 0.5.
  const lonRange = lonBounds.div(2 * Math.PI);
  const normalizedLon = select(is360, lonRange, lonRange.add(0.5));
 
  // Latitude: -PI/2..PI/2 -> 0..1
  const normalizedLat = latBounds.div(Math.PI).add(0.5);
 
  const lonScale = normalizedLon.y.sub(normalizedLon.x);
  const latScale = normalizedLat.y.sub(normalizedLat.x);
 
  const u = uv.x.mul(lonScale).add(normalizedLon.x);
  const v = uv.y.mul(latScale).add(normalizedLat.x);
 
  return vec2(u, v);
});


// --- BIVARIATE COLORS --- //
export const lerpColors = Fn(([A, B, fac]: [any, any, any]) => {
  const steps = resolution.sub(1);
  const snapped = round(fac.mul(steps)).div(steps);
  return mix(A, B, snapped);
});

export const darkenColors = (A: any, B: any) => min(A, B);
export const lightenColors = (A: any, B: any) => max(A, B);
export const multiplyColors = (A: any, B: any) => clamp(A.mul(B), 0, 1);
export const differenceColors = (A: any, B: any) => abs(A.sub(B));

export const colorMixer = Fn(([A, B]: [any, any]) => {
  const bottomColor = lerpColors(bottomLeft, bottomRight, A);
  const leftColor = lerpColors(bottomLeft, topLeft, B);
 
  // Pick the blend mode (falls back to darken)
  return select(
    mixMode.equal(1), lightenColors(bottomColor, leftColor),
    select(
      mixMode.equal(2), multiplyColors(bottomColor, leftColor),
      select(
        mixMode.equal(3), differenceColors(bottomColor, leftColor),
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
export const denorm = (x: any) => x.mul(valueRange.y.sub(valueRange.x)).add(valueRange.x);
export const norm = (x: any) => x.sub(valueRange.x).div(valueRange.y.sub(valueRange.x));
export const rescaler = (x: any) => x;

export function reprojector(texCoord: any, opts: Pick<BivariateOptions, 'remapTexture' | 'isFlat' | 'reproject'>) {
  const { remapTexture, isFlat, reproject } = opts;
 
  let newTexCoord = texCoord;
  let maskUV: any;
  let valid: any;
 
  if (reproject) {
    // Each output pixel looks up where it comes from in the source data
    const remap = texture(remapTexture, texCoord.xy).rgb;
 
    newTexCoord = isFlat ? remap.rg : vec3(remap.rg, texCoord.z);
    maskUV = realCoords(remap.rg);
    valid = remap.b.greaterThan(0.5);
  } else {
    // Reprojected data is already -180..180, so no adjusting needed.
    const originalCoord = texCoord.xy;
    maskUV = realCoords(originalCoord);
 
    // Regularly gridded data: the remap texture's .ba channels hold the mask coords.
    // (Original note: not certain the y-flip is robust.)
    const flipped = vec2(originalCoord.x, float(1).sub(originalCoord.y));
    const remappedMask = texture(remapTexture, flipped).ba;
    maskUV = select(remapBorders, remappedMask, maskUV);
 
    valid = float(1).greaterThan(0.5); // always true
  }
 
  // For 0–360 data, wrap longitude by half a turn
  const wrappedU = fract(maskUV.x.add(0.5));
  maskUV = vec2(select(is360, wrappedU, maskUV.x), maskUV.y);
 
  return { texCoord: newTexCoord, maskUV, valid };
}

// --- NANNERS ---//
export const isNaNBits = Fn(([x]: [any]) => {
  const bits = floatBitsToUint(x);
  const exponent = bits.bitAnd(uint(0x7f800000));
  const mantissa = bits.bitAnd(uint(0x007fffff));
  return exponent.equal(uint(0x7f800000)).and(mantissa.notEqual(uint(0)));
});