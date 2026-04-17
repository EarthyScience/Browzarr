export default {}
import { Convolve } from "../computation/webGPU";
import { ToFloat16, CompressArray } from "../zarr/utils";
import { coarsen3DArray, calculateStrides } from "@/utils/HelperFuncs";

interface InputData{
    raw:{
        data: Float32Array,
        shape: number[],
        stride: number[]
    }
    fillValue: number | undefined
    scalingFactor: number | null
    compress:boolean
    coarsen: boolean
    chunkShape:number[]
    kernel:{
        kernelSize: number,
        kernelDepth: number
    }
}

self.onmessage = async (e: MessageEvent<InputData>) => {
    const {
        raw,
        compress,
        coarsen,
        fillValue,
        scalingFactor,
        chunkShape,
        kernel
    } = e.data
    const {kernelSize, kernelDepth} = kernel
    const rawData = Number.isFinite(fillValue) ? raw.data.map((v: number) => v === fillValue ? NaN : v) : raw.data; // Don't map if no fillvalue
    let [chunkF16, newScalingFactor] = ToFloat16(rawData);
    let thisShape = raw.shape;
    let chunkStride = raw.stride;
    if (coarsen) {
        chunkF16 = await Convolve(chunkF16, { shape: chunkShape, strides: chunkStride }, "Mean3D", { kernelSize, kernelDepth }) as Float16Array;
        thisShape = thisShape.map((dim, idx) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)));
        chunkF16 = coarsen3DArray(chunkF16, chunkShape as [number, number, number], chunkStride as any, kernelSize, kernelDepth, thisShape.reduce((a, b) => a * b, 1));
        chunkStride = calculateStrides(thisShape);
    }

    const cacheData = compress ? CompressArray(chunkF16, 7) : undefined
    const transfer = cacheData ? [cacheData.buffer, chunkF16.buffer] : [chunkF16.buffer]
    const shapeInfo = {thisShape, chunkStride}
    self.postMessage({ success: true, chunkF16, cacheData, newScalingFactor, shapeInfo }, {transfer})
}