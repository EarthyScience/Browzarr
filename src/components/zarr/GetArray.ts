import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useErrorStore } from "@/GlobalStates/ErrorStore";
import { calculateStrides } from "@/utils/HelperFuncs";
import { ToFloat16, CompressArray, DecompressArray, copyChunkToArray, RescaleArray, copyChunkToArray2D } from "./utils";
import { NCFetcher, zarrFetcher } from "./dataFetchers";
import { Convolve } from "../computation/webGPU";
import { coarsen3DArray } from "@/utils/HelperFuncs";

export async function GetArray(varOveride?: string) {
    const { idx4D, initStore, variable, setProgress, setStrides, setStatus } = useGlobalStore.getState();
    const { compress, xSlice, ySlice, zSlice, coarsen, kernelSize, kernelDepth, fetchNC, setCurrentChunks, setArraySize } = useZarrStore.getState();
    const { cache } = useCacheStore.getState();
    const fetcher = fetchNC ? NCFetcher() : zarrFetcher()
    const targetVariable = varOveride ?? variable;
    const meta = await fetcher.getMetadata(targetVariable);
    const { shape, chunkShape, fillValue, dtype } = meta;
    const rank = shape.length;
    const hasZ = rank >= 3;
    const xDimIndex = rank - 1, yDimIndex = rank - 2, zDimIndex = rank - 3;

    const calcDim = (slice: [number, number | null], dimIdx: number) => { // This function provides information for extraction from each dimension of datarray
        if (dimIdx < 0) return { start: 0, end: 1, size: 0, chunkDim: 1 };
        const dimSize = shape[dimIdx];
        const chunkDim = chunkShape[dimIdx];
        const start = Math.floor(slice[0] / chunkDim);
        const sliceEnd = slice[1] ?? dimSize;
        return { start, end: Math.ceil(sliceEnd / chunkDim), size: sliceEnd - slice[0], chunkDim };
    };

    const xDim = calcDim(xSlice, xDimIndex);
    const yDim = calcDim(ySlice, yDimIndex);
    const zDim = calcDim(zSlice, zDimIndex);

    let outputShape = hasZ ? [zDim.size, yDim.size, xDim.size] : [yDim.size, xDim.size];
    if (coarsen) {
        outputShape = outputShape.map((dim, idx) => Math.floor(dim / (hasZ && idx === 0 ? kernelDepth : kernelSize)));
    }

    const totalElements = outputShape.reduce((a, b) => a * b, 1);
    if (totalElements > 1e9) { useErrorStore.getState().setError("largeArray"); throw new Error("Cannot allocate array."); }

    const destStride = calculateStrides(outputShape);
    setStrides(destStride);
    setArraySize(totalElements);
    setCurrentChunks({ x: [xDim.start, xDim.end], y: [yDim.start, yDim.end], z: [zDim.start, zDim.end] }); // These are used in GetCurrentArray() function

    const typedArray = new Float16Array(totalElements);

    let scalingFactor: number | null = null;
    const totalChunks = (zDim.end - zDim.start) * (yDim.end - yDim.start) * (xDim.end - xDim.start);
    let iter = 1;
    const rescaleIDs: string[] = [];

    setStatus("Downloading...");
    setProgress(0);

    for (let z = zDim.start; z < zDim.end; z++) {
        for (let y = yDim.start; y < yDim.end; y++) {
            for (let x = xDim.start; x < xDim.end; x++) {
                const chunkID = `z${z}_y${y}_x${x}`;
                const cacheBase = rank > 3 ? `${initStore}_${targetVariable}_${idx4D}` : `${initStore}_${targetVariable}`;
                const cacheName = `${cacheBase}_chunk_${chunkID}`;
                const cachedChunk = cache.get(cacheName);
                const isCacheValid = cachedChunk &&
                                    cachedChunk.kernel.kernelSize === (coarsen ? kernelSize : undefined) &&
                                    cachedChunk.kernel.kernelDepth === (coarsen ? kernelDepth : undefined);

                if (isCacheValid) {
                    const chunkData = cachedChunk.compressed ? DecompressArray(cachedChunk.data) : cachedChunk.data.slice();
                    copyChunkToArray(
                        chunkData, 
                        cachedChunk.shape, 
                        cachedChunk.stride, 
                        typedArray, 
                        outputShape, 
                        destStride as any, [z, y, x], 
                        [zDim.start, yDim.start, xDim.start]
                    );
                } else {
                    const raw = await fetcher.fetchChunk({ variable:targetVariable, rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D });
                    
                    const rawData = fillValue ? raw.data.map((v: number) => v === fillValue ? NaN : v) : raw.data; // Don't map if no fillvalue

                    let [chunkF16, newScalingFactor] = ToFloat16(rawData, scalingFactor);
                    let thisShape = raw.shape;
                    let chunkStride = raw.stride;

                    if (coarsen) {
                        chunkF16 = await Convolve(chunkF16, { shape: chunkShape, strides: chunkStride }, "Mean3D", { kernelSize, kernelDepth }) as Float16Array;
                        thisShape = thisShape.map((dim, idx) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)));
                        chunkF16 = coarsen3DArray(chunkF16, chunkShape, chunkStride as any, kernelSize, kernelDepth, thisShape.reduce((a, b) => a * b, 1));
                        chunkStride = calculateStrides(thisShape);
                    }

                    if (newScalingFactor != null && newScalingFactor !== scalingFactor) {
                        const delta = scalingFactor ? newScalingFactor - scalingFactor : newScalingFactor;
                        RescaleArray(typedArray, delta);
                        scalingFactor = newScalingFactor;
                        for (const id of rescaleIDs) {
                            const tempChunk = cache.get(`${cacheBase}_chunk_${id}`);
                            tempChunk.scaling = scalingFactor;
                            RescaleArray(tempChunk.data, delta);
                            cache.set(`${cacheBase}_chunk_${id}`, tempChunk);
                        }
                    }

                    if (hasZ) {
                        copyChunkToArray(chunkF16, thisShape.slice(-3), chunkStride.slice(-3) as any, typedArray, outputShape, destStride as any, [z, y, x], [zDim.start, yDim.start, xDim.start]);
                    } else {
                        copyChunkToArray2D(chunkF16, thisShape, chunkStride as any, typedArray, outputShape, destStride as any, [y, x], [yDim.start, xDim.start]);
                    }

                    cache.set(cacheName, {
                        data: compress ? CompressArray(chunkF16, 7) : chunkF16,
                        shape: chunkShape, stride: chunkStride,
                        scaling: scalingFactor, compressed: compress, coarsened: coarsen,
                        kernel: { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined }
                    });
                    rescaleIDs.push(chunkID);
                }
                setProgress(Math.round(iter++ / totalChunks * 100));
            }
            }
    }

    setProgress(0);
    return { data: typedArray, shape: outputShape, dtype, scalingFactor };
}