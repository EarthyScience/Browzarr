import { CoarsenMinMaxNaN } from "@/gpu/webGPU";
export interface coarsenOut{
	data: Uint8Array | Uint16Array;
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
	// RG per voxel: [min, max], both NaN-coded if the block is all NaN
	const {data, shape} = await CoarsenMinMaxNaN(array, {shape: origShape, strides: origStrides}, kernel);

	return {data, shape, kernel};
}
