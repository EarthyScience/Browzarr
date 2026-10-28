import { Convolve } from "@/gpu/webGPU"
import { coarsen3DArray, calculateStrides } from "@/lib/arrayMath"
import { ToFloat16, CompressArray } from "@/data/zarr/utils"
interface FetchOutput{
    data: Float32Array
    shape: number[]
    stride: number[]
}

export interface processIn{
    raw:FetchOutput;
    fillValue: number;
    scalingFactor: number | undefined;
    coarsen:boolean;
    compress:boolean;
    hasZ: boolean;
    kernelInfo:{
        kernelSize:number,
        kernelDepth:number
    };
    indices:{
        zIndexInRaw: number,
        yIndexInRaw: number,
        xIndexInRaw: number
    }
}
export interface processOut{
    chunkF16: Float16Array | Uint8Array;
    newScalingFactor: number | undefined;
    thisShape: number[];
    chunkStride: number[]
}

export async function processChunk({raw, fillValue, scalingFactor, coarsen, compress, hasZ, indices, kernelInfo}:processIn): Promise<processOut>{
    const {kernelSize, kernelDepth} = kernelInfo;
    const {zIndexInRaw, yIndexInRaw, xIndexInRaw} = indices;
    const rawData = Number.isFinite(fillValue) ? raw.data.map((v: number) => v === fillValue ? NaN : v) : raw.data; // Don't map if no fillvalue
    
    const [chunkF16Raw, newScalingFactor] = ToFloat16(rawData, scalingFactor);
    let chunkF16 = chunkF16Raw;

    let thisShape = hasZ ? [raw.shape[zIndexInRaw], raw.shape[yIndexInRaw], raw.shape[xIndexInRaw]] : [raw.shape[yIndexInRaw], raw.shape[xIndexInRaw]];
    let chunkStride = hasZ ? [raw.stride[zIndexInRaw], raw.stride[yIndexInRaw], raw.stride[xIndexInRaw]] : [raw.stride[yIndexInRaw], raw.stride[xIndexInRaw]];

    if (coarsen) {
        const origShape = [...thisShape];
        if (hasZ) {
            chunkF16 = await Convolve(chunkF16, { shape: origShape, strides: chunkStride }, { kernelSize, kernelDepth }) as Float16Array ?? chunkF16;
            thisShape = origShape.map((dim, idx) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)));
            chunkF16 = coarsen3DArray(chunkF16, origShape as [number, number, number], chunkStride as [number, number, number], kernelSize, kernelDepth, thisShape.reduce((a, b) => a * b, 1));
        } else {
            chunkF16 = await Convolve(chunkF16, { shape: origShape, strides: chunkStride }, { kernelSize, kernelDepth:1 }) as Float16Array ?? chunkF16;
            thisShape = origShape.map((dim, idx) => Math.floor(dim / kernelSize));
            const paddedShape = [1, origShape[0], origShape[1]] as [number, number, number];
            const paddedStride = [1, chunkStride[0], chunkStride[1]] as [number, number, number];
            chunkF16 = coarsen3DArray(chunkF16, paddedShape, paddedStride, kernelSize, 1, thisShape.reduce((a, b) => a * b, 1));
        }
        chunkStride = calculateStrides(thisShape);
    }

    return {chunkF16: compress ? CompressArray(chunkF16, 7) : chunkF16, newScalingFactor, thisShape, chunkStride}
}