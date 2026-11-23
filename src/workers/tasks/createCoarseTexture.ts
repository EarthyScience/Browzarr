import { CoarsenMinMaxNaN } from "@/gpu/webGPU";
export interface coarsenOut{
	data: Uint8Array | Uint16Array | null; // null if coarsening failed (see error)
	error?: string;
	array: Uint8Array | Uint16Array; // Pass back to main thread since we are using transfers
	shape: [number, number, number];   // coarse [z, y, x]
	kernel: [number, number, number];  // block size per axis [kernelDepth, kernelY, kernelX]
}

export interface coarseIn{
    array: Uint8Array | Uint16Array;
    origShape: [number, number, number];
    origStrides: [number, number, number];
}

const TARGET_DIM = 64;

// Axes shorter than 2*TARGET_DIM are left alone; longer ones are reduced to <= TARGET_DIM
export function getCoarsenKernel(origShape: [number, number, number]): [number, number, number]{
	const factorFor = (dim: number) => dim < 2 * TARGET_DIM ? 1 : Math.ceil(dim / TARGET_DIM);
	return origShape.map(factorFor) as [number, number, number];
}

export async function coarsenVolume({array, origShape, origStrides} : coarseIn): Promise<coarsenOut>{
	const kernel = getCoarsenKernel(origShape);
	try {
		// RG per voxel: [min, max]; R NaN-coded if the block is all NaN, G if it has any NaN
		const {data, shape} = await CoarsenMinMaxNaN(array, {shape: origShape, strides: origStrides}, kernel);
		return {data, shape, kernel, array};
	} catch (e) {
		// Don't throw: the main thread transferred `array` to us and needs it back either way
		return {data: null, error: String(e), shape: [0, 0, 0], kernel, array};
	}
}
