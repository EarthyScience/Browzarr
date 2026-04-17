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
    const { idx4D, initStore, variable, setProgress, setStrides } = useGlobalStore.getState();
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
        const sliceStart = slice[0];
        const sliceEnd = slice[1] ?? dimSize;

        // Calculate chunk range that intersects with slice
        const startChunk = Math.floor(sliceStart / chunkDim);
        const endChunk = Math.ceil(sliceEnd / chunkDim);

        return {
            start: startChunk,
            end: endChunk,
            size: sliceEnd - sliceStart,
            chunkDim,
            sliceStart,
            sliceEnd
        };
    };

    const xDim = calcDim(xSlice, xDimIndex);
    const yDim = calcDim(ySlice, yDimIndex);
    const zDim = calcDim(zSlice, zDimIndex);

    // Calculate actual data overlap for each chunk
    const calculateChunkOverlap = (chunkCoord: number, dimIdx: number, sliceStart: number, sliceEnd: number, chunkDim: number) => {
        const chunkStart = chunkCoord * chunkDim;
        const chunkEnd = Math.min((chunkCoord + 1) * chunkDim, shape[dimIdx]);

        const overlapStart = Math.max(chunkStart, sliceStart);
        const overlapEnd = Math.min(chunkEnd, sliceEnd);

        return Math.max(0, overlapEnd - overlapStart);
    };

    // Calculate priority score for chunk ordering (higher = more important)
    const calculateChunkPriority = (z: number, y: number, x: number) => {
        const xOverlap = calculateChunkOverlap(x, xDimIndex, xDim.sliceStart ?? 0, xDim.sliceEnd ?? xDim.chunkDim, xDim.chunkDim);
        const yOverlap = calculateChunkOverlap(y, yDimIndex, yDim.sliceStart ?? 0, yDim.sliceEnd ?? yDim.chunkDim, yDim.chunkDim);
        const zOverlap = hasZ ? calculateChunkOverlap(z, zDimIndex, zDim.sliceStart ?? 0, zDim.sliceEnd ?? zDim.chunkDim, zDim.chunkDim) : 1;

        // Priority based on data density (fraction of chunk that contains requested data)
        const xDensity = xOverlap / xDim.chunkDim;
        const yDensity = yOverlap / yDim.chunkDim;
        const zDensity = hasZ ? zOverlap / zDim.chunkDim : 1;

        const dataDensity = xDensity * yDensity * zDensity;

        // Also consider chunk size (smaller chunks download faster)
        const chunkSize = xDim.chunkDim * yDim.chunkDim * (hasZ ? zDim.chunkDim : 1);

        // Combine factors: prioritize high data density, then smaller chunks
        return dataDensity * 1000 + (1 / chunkSize) * 100;
    };

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
    const cacheBase = rank > 3 ? `${initStore}_${targetVariable}_${idx4D}` : `${initStore}_${targetVariable}`;

    // Collect all chunks that need fetching, sorted by priority
    const chunksToFetch: Array<{
        chunkID: string;
        cacheName: string;
        coords: { z: number; y: number; x: number };
        priority: number;
        dataDensity: number;
    }> = [];

    // First pass: collect chunks and check cache
    for (let z = zDim.start; z < zDim.end; z++) {
        for (let y = yDim.start; y < yDim.end; y++) {
            for (let x = xDim.start; x < xDim.end; x++) {
                // Skip chunks with zero data overlap
                const xOverlap = calculateChunkOverlap(x, xDimIndex, xDim.sliceStart ?? 0, xDim.sliceEnd ?? xDim.chunkDim, xDim.chunkDim);
                const yOverlap = calculateChunkOverlap(y, yDimIndex, yDim.sliceStart ?? 0, yDim.sliceEnd ?? yDim.chunkDim, yDim.chunkDim);
                const zOverlap = hasZ ? calculateChunkOverlap(z, zDimIndex, zDim.sliceStart ?? 0, zDim.sliceEnd ?? zDim.chunkDim, zDim.chunkDim) : xDim.chunkDim;

                if (xOverlap === 0 || yOverlap === 0 || zOverlap === 0) {
                    continue; // Skip chunks that don't contain any requested data
                }

                const chunkID = `z${z}_y${y}_x${x}`;
                const cacheName = `${cacheBase}_chunk_${chunkID}`;
                const cachedChunk = cache.get(cacheName);
                const isCacheValid = cachedChunk &&
                                    cachedChunk.kernel.kernelSize === (coarsen ? kernelSize : undefined) &&
                                    cachedChunk.kernel.kernelDepth === (coarsen ? kernelDepth : undefined);

                if (!isCacheValid) {
                    const priority = calculateChunkPriority(z, y, x);
                    const dataDensity = (xOverlap / xDim.chunkDim) * (yOverlap / yDim.chunkDim) * (hasZ ? zOverlap / zDim.chunkDim : 1);

                    chunksToFetch.push({
                        chunkID,
                        cacheName,
                        coords: { z, y, x },
                        priority,
                        dataDensity
                    });
                }
            }
        }
    }

    // Sort chunks by priority (highest first) for optimal fetching order
    chunksToFetch.sort((a, b) => b.priority - a.priority);

    // Batch fetch chunks in parallel with dynamic batch sizing
    // Use smaller batches for high-priority chunks, larger for lower priority
    const baseBatchSize = 10;
    let currentBatchSize = baseBatchSize;

    console.log(`Fetching ${chunksToFetch.length} chunks (skipped ${totalChunks - chunksToFetch.length} cached/empty chunks)`);

    for (let i = 0; i < chunksToFetch.length; i += currentBatchSize) {
        // Adjust batch size based on remaining chunks and priority
        const remainingChunks = chunksToFetch.length - i;
        currentBatchSize = Math.min(baseBatchSize, remainingChunks);

        // For high-priority chunks (first 20%), use smaller batches for better responsiveness
        if (i < chunksToFetch.length * 0.2) {
            currentBatchSize = Math.min(5, currentBatchSize);
        }

        const batch = chunksToFetch.slice(i, i + currentBatchSize);

        // Start all fetches in this batch
        const fetchPromises = batch.map(chunk => {
            const { z, y, x } = chunk.coords;
            return fetcher.fetchChunk({ variable: targetVariable, rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D });
        });

        // Wait for all in batch to complete
        const results = await Promise.all(fetchPromises);

        // Process results in order
        for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const raw = results[j];
            const { z, y, x } = chunk.coords;
            
            const rawData = Number.isFinite(fillValue) ? raw.data.map((v: number) => v === fillValue ? NaN : v) : raw.data;

            const [tempChunkF16, newScalingFactor] = ToFloat16(rawData, scalingFactor);
            let chunkF16 = tempChunkF16;
            let thisShape = raw.shape;
            let chunkStride = raw.stride;

            if (coarsen) {
                chunkF16 = await Convolve(chunkF16, { shape: chunkShape, strides: chunkStride }, "Mean3D", { kernelSize, kernelDepth }) as Float16Array;
                thisShape = thisShape.map((dim, idx) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)));
                chunkF16 = coarsen3DArray(chunkF16, chunkShape as [number, number, number], chunkStride.slice(-3) as [number, number, number], kernelSize, kernelDepth, thisShape.reduce((a, b) => a * b, 1));
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
                copyChunkToArray(chunkF16, thisShape.slice(-3), chunkStride.slice(-3), typedArray, outputShape, destStride, [z, y, x], [zDim.start, yDim.start, xDim.start]);
            } else {
                copyChunkToArray2D(chunkF16, thisShape, chunkStride, typedArray, outputShape, destStride, [y, x], [yDim.start, xDim.start]);
            }

            cache.set(chunk.cacheName, {
                data: compress ? CompressArray(chunkF16, 7) : chunkF16,
                shape: chunkShape, stride: chunkStride,
                scaling: scalingFactor, compressed: compress, coarsened: coarsen,
                kernel: { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined }
            });
            rescaleIDs.push(chunk.chunkID);
            
            setProgress(Math.round(iter++ / totalChunks * 100));
        }
    }

    setProgress(0);
    return { data: typedArray, shape: outputShape, dtype, scalingFactor };
}