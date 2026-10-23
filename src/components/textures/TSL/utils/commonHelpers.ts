import {
  abs,
  bool,
  clamp,
  float,
  floatBitsToUint,
  Fn,
  fract,
  glslFn,
  If,
  ivec2, ivec3,
  max,
  min,
  mix,
  round,
  select,
  texture,
  uint,
  vec2, vec3,
  vec4,
  wgslFn
} from 'three/tsl';
import * as u from './uniforms';
import { usePlotStore } from '@/GlobalStates/PlotStore';


// --- TEXTURE SAMPLERS ---//
const sampleMap = Fn(([p, index]: [any, any]) => {
    const pv = p.toVar(); // This needs to be a variable for some reason 
    const result = vec4(0).toVar();
    u.map.forEach( ( tex, i ) => {
        If( index.equal( i ), () => {
            result.assign( tex.sample( pv ) );
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
	const sampleCoord = thisUV.toVar();
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
	return {localCoord, textureIdx}
}

export const getLocalCoord3D = (sampleCoord : any) =>{
	const zStepSize = uint(u.textureDepths.y).mul(uint(u.textureDepths.x));
	const yStepSize = uint(u.textureDepths.x);
  const texCoord = vec3(sampleCoord);
  const idx = clamp(ivec3(texCoord.mul(u.textureDepths)), ivec3(0), ivec3(u.textureDepths).sub(1));
  const textureIdx = idx.z.mul(zStepSize).add(idx.y.mul(yStepSize)).add(idx.x);
  const localCoord = fract(texCoord.mul(u.textureDepths));
	return {localCoord, textureIdx}
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

export const createBivariateColor = Fn(([p, index]: [any, any]) =>  {
    const biValues = sample2(p, index);
    const hasNaN = isNaNBits(biValues.r).or(isNaNBits(biValues.g));
 
    const color = select(hasNaN, vec3(0, 0, 0), colorMixer(biValues.r, biValues.g));
    return vec4(color, select(hasNaN, float(1), float(0)));
});


// --- VALUE SCALING --- //
export const denorm = (x: any) => x.mul(u.valueRange.y.sub(u.valueRange.x)).add(u.valueRange.x);
export const norm = (x: any) => x.sub(u.valueRange.x).div(u.valueRange.y.sub(u.valueRange.x));


const makeColorScale = (expr: string) => {
  if ( u.isWebGPU.value ) return wgslFn(`
    fn applyColorScale( x: f32 ) -> f32 {
      return ${expr};
    }
  `)
  return glslFn(`
    float rescaler(float x){
    return ${expr};
    }
  `)
};

export const rescaler = Fn(([x]: [any]) => {
  const result = x.toVar();
  If(u.rescaleValues, () => {
    const applyColorScale = makeColorScale(usePlotStore.getState().colorScale?? "x");
    result.assign(norm(applyColorScale({ x: denorm(x) })));
  });
  return result;
});

export const reprojector = Fn(([texCoord, maskUV] : [any, any]) => {
  const valid = bool(true).toVar()
  If(u.reproject, () => {
    // Each output pixel looks up where it comes from in the source data
    const remap = texture(u.remapTexture, texCoord.xy).rgb.toVar();
    texCoord.assign(vec3(remap.rg, texCoord.z));
    maskUV.assign(realCoords(remap.rg));
    valid.assign(remap.b.greaterThan(0.5))
  }).Else(()=>{
    maskUV.assign(realCoords(texCoord.xy));
  })
  If(u.remapBorders,()=> {
      const tempV = texCoord.xy.toVar();
      tempV.y.assign(select(u.flipY, tempV.y.oneMinus(), tempV.y));
      maskUV.assign(u.remapBorderTexture.sample(tempV).ba);
  }).Else(()=>{
    maskUV.x.assign(select(u.is360,
    fract(maskUV.x.add(0.5)),
    maskUV.x))
  })
  return valid
})

export const reprojectMask = Fn(([texCoord, dda=bool(false)] : [any, any]) => {
  const maskUV = texCoord.toVar();
  const remap = texCoord.toVar();
  If(u.reproject, () => {
    // Each output pixel looks up where it comes from in the source data
    remap.assign(texture(u.remapTexture, texCoord.xy).rgb.toVar());
    maskUV.assign(realCoords(select(dda, remap, texCoord.xy)));
  }).Else(()=>{
    maskUV.assign(realCoords(texCoord.xy));
  })
  If(u.remapBorders,()=> {
      const tempV = select(dda, remap, texCoord.xy).toVar();
      tempV.y.assign(select(u.flipY, tempV.y.oneMinus(), tempV.y));
      maskUV.assign(u.remapBorderTexture.sample(tempV).ba)
  })
  // For 0–360 data, wrap longitude by half a turn
  maskUV.x.assign(select(u.is360,
    fract(maskUV.x.add(0.5)),
    maskUV.x
  ));
  return maskUV
})

export const reprojectUV = Fn(([thisUV] : [any]) => {
  const remap = thisUV.toVar();
  If(u.reproject, () => {
    // Each output pixel looks up where it comes from in the source data
    const newCoords = texture(u.remapTexture, thisUV.xy).rgb;
    remap.assign(realCoords(newCoords.xy));
  }).Else(()=>{
    remap.assign(realCoords(thisUV.xy));
  })
  If(u.remapBorders,()=> {
      remap.y.assign(select(u.flipY, remap.y.oneMinus(), remap.y));
      remap.assign(u.remapBorderTexture.sample(remap).ba)
  })
  // For 0–360 data, wrap longitude by half a turn
  remap.x.assign(select(u.is360,
    fract(remap.x.add(0.5)),
    remap.x
  ));
  return remap
})

export const isBorder = Fn(([thisUV] : [any])=>{
    // Takes maskUV from reprojector or ___ Coords. Assumes already been transformed
    const isBorder = bool(false).toVar();
    If(u.useBorderTexture, ()=>{
        //@ts-ignore .level does exist
        const distance =  u.borderTexture.sample(thisUV).level(0).r;
        If(distance.lessThanEqual(u.borderWidth), () => {
            isBorder.assign(bool(true)); 
        });
    })
    return isBorder;
})

export const maskOut = Fn(([inUV] : [any])=>{
	const remove = bool(false).toVar();
	If(u.maskValue.notEqual(0), () => {
		const mask = u.maskTexture.sample(inUV).r.toVar();
		const masked = select(u.maskValue.equal(1), mask.lessThan(0.5), mask.greaterThanEqual(0.5));
		If(masked, () => { remove.assign(bool(true)); });
	});
	return remove
})

// --- NANNERS ---//
export const isNaNBits = Fn(([x]: [any]) => {
  const bits = floatBitsToUint(x);
  const exponent = bits.bitAnd(uint(0x7f800000));
  const mantissa = bits.bitAnd(uint(0x007fffff));
  return exponent.equal(uint(0x7f800000)).and(mantissa.notEqual(uint(0)));
});