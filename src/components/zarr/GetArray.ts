import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useErrorStore } from "@/GlobalStates/ErrorStore";
import { calculateStrides } from "@/utils/HelperFuncs";
import { ToFloat16, CompressArray, DecompressArray, copyChunkToArray, RescaleArray, copyChunkToArray2D } from "./utils";
import { NCFetcher, zarrFetcher } from "./dataFetchers";
import { Convolve, Convolve2D } from "../computation/webGPU";
import { coarsen3DArray } from "@/utils/HelperFuncs";

export async function GetArray(varOveride?: string) {
    const { idx4D, initStore, variable, setProgress, setStrides, setStatus } = useGlobalStore.getState();
    const { compress, xSlice, ySlice, zSlice, ndSlices, axisMapping, coarsen, kernelSize, kernelDepth, fetchNC, setCurrentChunks, setArraySize } = useZarrStore.getState();
    const { cache } = useCacheStore.getState();
    const useNC = initStore.startsWith("local") && fetchNC // In case a user has NetCDF switched but then goes to a remote
    const fetcher = useNC ? NCFetcher() : zarrFetcher()
    const targetVariable = varOveride ?? variable;
    const meta = await fetcher.getMetadata(targetVariable);
    const { shape, chunkShape, fillValue, dtype } = meta;
    const rank = shape.length;
    const hasZ = axisMapping.z >= 0;
    const xDimIndex = axisMapping.x >= 0 ? axisMapping.x : rank - 1;
    const yDimIndex = axisMapping.y >= 0 ? axisMapping.y : rank - 2;
    const zDimIndex = axisMapping.z >= 0 ? axisMapping.z : -1;

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

    const scalarIndices = (ndSlices && ndSlices.length > 0) ? ndSlices.filter(s => typeof s === "number").join("_") : (idx4D ?? "");
    const cacheBase = scalarIndices !== "" ? `${initStore}_${targetVariable}_${scalarIndices}` : `${initStore}_${targetVariable}`;

    setStatus("Downloading...");
    setProgress(0);

    for (let z = zDim.start; z < zDim.end; z++) {
        for (let y = yDim.start; y < yDim.end; y++) {
            for (let x = xDim.start; x < xDim.end; x++) {
                const chunkID = `z${z}_y${y}_x${x}`;
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
                            [zDim.chunkDim, yDim.chunkDim, xDim.chunkDim],
                            [zSlice[0], ySlice[0], xSlice[0]]
                        )
                    } else {
                        copyChunkToArray2D(
                            chunkData, 
                            cachedChunk.shape, 
                            cachedChunk.stride, 
                            typedArray, 
                            outputShape, 
                            destStride as any, [y, x], 
                            [yDim.chunkDim, xDim.chunkDim],
                            [ySlice[0], xSlice[0]]
                        )
                    }
                } else {
                    const raw = await fetcher.fetchChunk({ variable:targetVariable, rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D, ndSlices, axisMapping });
                    
                    const rawData = Number.isFinite(fillValue) ? raw.data.map((v: number) => v === fillValue ? NaN : v) : raw.data; // Don't map if no fillvalue

                    let [chunkF16, newScalingFactor] = ToFloat16(rawData, scalingFactor);
                    
                    // Determine which indices in raw.shape map to Z, Y, X
                    const activeDims: number[] = [];
                    for (let i = 0; i < rank; i++) {
                        if (ndSlices && ndSlices.length === rank) {
                            if (i === xDimIndex || i === yDimIndex || i === zDimIndex || Array.isArray(ndSlices[i])) {
                                activeDims.push(i);
                            }
                        } else {
                            if (i === xDimIndex || i === yDimIndex || i === zDimIndex) {
                                activeDims.push(i);
                            }
                        }
                    }

                    const zIndexInRaw = activeDims.indexOf(zDimIndex);
                    const yIndexInRaw = activeDims.indexOf(yDimIndex);
                    const xIndexInRaw = activeDims.indexOf(xDimIndex);

                    let thisShape = hasZ ? [raw.shape[zIndexInRaw], raw.shape[yIndexInRaw], raw.shape[xIndexInRaw]] : [raw.shape[yIndexInRaw], raw.shape[xIndexInRaw]];
                    let chunkStride = hasZ ? [raw.stride[zIndexInRaw], raw.stride[yIndexInRaw], raw.stride[xIndexInRaw]] : [raw.stride[yIndexInRaw], raw.stride[xIndexInRaw]];

                    if (coarsen) {
                        const origShape = [...thisShape];
                        if (hasZ) {
                            chunkF16 = await Convolve(chunkF16, { shape: origShape, strides: chunkStride }, "Mean3D", { kernelSize, kernelDepth }) as Float16Array;
                            thisShape = origShape.map((dim, idx) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)));
                            chunkF16 = coarsen3DArray(chunkF16, origShape as [number, number, number], chunkStride as [number, number, number], kernelSize, kernelDepth, thisShape.reduce((a, b) => a * b, 1));
                        } else {
                            chunkF16 = await Convolve2D(chunkF16, { shape: origShape, strides: chunkStride }, "Mean2D", kernelSize) as Float16Array;
                            thisShape = origShape.map((dim, idx) => Math.floor(dim / kernelSize));
                            const paddedShape = [1, origShape[0], origShape[1]] as [number, number, number];
                            const paddedStride = [1, chunkStride[0], chunkStride[1]] as [number, number, number];
                            chunkF16 = coarsen3DArray(chunkF16, paddedShape, paddedStride, kernelSize, 1, thisShape.reduce((a, b) => a * b, 1));
                        }
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
                        copyChunkToArray(
                            chunkF16, thisShape.slice(-3), chunkStride.slice(-3) as any, 
                            typedArray, outputShape, destStride as any, [z, y, x], 
                            [zDim.chunkDim, yDim.chunkDim, xDim.chunkDim],
                            [zSlice[0], ySlice[0], xSlice[0]]
                        );
                    } else {
                        copyChunkToArray2D(
                            chunkF16, thisShape, chunkStride as any, 
                            typedArray, outputShape, destStride as any, [y, x], 
                            [yDim.chunkDim, xDim.chunkDim],
                            [ySlice[0], xSlice[0]]
                        );
                    }

                    cache.set(cacheName, {
                        data: compress ? CompressArray(chunkF16, 7) : chunkF16,
                        shape: thisShape, stride: chunkStride,
                        scaling: scalingFactor, compressed: compress, coarsened: coarsen,
                        kernel: { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined },
                        fullChunkDim: [zDim.chunkDim, yDim.chunkDim, xDim.chunkDim],
                        sliceStart: [zSlice[0] ?? 0, ySlice[0] ?? 0, xSlice[0] ?? 0]
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