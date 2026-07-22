import * as THREE from 'three';
import { colorschemes, get, findColorScheme } from 'color-schemes-js';

export const colormaps = ['magma', 'inferno', 'plasma', 'viridis', 'cividis', 'twilight', 'twilight_shifted', 'turbo', 'Blues', 'BrBG', 'BuGn', 'BuPu', 'CMRmap', 'GnBu', 'Greens', 'Greys', 'OrRd', 'Oranges', 'PRGn', 'PiYG', 'PuBu', 'PuBuGn', 'PuOr', 'PuRd', 'Purples', 'RdBu', 'RdGy', 'RdPu', 'RdYlBu', 'RdYlGn', 'Reds', 'Spectral', 'Wistia', 'YlGn', 'YlGnBu', 'YlOrBr', 'YlOrRd', 'afmhot', 'autumn', 'binary', 'bone', 'brg', 'bwr', 'cool', 'coolwarm', 'copper', 'cubehelix', 'flag', 'gist_earth', 'gist_gray', 'gist_heat', 'gist_ncar', 'gist_rainbow', 'gist_stern', 'gist_yarg', 'gnuplot', 'gnuplot2', 'gray', 'hot', 'hsv', 'jet', 'nipy_spectral', 'ocean', 'pink', 'prism', 'rainbow', 'seismic', 'spring', 'summer', 'terrain', 'winter', 'Accent', 'Dark2', 'Paired', 'Pastel1', 'Pastel2', 'Set1', 'Set2', 'Set3', 'tab10', 'tab20', 'tab20b', 'tab20c'];

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
  if (!trimmed) return 'viridis';

  const cached = resolutionCache.get(trimmed);
  if (cached) return cached;

  let resolved = 'viridis';
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

export function GetColorMapTexture(
  texture: THREE.DataTexture | null = null, 
  palette: string = "Spectral", 
  alpha: number = 1, 
  nan_color: string = "#000000", 
  nan_alpha: number = 0,
  reverse: boolean = false
): THREE.DataTexture {
  let unitInterval = Array.from({ length: 255 }, (_, index) => index / 254);
  unitInterval = reverse ? unitInterval.reverse() : unitInterval
  const rgbv = unitInterval.map(value => evaluateColorMap(value, palette, false));
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
