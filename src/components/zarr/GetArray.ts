import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useErrorStore } from "@/GlobalStates/ErrorStore";
import { ArrayMinMax, calculateStrides, GetCurrentArray } from "@/utils/HelperFuncs";
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

    let scalingFactor: number | null = null;
    const totalChunks = (zDim.end - zDim.start) * (yDim.end - yDim.start) * (xDim.end - xDim.start);
    let iter = 1;

    setStatus("Downloading...");
    setProgress(0);

    const THREAD_COUNT = useNC ? 4 : navigator.hardwareConcurrency ?? 4; // I cant explain why it makes sense to me to use fewer threads when NC
    const limit = pLimit(THREAD_COUNT)
    const promises: Promise<void>[] = []
    let pool = new WorkerPool(
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

                if (isCacheValid) continue;
                else {
                    let raw:{
                        data: Float32Array,
                        shape:number[],
                        stride:number[]
                    };
                    // If netCDF we can't do concurrent fetches. So we want to get the data -> pass it off -> immediately grab next data 
                    if (useNC) raw = await fetcher.fetchChunk({ variable:targetVariable, rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D });
                    promises.push(
                        limit(()=>{
                            return new Promise<void>(async (resolve) =>{
                                if (!useNC) raw = await fetcher.fetchChunk({ variable:targetVariable, rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D });
                                const worker = await pool.acquire();
                                worker.postMessage({
                                    raw,
                                    fillValue,
                                    compress,
                                    coarsen,
                                    chunkShape,
                                    scalingFactor,
                                    kernel:{
                                        kernelDepth, kernelSize
                                    }
                                }, [raw.data.buffer]);

                                worker.onmessage = (e) =>{
                                    const {chunkF16, cacheData, newScalingFactor, shapeInfo} = e.data
                                    if (newScalingFactor != null && newScalingFactor !== scalingFactor) {
                                        scalingFactor = newScalingFactor;
                                    }
                                    const { chunkStride} = shapeInfo
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
    promises.length = 0; // Clear promise array
    pool.terminate()
    pool = new WorkerPool(
        THREAD_COUNT,
        () => new Worker(new URL('../workers/rescaleWorker.ts', import.meta.url))
    );

    //---- Scaling Function ----//
    const wasScaled = Object.values(scales).some((val)=>Number.isFinite(val))
    if (wasScaled){
        const maxScaling = Object.values(scales).reduce((prev, val) => !Number.isFinite(val) ? 0 : (val > prev) ? val : prev, -Infinity)
        scalingFactor = maxScaling;
        for (const [key, value] of Object.entries(scales)) {
            if (value != scalingFactor){
                const chunkData = cache.get(key);
                console.log(ArrayMinMax(chunkData.data))
                promises.push(
                    limit(()=>{
                        return new Promise<void>(async (resolve) =>{
                            const worker = await pool.acquire();
                            const targetScale = scalingFactor as number;
                            console.log(value, targetScale)
                            const delta = targetScale - value 
                            console.log(`delta ${delta}`)
                            worker.postMessage({
                                data: chunkData.data,
                                newScalingFactor: delta
                            }, [chunkData.data.buffer]);
                            worker.onmessage = (e) =>{
                                const {data} = e.data
                                console.log(ArrayMinMax(data))
                                chunkData.data = data
                                chunkData.scalingFactor = targetScale
                                cache.set(key,chunkData)
                                pool.release(worker);
                                resolve()
                            }
                        })
                    })
                )
            }
        }
    }
    await Promise.all(promises)
    pool.terminate()
    setProgress(0);
    const array = await  GetCurrentArray()
    console.log(ArrayMinMax(array))
    return { data: array, shape: outputShape, dtype, scalingFactor };
}