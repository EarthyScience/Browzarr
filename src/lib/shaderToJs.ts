// Mirrors the shader builtins exposed in ColorAdjuster (shared by GLSL and WGSL) so validated snippets run on the CPU
const shaderBuiltins = {
	abs: Math.abs, sqrt: Math.sqrt, min: Math.min, max: Math.max,
	log: Math.log, log2: Math.log2, exp: Math.exp, exp2: (x: number) => 2 ** x,
	pow: Math.pow, floor: Math.floor, ceil: Math.ceil,
	fract: (x: number) => x - Math.floor(x),
	round: Math.round,
	clamp: (x: number, a: number, b: number) => Math.min(Math.max(x, a), b),
	// WGSL scalar casts
	f32: Number, i32: Math.trunc, u32: (x: number) => Math.max(0, Math.trunc(x)),
}

// Expression only, matching makeColorScale in commonHelpers.ts which emits `return ${expr};`
const toJs = (src: string) => src
	.trim().replace(/;+$/, '')                              // trailing semicolons
	.replace(/(\d)[fu]\b/g, '$1')                           // numeric suffixes (1.0f, 2u)

	
export function transformedRange(f: (x: number) => number, min: number, max: number, samples = 128) {
	let lo = Infinity, hi = -Infinity
	const test = (v: number) => {
		if (!Number.isFinite(v)) return
		if (v < lo) lo = v
		if (v > hi) hi = v
	}
	for (let i = 0; i < samples; i++) test(f(min + (max - min) * i / (samples - 1)))
	if (min < 0 && max > 0) test(f(0))
	return lo > hi ? undefined : {minVal: lo, maxVal: hi}
}

// Only pass snippets that already passed shader validation
export function compileShaderExpression(src: string | undefined): (x: number) => number {
	if (!src) return x => x
	try {
		const fn = new Function(...Object.keys(shaderBuiltins), 'x', `"use strict"; return (${toJs(src)});`)
		const args = Object.values(shaderBuiltins)
		return (x: number) => fn(...args, x)
	} catch {
		return x => x
	}
}
