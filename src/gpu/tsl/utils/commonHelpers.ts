import {
  abs,
  asin,
  atan,
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
  mul,
  normalize,
  PI,
  round,
  select,
  texture,
  uint,
  vec2, vec3,
  vec4,
  wgslFn
} from 'three/tsl';
import * as u from './uniforms';
import { usePlotStore } from '@/stores/PlotStore';


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

// Exact texel fetch (no filtering). p is an integer texel coordinate inside chunk `index`
export const loadMap = Fn(([p, index]: [any, any]) => {
	const pv = p.toVar();
	const result = vec4(0).toVar();
	u.map.forEach( ( tex, i ) => {
		If( index.equal( i ), () => {
			result.assign( tex.load( pv ) );
		} );
	} );
	return result;
});

export const sample2ToOrder = Fn(([p, index, variable]: [any, any, any]) => {
  const biVar = sample2(p, index);
  return select(variable.equal(0), biVar, biVar.gr);
});

export const getLocalCoord = (thisUV : any) =>{
	const sampleCoord = thisUV.toVar();
	if (u.isFlat.value) {
		const idx = clamp(ivec2(sampleCoord.mul(u.textureDepths.xy)), ivec2(0), ivec2(u.textureDepths.xy).sub(1));
		const textureIdx = idx.y.mul(uint(u.textureDepths.x)).add(idx.x);
		const localCoord = fract(sampleCoord.mul(u.textureDepths.xy));
		return {localCoord, textureIdx}
	}
	return getLocalCoord3D(vec3(sampleCoord, u.animateProg))
}

export const getLocalCoord3D = (texCoord : any) =>{
	const zStepSize = uint(u.textureDepths.y).mul(uint(u.textureDepths.x));
	const yStepSize = uint(u.textureDepths.x);
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

// Sphere position -> global equirectangular UV (for mask/border textures)
export const giveMaskUV = Fn( ( [ position ] : [any] ) => {
	const n = normalize( position );
	const latitude = asin( n.y );
	const longitude = atan( n.z, n.x ).negate();
	latitude.divAssign( PI );
	longitude.divAssign( mul( 2., PI ) );
	return vec2( longitude.add( 0.5 ), latitude.add( 0.5 ) );
});


// --- BIVARIATE COLORS --- //
const lerpColors = Fn(([A, B, fac]: [any, any, any]) => {
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


// --- SURFACE COLORING --- //
// rescaleFirst: apply rescaler before the NaN check (flat) instead of only on the colormap path (sphere).
export const sampleSurfaceColor = (localCoord: any, textureIdx: any) => {
    const color = vec4( 0 ).toVar( 'color' );
    const strength = float( 0 ).toVar( 'strength' );
    const biVal = float( 0 ).toVar( 'biVal' );
    const biNaN = bool( false ).toVar( 'biNaN' );

    If( u.bivariate, () => {
        const bivar = sample2ToOrder( localCoord, textureIdx, u.bivariateSelection );
        strength.assign( bivar.r );
        biVal.assign( bivar.g );
        biNaN.assign( isNaNBits( strength ).or( isNaNBits( biVal ) ) );
    } ).Else( () => {
        strength.assign( sample1( localCoord, textureIdx ) );
        strength.assign( rescaler( strength ) );
    } );

    If( isNanVal( strength ).or( biNaN ), () => {
        color.assign( vec4( u.nanColor, u.nanAlpha ) );
    } ).Else( () => {
        If( u.bivariate, () => {
            const flipOrder = u.bivariateSelection.notEqual( 0 );
            color.assign( vec4( select( flipOrder, colorMixer( biVal, strength ), colorMixer( strength, biVal ) ), 1. ) );
        } ).Else( () => {
            strength.mulAssign( u.cScale );
            strength.assign( clamp( strength.add( u.cOffset ), 0.0, 0.995 ) );
            color.assign( vec4( u.cmap.sample( vec2( strength, 0.5 ) ).rgb, 1. ) );
        } );
    } );

    const valid = strength.greaterThanEqual( u.threshold.x ).and( strength.lessThanEqual( u.threshold.y ) );
    If( valid.not(), () => {
        color.assign( vec4( 0. ) );
    } );
    return { color, strength };
}

// Mask/border overlay (alpha >= 0) wins over the base color. Must be called inside an Fn.
export const overlayOr = (overlay: any, base: () => any) => {
    const color = vec4( 0 ).toVar( 'FinalColor' );
    If( overlay.a.greaterThanEqual( 0 ), () => {
        color.assign( overlay );
    } ).Else( () => {
        color.assign( base() );
    } );
    return color;
}


// --- REPROJECTION --- //
// Shared core: optional remap texture lookup -> realCoords -> optional border remap -> 360 wrap.
// wrapAlways: wrap longitude even when border remap is used.
// borderFromMaskUV: sample the border remap at the projected maskUV rather than the data UV.
const reprojectCore = (texCoord: any, opts: { wrapAlways: boolean, borderFromMaskUV?: boolean, onRemap?: (remap: any) => void }) => {
  const valid = bool(true).toVar();
  const src = texCoord.xy.toVar();
  If(u.reproject, () => {
    // Each output pixel looks up where it comes from in the source data
    const remap = texture(u.remapTexture, texCoord.xy).rgb.toVar();
    opts.onRemap?.(remap);
    src.assign(remap.rg);
    valid.assign(remap.b.greaterThan(0.5));
  })
  const maskUV = realCoords(src).toVar();
  const wrap = () => { maskUV.x.assign(select(u.is360, fract(maskUV.x.add(0.5)), maskUV.x)); };
  const borders = If(u.remapBorders, () => {
      const tempV = (opts.borderFromMaskUV ? maskUV : src).toVar();
      tempV.y.assign(select(u.flipY, tempV.y.oneMinus(), tempV.y));
      maskUV.assign(u.remapBorderTexture.sample(tempV).ba);
  })
  // For 0–360 data, wrap longitude by half a turn
  if (opts.wrapAlways) wrap(); else borders.Else(wrap);
  return { maskUV, valid };
}

export const reprojector = Fn(([texCoord, maskUV] : [any, any]) => {
  const res = reprojectCore(texCoord, {
    wrapAlways: false,
    onRemap: remap => { texCoord.assign(vec3(remap.rg, texCoord.z)); },
  });
  maskUV.assign(res.maskUV);
  return res.valid
})

export const reprojectMask = Fn(([texCoord] : [any]) => reprojectCore(texCoord, { wrapAlways: true }).maskUV)

export const reprojectUV = Fn(([thisUV] : [any]) => reprojectCore(thisUV, { wrapAlways: true, borderFromMaskUV: true }).maskUV)

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

// NaN, or the 1.0 sentinel used for missing values in non-F16 textures
export const isNanVal = (x: any) => isNaNBits(x).or(u.useF16.not().and(x.equal(1.0)));
