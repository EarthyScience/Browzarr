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
    // Identify which dimensions are already explicitly mapped
    const parseMapped = (val: any) => typeof val === 'number' && !isNaN(val) && val >= 0 ? val : -1;
    const mappedX = parseMapped(axisMapping.x);
    const mappedY = parseMapped(axisMapping.y);
    const mappedZ = parseMapped(axisMapping.z);
    
    const mappedDims = new Set([mappedX, mappedY, mappedZ].filter(v => v >= 0));
    const unmappedDims: number[] = [];
    for (let i = rank - 1; i >= 0; i--) {
        if (!mappedDims.has(i)) unmappedDims.push(i);
    }

    const xDimIndex = mappedX >= 0 ? mappedX : (unmappedDims.length > 0 ? unmappedDims.shift()! : rank - 1);
    const yDimIndex = mappedY >= 0 ? mappedY : (unmappedDims.length > 0 ? unmappedDims.shift()! : rank - 2);
    const zDimIndex = mappedZ >= 0 ? mappedZ : (unmappedDims.length > 0 ? unmappedDims.shift()! : -1);

    const hasZ = zDimIndex >= 0;

    const calcDim = (slice: [number, number | null], dimIdx: number) => { 
        if (dimIdx < 0) return { start: 0, end: 1, size: 0, chunkDim: 1 };
        const dimSize = shape[dimIdx];
        const chunkDim = chunkShape[dimIdx];
        const start = Math.floor(slice[0] / chunkDim);
        const sliceEnd = slice[1] ?? dimSize;
        return { start, end: Math.ceil(sliceEnd / chunkDim), size: sliceEnd - slice[0], chunkDim, offset: slice[0] % chunkDim };
    };

    // If an axis is unmapped in the UI (NaN), we MUST fetch it as a scalar (size 1) 
    // using the collapsed value from ndSlices. Otherwise, it defaults to [0, null] 
    // and fetches the entire dimension, leading to massive memory requests (OOM).
    const getEffectiveSlice = (mappingIdx: number, dimIdx: number, uiSlice: [number, number | null]): [number, number | null] => {
        if (mappingIdx >= 0) return uiSlice; // Axis is mapped, use the UI slice
        
        if (dimIdx >= 0 && ndSlices && ndSlices[dimIdx] !== undefined) {
            const sel = ndSlices[dimIdx];
            if (typeof sel === 'number') return [sel, sel + 1];
            if (Array.isArray(sel)) return sel as [number, number | null];
        }
        return [0, 1]; // Safe fallback to scalar
    };

    const xDim = calcDim(getEffectiveSlice(axisMapping.x, xDimIndex, xSlice), xDimIndex);
    const yDim = calcDim(getEffectiveSlice(axisMapping.y, yDimIndex, ySlice), yDimIndex);
    const zDim = calcDim(getEffectiveSlice(axisMapping.z, zDimIndex, zSlice), zDimIndex);

    let outputShape = hasZ ? [zDim.size, yDim.size, xDim.size] : [yDim.size, xDim.size];
    if (coarsen) {
        outputShape = outputShape.map((dim, idx) => Math.floor(dim / (hasZ && idx === 0 ? kernelDepth : kernelSize)));
    }

    const totalElements = outputShape.reduce((a, b) => a * b, 1);
    if (totalElements > 1e9) { 
        useErrorStore.getState().setError("largeArray"); 
        throw new Error("Cannot allocate array. Details printed to console."); 
    }

    const destStride = calculateStrides(outputShape);
    setStrides(destStride);
    setArraySize(totalElements);
    setCurrentChunks({ x: [xDim.start, xDim.end], y: [yDim.start, yDim.end], z: [zDim.start, zDim.end] }); // These are used in GetCurrentArray() function

    const typedArray = new Float16Array(totalElements);

    let scalingFactor: number | null = null;
    const totalChunks = (zDim.end - zDim.start) * (yDim.end - yDim.start) * (xDim.end - xDim.start);
    let iter = 1;
    const rescaleIDs: string[] = [];

    const scalarIndices = (ndSlices && ndSlices.length > 0) ? ndSlices.filter(s => typeof s === "number").join("_") : "";
    let cacheBase = scalarIndices !== "" ? `${initStore}_${targetVariable}_${scalarIndices}` : `${initStore}_${targetVariable}`;
    if (rank >= 4 && idx4D !== undefined && idx4D !== null) {
        cacheBase = `${cacheBase}_time${idx4D}`;
    }

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
                    const chunkData = cachedChunk.compressed ? DecompressArray(cachedChunk.data) : new Float16Array(cachedChunk.data);
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
                        shape: thisShape.filter((val)=> val > 1), stride: chunkStride,
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
    return { data: typedArray, shape: outputShape, indices: hasZ ? [zDimIndex, yDimIndex, xDimIndex] : [yDimIndex, xDimIndex], dtype, scalingFactor };
}