export default {}

import { copyChunkToArray, CompressArray, ToFloat16 } from "../zarr/utils";
import { Convolve } from "../computation/webGPU";
import { coarsen3DArray, calculateStrides } from "@/utils/HelperFuncs";
import { GetStore } from "../zarr/ZarrLoaderLRU";
import * as zarr from 'zarrita'

//---- Worker ----//

self.onmessage = async (e) => {
    const {
        cacheName,
        chunkSlice,
        chunkCoord,
        sharedBuffer,
        store,
        variable,
        chunkShape,
        dataShape,
        startCoords,
        strides,
        fillValue,
        compressed,
        coarsen,
        kernel
    } = e.data
    const {kernelSize, kernelDepth} = kernel
    const storeObj = await GetStore(store) as any
    const outVar = await zarr.open(storeObj.resolve(variable), {kind:"array"})
    const chunk = await zarr.get(outVar, chunkSlice)
    const originalData = chunk.data as Float32Array;
    let chunkStride = chunk.stride;
    let thisShape = chunkShape
    let [chunkF16, scalingFactor] = ToFloat16(originalData.map((v: number) => v === fillValue ? NaN : v), null)
    if (coarsen){
        chunkF16 = await Convolve(chunkF16, {shape:chunkShape, strides:chunkStride}, "Mean3D", {kernelSize, kernelDepth}) as Float16Array
        thisShape = chunkShape.map((dim: number, idx: number) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)))
        const newSize = thisShape.reduce((a: number, b: number) => a*b, 1)
        chunkF16 = coarsen3DArray(chunkF16, chunkShape, chunkStride as [number, number, number], kernelSize, kernelDepth, newSize)
        chunkStride = calculateStrides(thisShape)
    }

    const typedArray = new Float16Array(sharedBuffer)

    copyChunkToArray(
        chunkF16,
        chunkShape,
        chunkStride,
        typedArray,
        dataShape,
        strides,
        chunkCoord,
        startCoords,
    )
    const cacheChunk = {
        data: compressed ? CompressArray(chunkF16, 7) : chunkF16,
        shape: chunkShape,
        stride: chunkStride,
        scaling: scalingFactor,
        compressed: compressed,
        coarsened: coarsen,
        kernel: {
            kernelDepth: coarsen ? kernelDepth : undefined,
            kernelSize: coarsen ? kernelSize : undefined
        }
    }
    self.postMessage({ success: true, cacheChunk, cacheName}, { transfer: [cacheChunk.data.buffer] })
}