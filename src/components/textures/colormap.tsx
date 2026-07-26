import * as THREE from 'three';
import { colorschemes, get, findColorScheme, resample } from 'color-schemes-js';

export const colormaps = ['magma', 'inferno', 'plasma', 'viridis', 'cividis', 'twilight', 'twilight_shifted', 'turbo', 'Blues', 'BrBG', 'BuGn', 'BuPu', 'CMRmap', 'GnBu', 'Greens', 'Greys', 'OrRd', 'Oranges', 'PRGn', 'PiYG', 'PuBu', 'PuBuGn', 'PuOr', 'PuRd', 'Purples', 'RdBu', 'RdGy', 'RdPu', 'RdYlBu', 'RdYlGn', 'Reds', 'Spectral', 'Wistia', 'YlGn', 'YlGnBu', 'YlOrBr', 'YlOrRd', 'afmhot', 'autumn', 'binary', 'bone', 'brg', 'bwr', 'cool', 'coolwarm', 'copper', 'cubehelix', 'flag', 'gist_earth', 'gist_gray', 'gist_heat', 'gist_ncar', 'gist_rainbow', 'gist_stern', 'gist_yarg', 'gnuplot', 'gnuplot2', 'gray', 'hot', 'hsv', 'jet', 'nipy_spectral', 'ocean', 'pink', 'prism', 'rainbow', 'seismic', 'spring', 'summer', 'terrain', 'winter', 'Accent', 'Dark2', 'Paired', 'Pastel1', 'Pastel2', 'Set1', 'Set2', 'Set3', 'tab10', 'tab20', 'tab20b', 'tab20c'];

/**
 * COLOR SCALE BEHAVIOR DESCRIPTIONS:
 * 
 * 1. 'identity' (Linear Scale):
 *    - Formula: f(x) = x
 *    - Behavior: Directly maps normalized data range [0, 1] linearly to colormap coordinates.
 * 
 * 2. 'log(x)' (Strict Log Scale):
 *    - Formula:
 *        If minVal > 0: f(x) = log(1 + x*K) / log(1 + K), where K = (v_max - v_min) / v_min.
 *        If minVal <= 0: Thresholded via logEps; maps [eps, 1] logarithmically, clipping <= eps to 0.
 *    - Behavior: Maps data proportional to log(V). Expands several orders of magnitude for strictly positive datasets.
 * 
 * 3. 'log(x+c)' (Custom Offset Log Scale - Default with c=1):
 *    - Formula: f(x) = [log(c + x * dataRange) - log(c)] / [log(c + dataRange) - log(c)]
 *      where `x` is the normalized coordinate in [0, 1] (x = (V - V_min) / dataRange).
 *    - Domain & Negative Values: Works robustly for negative data domains (e.g. V = -100) because `x`
 *      is normalized relative to V_min (V = V_min maps to x = 0). The term inside the log evaluates to
 *      c + x * dataRange >= c > 0 (log(c) at minimum), avoiding NaN or negative log inputs.
 *    - Behavior: Acts as a non-linear contrast control parameter `c` relative to dataRange. Smaller `c`
 *      enhances contrast for values near V_min, while large `c >> dataRange` approaches linear scaling.
 * 
 * 4. 'sign(x)*sqrt(abs(x))' (Symmetric Centered Square Root):
 *    - Formula: f(x) = 0.5 + 0.5 * sign(2x - 1) * sqrt(|2x - 1|)
 *    - Behavior: Scale-invariant power transform (exponent 0.5) centered around the domain midpoint x=0.5.
 *      Preserves center symmetry (0 -> 0, 0.5 -> 0.5, 1 -> 1) and expands values near the center symmetrically.
 * 
 * 5. 'exp(x)/100' (Exponential Scale):
 *    - Formula: f(x) = [exp(x * E) - 1] / [exp(E) - 1], where E = min(dataRange, 10.0)
 *    - Behavior: Inverse logarithmic transform. Compresses lower-end values and expands high-end highlights without float overflow.
 * 
 * 6. 'custom' (Custom Expression):
 *    - Formula: Re-normalized user JavaScript expression f(x) = [expr(x) - expr(0)] / [expr(1) - expr(0)]
 *    - Behavior: Allows arbitrary user mathematical functions (e.g. `x*x`), translated to GLSL float operations.
 */
export const COLOR_SCALE_OPTIONS = [
  { 
    label: 'x (Linear)', 
    value: 'identity', 
    description: 'Direct linear mapping of data values across the colormap.' 
  },
  { 
    label: 'log(x)', 
    value: 'log(x)', 
    description: 'Logarithmic scaling to expand low-end details (requires positive values).' 
  },
  { 
    label: 'log(x+c)', 
    value: 'log(x+c)', 
    description: 'Offset log scale where c controls non-linear contrast (smaller c boosts low-end contrast; safe for negative data).' 
  },
  { 
    label: 'sign(x)*sqrt(abs(x))', 
    value: 'sign(x)*sqrt(abs(x))', 
    description: 'Symmetric square-root transform centered at domain midpoint.' 
  },
  { 
    label: 'exp(x)/100', 
    value: 'exp(x)/100', 
    description: 'Exponential scaling compressing low values and highlighting high peaks.' 
  },
  { 
    label: 'Custom (Expression)', 
    value: 'custom', 
    description: 'Custom expression f(x) evaluated and normalized across range [0, 1].' 
  },
] as const;

const customExprCache = new Map<string, (x: number) => number>();

// This bit needs more work. TODO in a different pull request.
export function evalCustomExprJS(expr: string): ((x: number) => number) | null {
  if (!expr || typeof expr !== 'string') return null;
  if (customExprCache.has(expr)) return customExprCache.get(expr)!;

  const sanitized = expr
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\blog\b/g, 'Math.log')
    .replace(/\bexp\b/g, 'Math.exp')
    .replace(/\bpow\b/g, 'Math.pow')
    .replace(/\bsign\b/g, 'Math.sign');

  try {
    const fn = new Function('x', `return ${sanitized};`) as (x: number) => number;
    const test0 = fn(0);
    const test1 = fn(1);
    if (typeof test0 === 'number' && typeof test1 === 'number' && !isNaN(test0) && !isNaN(test1)) {
      customExprCache.set(expr, fn);
      return fn;
    }
  } catch {
    return null;
  }
  return null;
}
// TODO: check regex, and if it's even needed.
export function exprToGLSL(expr: string): string {
  if (!expr || typeof expr !== 'string') return '(val)';
  const valSubbed = expr.replace(/\bx\b/g, '(val)');
  const floatified = valSubbed.replace(/\b(\d+)(?!\.)\b/g, '$1.0');
  return floatified.replace(/\bMath\./g, '');
}

export function colorScaleToId(colorScale: string): number {
  switch (colorScale) {
    case 'identity': return 0;
    case 'log(x)': return 1;
    case 'log(1+x)':
    case 'log(x+c)': return 2;
    case 'sign(x)*sqrt(abs(x))': return 3;
    case 'exp(x)/100': return 4;
    default: return 5; // Custom generic expression (e.g., "x > 0 ? x/2 : x")
  }
}

export function applyColorScale(x: number, scaleType: string, c = 1.0, logEps = 0.000001, dataRange = 100.0, minVal = 0.0): number {
  const safeRange = Math.max(dataRange, 0.000001);
  if (scaleType === 'log(x)') {
    if (minVal > 0) {
      const K = safeRange / minVal;
      const clampedX = Math.max(x, 0.0);
      const num = Math.log(1.0 + clampedX * K);
      const denom = Math.log(1.0 + K);
      return denom !== 0 ? num / denom : x;
    } else {
      const eps = Math.max(logEps, 0.000001);
      if (x <= eps) return 0.0;
      const xRel = (x - eps) / (1.0 - eps);
      const K = (1.0 - eps) / eps;
      const num = Math.log(1.0 + xRel * K);
      const denom = Math.log(1.0 + K);
      return denom !== 0 ? num / denom : x;
    }
  } else if (scaleType === 'log(1+x)' || scaleType === 'log(x+c)') {
    const safeC = Math.max(c, 0.00001);
    const clampedX = Math.max(x, 0.0);
    const num = Math.log(safeC + clampedX * safeRange) - Math.log(safeC);
    const denom = Math.log(safeC + safeRange) - Math.log(safeC);
    return denom !== 0 ? num / denom : x;
  } else if (scaleType === 'sign(x)*sqrt(abs(x))') {
    const xCentered = 2.0 * x - 1.0;
    return 0.5 + 0.5 * Math.sign(xCentered) * Math.sqrt(Math.abs(xCentered));
  } else if (scaleType === 'exp(x)/100') {
    const clampedX = Math.max(x, 0.0);
    const num = Math.exp(clampedX * Math.min(safeRange, 10.0)) - 1.0;
    const denom = Math.exp(Math.min(safeRange, 10.0)) - 1.0;
    return denom !== 0 ? num / denom : x;
  } else if (scaleType !== 'identity') {
    const fn = evalCustomExprJS(scaleType);
    if (fn) {
      const v0 = fn(0);
      const v1 = fn(1);
      const vx = fn(x);
      const denom = v1 - v0;
      return denom !== 0 ? (vx - v0) / denom : vx;
    }
  }
  return x;
}

export function invertColorScale(t: number, scaleType: string, c = 1.0, logEps = 0.000001, dataRange = 100.0, minVal = 0.0): number {
  const safeRange = Math.max(dataRange, 0.000001);
  const clampedT = Math.max(0.0, Math.min(1.0, t));
  if (scaleType === 'log(x)') {
    if (minVal > 0) {
      const K = safeRange / minVal;
      return (Math.pow(1.0 + K, clampedT) - 1.0) / K;
    } else {
      const eps = Math.max(logEps, 0.000001);
      const K = (1.0 - eps) / eps;
      const xRel = (Math.pow(1.0 + K, clampedT) - 1.0) / K;
      return eps + xRel * (1.0 - eps);
    }
  } else if (scaleType === 'log(1+x)' || scaleType === 'log(x+c)') {
    const safeC = Math.max(c, 0.00001);
    const ratio = 1.0 + safeRange / safeC;
    return safeC * (Math.pow(ratio, clampedT) - 1.0) / safeRange;
  } else if (scaleType === 'sign(x)*sqrt(abs(x))') {
    const tCentered = 2.0 * clampedT - 1.0;
    return 0.5 + 0.5 * Math.sign(tCentered) * Math.pow(Math.abs(tCentered), 2);
  } else if (scaleType === 'exp(x)/100') {
    const expR = Math.min(safeRange, 10.0);
    const num = Math.log(1.0 + clampedT * (Math.exp(expR) - 1.0));
    return num / expR;
  }
  return clampedT;
}

export const availableColorMapNames = Object.keys(colorschemes).sort();

export type ColormapEntry = {
  name: string;
  category?: string;
  notes?: string;
};

// Single searchable index, built once at module load from the color-schemes-js data
export const colormapIndex: ColormapEntry[] = availableColorMapNames.map((name) => {
  const scheme = colorschemes[name];
  return {
    name,
    category: scheme.category,
    notes: scheme.notes,
  };
});

const legacySchemeMap: Record<string, string> = {
  Spectral: 'Spectral_11',
  Paired: 'Paired_12',
  Set1: 'Set1_9',
  Set2: 'Set2_8',
  Set3: 'Set3_12',
  Accent: 'Accent_8',
  Dark2: 'Dark2_8',
  Pastel1: 'Pastel1_9',
  Pastel2: 'Pastel2_8',
  twilight_shifted: 'twilight',
  gray: 'grays',
  winter: 'Winter',
};

const resolutionCache = new Map<string, string>();
export function resolveColorSchemeName(name: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'plasma';

  const cached = resolutionCache.get(trimmed);
  if (cached) return cached;

  let resolved = 'plasma';
  if (legacySchemeMap[trimmed]) {
    resolved = legacySchemeMap[trimmed];
  } else if (colorschemes[trimmed]) {
    resolved = trimmed;
  } else {
    const exact = Object.keys(colorschemes).find((key) => key.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      resolved = exact;
    } else {
      const results = findColorScheme(trimmed);
      if (results.length > 0) {
        resolved = results.sort((a, b) => b.scheme.length - a.scheme.length)[0].name;
      }
    }
  }

  resolutionCache.set(trimmed, resolved);
  return resolved;
}

export function evaluateColorMap(value: number, palette: string, reverse = false): [number, number, number] {
  const schemeName = resolveColorSchemeName(palette);
  const scheme = colorschemes[schemeName] || colorschemes['viridis'];
  if (!scheme) {
    return [0, 0, 0];
  }
  const t = Math.max(0, Math.min(1, reverse ? 1 - value : value));
  const color = get(scheme, t);
  const rgb = color.toRgb255();
  return [rgb.r, rgb.g, rgb.b];
}

export function getColormapGradientCss(name: string): string {
  const schemeName = resolveColorSchemeName(name);
  const scheme = colorschemes[schemeName];
  if (!scheme) {
    return 'linear-gradient(to right, #222, #999)';
  }
  const stops = Array.from({ length: 16 }, (_, idx) => {
    const t = idx / 15;
    const { r, g, b } = get(scheme, t).toRgb255();
    return `rgb(${r}, ${g}, ${b}) ${(t * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function minMax(values: number[]): { min: number | undefined, max: number | undefined } {
    // Filter out NaN values
    const validValues = values.filter(value => !isNaN(value));
    // Calculate min and max
    const min = validValues.length > 0 ? validValues.reduce((a,b) => Math.min(a,b)) : undefined;
    const max = validValues.length > 0 ? validValues.reduce((a,b) => Math.max(a,b)) : undefined;
    return { min, max };
}

export function detectUniqueCategories(data: ArrayLike<number>, maxCategories = 50): number[] {
  const set = new Set<number>();
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (!isNaN(val) && isFinite(val)) {
      set.add(val);
      if (set.size > maxCategories) break;
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function GetColorMapTexture(
  texture: THREE.DataTexture | null = null, 
  palette: string = "Spectral", 
  alpha: number = 1, 
  nan_color: string = "#000000", 
  nan_alpha: number = 0,
  reverse: boolean = false,
  isCategorical: boolean = false,
  numBins: number = 10
): THREE.DataTexture {
  let unitInterval = Array.from({ length: 255 }, (_, index) => index / 254);
  unitInterval = reverse ? unitInterval.reverse() : unitInterval;
  
  let rgbv: [number, number, number][];
  if (isCategorical) {
    const bins = Math.max(2, Math.min(50, numBins));
    const schemeName = resolveColorSchemeName(palette);
    const scheme = colorschemes[schemeName] || colorschemes['viridis'];
    const resampled = resample(scheme, bins).colors;
    const catColors: [number, number, number][] = resampled.map((c: any) => {
      const rgb = c.toRgb255();
      return [rgb.r, rgb.g, rgb.b];
    });
    
    rgbv = unitInterval.map(value => {
      const idx = Math.min(bins - 1, Math.floor(value * bins));
      return catColors[idx];
    });
  } else {
    rgbv = unitInterval.map(value => evaluateColorMap(value, palette, false));
  }
  const colData = new Uint8Array((rgbv.length + 1) * 4);

  for (let i = 0; i < rgbv.length; i++) {
    const [r, g, b] = rgbv[i];
    colData[i * 4] = r;
    colData[i * 4 + 1] = g;
    colData[i * 4 + 2] = b;
    colData[i * 4 + 3] = alpha;  // Alpha channel
  }

  // Add the last color as the nan, this should be done better!
  const to_nan = hexToRgb(nan_color);
  const lastIndex = rgbv.length * 4;
  colData[lastIndex] = to_nan[0];
  colData[lastIndex + 1] = to_nan[1];
  colData[lastIndex + 2] = to_nan[2];
  colData[lastIndex + 3] = nan_alpha;
  if (texture) {
    texture.dispose()
  } 
    // Create a new texture if not already available
    const newTexture = new THREE.DataTexture(colData, rgbv.length + 1, 1, THREE.RGBAFormat);
    newTexture.needsUpdate = true;
    return newTexture;
}

// export function genRand(count: number) {
//   const data = Array.from({ length: count }, () =>
//       Array.from({ length: count }, () =>
//           Array.from({ length: count }, () => {
//               // Randomly insert NaN values (e.g., 10% chance)
//               if (Math.random() < 0.6) {
//                   return NaN;
//               }
//               return Math.random();
//           })
//       )
//   );
//   const nested = new NestedArray(data, [count, count, count], '<f4');
//   return nested;
// }

export function hexToRgb(hex: string) {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');
  // Parse the r, g, b values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}
