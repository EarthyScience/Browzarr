import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useErrorStore } from "@/GlobalStates/ErrorStore";
import { calculateStrides } from "@/utils/HelperFuncs";
import { DecompressArray, copyChunkToArray, copyChunkToArray2D } from "./utils";
import { NCFetcher, zarrFetcher } from "./dataFetchers";
import { WorkerPool } from "../workers/workerPool";
import pLimit from 'p-limit';

export async function GetArray(varOveride?: string) {
    const { idx4D, initStore, variable, setProgress, setStrides, setStatus } = useGlobalStore.getState();
    const { compress, xSlice, ySlice, zSlice, coarsen, kernelSize, kernelDepth, fetchNC, setCurrentChunks, setArraySize } = useZarrStore.getState();
    const { cache } = useCacheStore.getState();
    const useNC = initStore.startsWith("local") && fetchNC // In case a user has NetCDF switched but then goes to a remote
    const fetcher = useNC ? NCFetcher() : zarrFetcher()
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

    setStatus("Downloading...");
    setProgress(0);

    const THREAD_COUNT = navigator.hardwareConcurrency ?? 4; 
    const limit = pLimit(THREAD_COUNT)
    const promises: Promise<void>[] = []
    const pool = new WorkerPool(
        THREAD_COUNT,
        () => new Worker(new URL('../workers/fetchWorker.ts', import.meta.url))
    );

    const scales: Record<string, number> = {} // Need to go through here at the end and apply scaling if needed
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
                    if (hasZ) {
                        copyChunkToArray(
                            chunkData, 
                            cachedChunk.shape, 
                            cachedChunk.stride, 
                            typedArray, 
                            outputShape, 
                            destStride as any, [z, y, x], 
                            [zDim.start, yDim.start, xDim.start]
                        )
                    } else {
                        copyChunkToArray2D(
                            chunkData, 
                            cachedChunk.shape, 
                            cachedChunk.stride, 
                            typedArray, 
                            outputShape, 
                            destStride as any, [y, x], 
                            [yDim.start, xDim.start])
                    }
                } else {
                    promises.push(
                        limit(()=>{
                            return new Promise<void>(async (resolve) =>{
                                const raw = await fetcher.fetchChunk({ variable:targetVariable, rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D });
                                const worker = await pool.acquire();
                                worker.postMessage({
                                    raw,
                                    fillValue,
                                    compress,
                                    coarsen,
                                    chunkShape,
                                    kernel:{
                                        kernelDepth, kernelSize
                                    }
                                }, [raw.data.buffer]);

                                worker.onmessage = (e) =>{
                                    const {chunkF16, cacheData, newScalingFactor, shapeInfo} = e.data
                                    const {thisShape, chunkStride} = shapeInfo
                                    if (hasZ) {
                                        copyChunkToArray(chunkF16, thisShape.slice(-3), chunkStride.slice(-3) as any, typedArray, outputShape, destStride as any, [z, y, x], [zDim.start, yDim.start, xDim.start]);
                                    } else {
                                        copyChunkToArray2D(chunkF16, thisShape, chunkStride as any, typedArray, outputShape, destStride as any, [y, x], [yDim.start, xDim.start]);
                                    }
                                    cache.set(cacheName, {
                                        data: compress ? cacheData : chunkF16,
                                        shape: chunkShape, stride: chunkStride,
                                        scaling: newScalingFactor, compressed: compress, coarsened: coarsen,
                                        kernel: { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined }
                                    });
                                    scales[cacheName] = newScalingFactor;
                                    pool.release(worker);
                                    setProgress(Math.round(iter++ / totalChunks * 100));
                                    resolve()
                                }  
                            })
                        })
                    )
                }
            }
        }
    }
    await Promise.all(promises)
    pool.terminate()
    setProgress(0);
    return { data: typedArray, shape: outputShape, dtype, scalingFactor };
}