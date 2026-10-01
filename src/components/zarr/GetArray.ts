import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useErrorStore } from "@/GlobalStates/ErrorStore";
import { calculateStrides } from "@/utils/HelperFuncs";
import { ToFloat16, CompressArray, RescaleArray } from "./utils";
import { NCFetcher, zarrFetcher } from "./dataFetchers";
import { Convolve } from "../computation/webGPU";
import { coarsen3DArray } from "@/utils/HelperFuncs";
import { usePlotStore } from "@/GlobalStates/PlotStore";

function getChunkRange(chunkShape: number[], chunkLoc: number[], mapping: number[], ndSlices:[number, number][]): [number, number][]{
    let chunkStarts: number[] = Array.from({length: ndSlices.length})
    let chunkEnds: number[] = Array.from({length: ndSlices.length});
    mapping.forEach((val, idx) => {
        const start = chunkShape[val] * chunkLoc[idx];
        chunkStarts[val] = Math.max(start, ndSlices[val][0]);
        chunkEnds[val] = Math.min(start + chunkShape[val], ndSlices[val][1]);
    });
    chunkStarts = chunkStarts.map((val,idx) => val?? ndSlices[idx][0])
    chunkEnds = chunkEnds.map((val,idx) => val?? chunkStarts[idx] + 1)
    return chunkStarts.map((start,idx) => [start, chunkEnds[idx]])
}

function isCompleteChunk(chunkRanges:[number, number][], ndSlices:[number, number][]): boolean {
    return chunkRanges.every((val, idx) => val[0] <= ndSlices[idx][0]) &&
            chunkRanges.every((val, idx) => val[1] >= ndSlices[idx][1])
}

export async function GetArray(varOveride?: string) {
    const { idx4D, initStore, variable, setProgress, setStrides, setStatus } = useGlobalStore.getState();
    const { compress, ndSlices, axisMapping, coarsen, kernelSize, kernelDepth, useNC, setCurrentChunks, setArraySize } = useZarrStore.getState();
    const { cache } = useCacheStore.getState();
    const fetcher = useNC ? NCFetcher() : zarrFetcher()
    const targetVariable = varOveride ?? variable;
    const meta = await fetcher.getMetadata(targetVariable as string);
    const { shape, chunkShape, fillValue, dtype } = meta;
    const rank = shape.length;
    // Explicit mappings first (-1 if unmapped/NaN), then fill gaps with
    // the remaining dims from last to first, in x, y, z order.
    const mapped = [axisMapping.x, axisMapping.y, axisMapping.z]
        .map(v => (Number.isInteger(v) && v >= 0 ? v : -1));
    const free = Array.from({ length: rank }, (_, i) => rank - 1 - i)
        .filter(i => !mapped.includes(i));
    const [xDimIndex, yDimIndex, zDimIndex] = mapped.map(m => (m >= 0 ? m : free.shift() ?? -1));
    const hasZ = zDimIndex >= 0;

    // ndSlices is in datashape order, so a dim's slice is just ndSlices[dim]
    const sliceOf = (dimIdx: number): [number, number] => (dimIdx >= 0 ? ndSlices[dimIdx] : [0, 1]);
    const xSlice = sliceOf(xDimIndex);
    const ySlice = sliceOf(yDimIndex);
    const zSlice = sliceOf(zDimIndex);

    // Carry slices to stores so we know what to slice from the axisDimarrays
    usePlotStore.setState({ xSlice, ySlice, zSlice });
    useZarrStore.setState({ xSlice, ySlice, zSlice });

    const calcDim = (dimIdx: number) => {
        if (dimIdx < 0) return { start: 0, end: 1, size: 0, chunkDim: 1, offset: 0 };
        const [lo, hi] = ndSlices[dimIdx];
        const chunkDim = chunkShape[dimIdx];
        return {
            start: Math.floor(lo / chunkDim),
            end: Math.ceil(hi / chunkDim),
            size: hi - lo,
            chunkDim,
            offset: lo % chunkDim,
        };
    };
    const xDim = calcDim(xDimIndex);
    const yDim = calcDim(yDimIndex);
    const zDim = calcDim(zDimIndex);

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

    let scalingFactor: number | undefined;
    const totalChunks = (zDim.end - zDim.start) * (yDim.end - yDim.start) * (xDim.end - xDim.start);
    let iter = 1;
    const rescaleIDs: string[] = [];

    const scalarIndices = (ndSlices && ndSlices.length > 0) ? ndSlices.filter(s => typeof s === "number").join("_") : "";
    let cacheBase = scalarIndices !== "" ? `${initStore}_${targetVariable}_${scalarIndices}` : `${initStore}_${targetVariable}`;
    if (rank >= 4 && idx4D !== undefined && idx4D !== null) {
        cacheBase = `${cacheBase}_time${idx4D}`;
    }

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

    setStatus("Downloading...");
    setProgress(0);
    for (let z = zDim.start; z < zDim.end; z++) {
        for (let y = yDim.start; y < yDim.end; y++) {
            for (let x = xDim.start; x < xDim.end; x++) {
                const chunkID = `z${z}_y${y}_x${x}`;
                const cacheName = `${cacheBase}_chunk_${chunkID}`;
                const cachedChunk = cache.get(cacheName);
                console.log(cachedChunk?.complete)
                const isCacheValid = cachedChunk && cachedChunk.complete &&
                                    cachedChunk.kernel.kernelSize === (coarsen ? kernelSize : undefined) &&
                                    cachedChunk.kernel.kernelDepth === (coarsen ? kernelDepth : undefined);

                if (isCacheValid) {
                    continue;
                } else {
                    const mapping = [axisMapping.z, axisMapping.y, axisMapping.x].slice(-Math.min(3, shape.length))
                    const chunkRanges = getChunkRange(chunkShape, [z,y,x], mapping, ndSlices as [number, number][]);
                    console.log(chunkRanges, ndSlices)
                    const completeChunk = isCompleteChunk(chunkRanges, ndSlices as [number, number][]);
                    const raw = await fetcher.fetchChunk({ 
                        variable:(targetVariable as string), 
                        chunkRanges, 
                        ndSlices, 
                        mapping
                    });
                    const rawData = Number.isFinite(fillValue) ? raw.data.map((v: number) => v === fillValue ? NaN : v) : raw.data; // Don't map if no fillvalue

                    let [chunkF16, newScalingFactor] = ToFloat16(rawData, scalingFactor);

                    let thisShape = hasZ ? [raw.shape[zIndexInRaw], raw.shape[yIndexInRaw], raw.shape[xIndexInRaw]] : [raw.shape[yIndexInRaw], raw.shape[xIndexInRaw]];
                    let chunkStride = hasZ ? [raw.stride[zIndexInRaw], raw.stride[yIndexInRaw], raw.stride[xIndexInRaw]] : [raw.stride[yIndexInRaw], raw.stride[xIndexInRaw]];

                    if (coarsen) {
                        const origShape = [...thisShape];
                        if (hasZ) {
                            chunkF16 = await Convolve(chunkF16, { shape: origShape, strides: chunkStride }, { kernelSize, kernelDepth }) as Float16Array;
                            thisShape = origShape.map((dim, idx) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)));
                            chunkF16 = coarsen3DArray(chunkF16, origShape as [number, number, number], chunkStride as [number, number, number], kernelSize, kernelDepth, thisShape.reduce((a, b) => a * b, 1));
                        } else {
                            chunkF16 = await Convolve(chunkF16, { shape: origShape, strides: chunkStride }, { kernelSize, kernelDepth:1 }) as Float16Array;
                            thisShape = origShape.map((dim, idx) => Math.floor(dim / kernelSize));
                            const paddedShape = [1, origShape[0], origShape[1]] as [number, number, number];
                            const paddedStride = [1, chunkStride[0], chunkStride[1]] as [number, number, number];
                            chunkF16 = coarsen3DArray(chunkF16, paddedShape, paddedStride, kernelSize, 1, thisShape.reduce((a, b) => a * b, 1));
                        }
                        chunkStride = calculateStrides(thisShape);
                    }

                    if (newScalingFactor != null && newScalingFactor !== scalingFactor) {
                        const delta = scalingFactor ? newScalingFactor - scalingFactor : newScalingFactor;
                        scalingFactor = newScalingFactor;
                        for (const id of rescaleIDs) {
                            const tempChunk = cache.get(`${cacheBase}_chunk_${id}`);
                            tempChunk.scaling = scalingFactor;
                            RescaleArray(tempChunk.data, delta);
                            cache.set(`${cacheBase}_chunk_${id}`, tempChunk);
                        }
                    }
                    cache.set(cacheName, {
                        data: compress ? CompressArray(chunkF16, 7) : chunkF16,
                        shape: thisShape.slice(-3), stride: chunkStride.slice(-3),
                        scaling: scalingFactor, compressed: compress, coarsened: coarsen,
                        kernel: { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined },
                        fullChunkDim: [zDim.chunkDim, yDim.chunkDim, xDim.chunkDim],
                        sliceStart: [zSlice[0], ySlice[0], xSlice[0]],
                        complete:completeChunk
                    });
                    rescaleIDs.push(chunkID);
                }
                setProgress(Math.round(iter++ / totalChunks * 100));
            }
            }
    }
    setProgress(0);
    return { shape: outputShape, indices: hasZ ? [zDimIndex, yDimIndex, xDimIndex] : [yDimIndex, xDimIndex], dtype, scalingFactor };
}