export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
export function lerpColor(c1: Rgb, c2: Rgb, t: number): Rgb {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
}
export function rgbToCss({ r, g, b }: Rgb): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function darkenBlend(c1: Rgb, c2: Rgb): Rgb {
  return {
    r: Math.min(c1.r, c2.r),
    g: Math.min(c1.g, c2.g),
    b: Math.min(c1.b, c2.b),
  };
}
export function lightenBlend(c1: Rgb, c2: Rgb): Rgb {
  return {
    r: Math.max(c1.r, c2.r),
    g: Math.max(c1.g, c2.g),
    b: Math.max(c1.b, c2.b),
  };
}
export function multiplyBlend(c1: Rgb, c2: Rgb): Rgb {
  return {
    r: (c1.r * c2.r) / 255,
    g: (c1.g * c2.g) / 255,
    b: (c1.b * c2.b) / 255,
  };
}
export function differenceBlend(c1: Rgb, c2: Rgb): Rgb {
  return {
    r: Math.abs(c1.r - c2.r),
    g: Math.abs(c1.g - c2.g),
    b: Math.abs(c1.b - c2.b)
  };
}

export function mixColors(c1: Rgb, c2: Rgb, mixMode: number): Rgb {
    switch (mixMode){
    case 0:
      	return darkenBlend(c1, c2);
    case 1:
      return lightenBlend(c1, c2);
    case 2:
      return multiplyBlend(c1, c2);
    case 3:
		return differenceBlend(c1, c2);
    default:
      	return darkenBlend(c1, c2);
  }
}