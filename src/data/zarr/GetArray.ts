import { calculateStrides } from "@/lib/helpers";
import { useCacheStore } from "@/stores/CacheStore";
import { useErrorStore } from "@/stores/ErrorStore";
import { useGlobalStore } from "@/stores/GlobalStore";
import { usePlotStore } from "@/stores/PlotStore";
import { useZarrStore } from "@/stores/ZarrStore";
import { getPool } from "@/workers/pool";
import { NCFetcher, Selection, zarrFetcher } from "./dataFetchers";

type Range = [number, number];

export async function GetArray(varOveride?: string) {
    const { idx4D, initStore, variable, setProgress, setStrides, setStatus } = useGlobalStore.getState();
    const { compress, ndSlices, axisMapping, coarsen, kernelSize, kernelDepth, useNC, setCurrentChunks, setArraySize } = useZarrStore.getState();
    const { cache } = useCacheStore.getState();
    const fetcher = useNC ? NCFetcher() : zarrFetcher();
    const targetVariable = (varOveride ?? variable) as string;
    const { shape, chunkShape, fillValue, dtype } = await fetcher.getMetadata(targetVariable);
    const rank = shape.length;
    const pool = getPool();

    // Explicit mappings first (-1 if unmapped/NaN), then fill gaps with
    // the remaining dims from last to first, in x, y, z order.
    const mapped = [axisMapping.x, axisMapping.y, axisMapping.z]
        .map(v => (Number.isInteger(v) && v >= 0 ? v : -1));
    const free = Array.from({ length: rank }, (_, i) => rank - 1 - i)
        .filter(i => !mapped.includes(i));
    const [xDimIndex, yDimIndex, zDimIndex] = mapped.map(m => (m >= 0 ? m : free.shift() ?? -1));
    const hasZ = zDimIndex >= 0;

    // Everything below is in [z, y, x] order. A missing z is a length-1 dim.
    const dims = [zDimIndex, yDimIndex, xDimIndex];
    const extents = dims.map(d => (d >= 0 ? shape[d] : 1));
    const chunkDims = dims.map(d => (d >= 0 ? chunkShape[d] : 1));
    const kernels = coarsen ? [hasZ ? kernelDepth : 1, kernelSize, kernelSize] : [1, 1, 1];
    // ndSlices is in datashape order; a null end means "to the end"
    const slices = dims.map((d, i): Range => (d >= 0 ? [ndSlices[d]?.[0] ?? 0, ndSlices[d]?.[1] ?? extents[i]] : [0, 1]));
    const [zSlice, ySlice, xSlice] = slices;
    // Carry slices to stores so we know what to slice from the axisDimarrays
    usePlotStore.setState({ xSlice, ySlice, zSlice });
    useZarrStore.setState({ xSlice, ySlice, zSlice });

    const sizes = slices.map(([lo, hi], i) => Math.floor((hi - lo) / kernels[i]));
    const outputShape = hasZ ? sizes : sizes.slice(1);
    const totalElements = outputShape.reduce((a, b) => a * b, 1);
    if (totalElements > 1e9) {
        useErrorStore.getState().setError("largeArray");
        throw new Error("Cannot allocate array. Details printed to console.");
    }
    setStrides(calculateStrides(outputShape));
    setArraySize(totalElements);

    // Chunk grid range covering the request, per dim
    const [zChunks, yChunks, xChunks] = slices.map(([lo, hi], i): Range => [Math.floor(lo / chunkDims[i]), Math.ceil(hi / chunkDims[i])]);
    setCurrentChunks({ x: xChunks, y: yChunks, z: zChunks }); // These are used in GetCurrentArray() function
    // Where the output array starts, in (coarsened) absolute coordinates
    const sliceStart = slices.map(([lo], i) => lo / kernels[i]);

    const scalarIndices = (ndSlices && ndSlices.length > 0) ? ndSlices.filter(s => typeof s === "number").join("_") : "";
    let cacheBase = scalarIndices !== "" ? `${initStore}_${targetVariable}_${scalarIndices}` : `${initStore}_${targetVariable}`;
    if (rank >= 4 && idx4D !== undefined && idx4D !== null) {
        cacheBase = `${cacheBase}_time${idx4D}`;
    }

    // Selection for the non-plotted dims. Plotted dims are overwritten per chunk.
    const baseSelection: Selection = Array.from({ length: rank }, (_, i) => {
        const s = ndSlices?.[i] as Range | number | undefined;
        if (dims.includes(i)) return [0, shape[i]];
        if (Array.isArray(s)) return [s[0], s[1] ?? shape[i]];
        return s ?? (rank >= 4 && i === 0 ? idx4D ?? 0 : 0);
    });
    // Scalar dims are collapsed by the fetch, so a dim's index in the raw shape
    // is the number of range dims before it
    const rawIndex = (d: number) => (d < 0 ? -1 : baseSelection.slice(0, d).filter(s => Array.isArray(s)).length);
    const indices = { zIndexInRaw: rawIndex(zDimIndex), yIndexInRaw: rawIndex(yDimIndex), xIndexInRaw: rawIndex(xDimIndex) };
    const kernelInfo = { kernelDepth, kernelSize };
    const kernel = { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined };

    setStatus("Downloading...");
    setProgress(0);
    const totalChunks = (zChunks[1] - zChunks[0]) * (yChunks[1] - yChunks[0]) * (xChunks[1] - xChunks[0]);
    let done = 0;
    const chunkScalingFactors: Record<string, number | undefined> = {};
    const jobs: Promise<void>[] = [];
    const minVals: number[] = []; const maxVals: number[] = [];
    try {
        for (let z = zChunks[0]; z < zChunks[1]; z++) {
            for (let y = yChunks[0]; y < yChunks[1]; y++) {
                for (let x = xChunks[0]; x < xChunks[1]; x++) {
                    const chunkID = `z${z}_y${y}_x${x}`;
                    const cacheName = `${cacheBase}_chunk_${chunkID}`;
                    const cached = cache.get(cacheName);
                    if (cached?.complete &&
                        cached.kernel.kernelSize === kernel.kernelSize &&
                        cached.kernel.kernelDepth === kernel.kernelDepth) {
                        cache.set(cacheName, { ...cached, sliceStart });
                        chunkScalingFactors[chunkID] = cached.scaling;
                        setProgress(Math.round(++done / totalChunks * 100));
                        continue;
                    }
                    // Only fetch the part of the chunk that overlaps the request
                    const bounds = [z, y, x].map((c, i): Range => [c * chunkDims[i], Math.min((c + 1) * chunkDims[i], extents[i])]);
                    const piece = bounds.map(([lo, hi], i): Range => [Math.max(lo, slices[i][0]), Math.min(hi, slices[i][1])]);
                    const complete = piece.every(([lo, hi], i) => lo === bounds[i][0] && hi === bounds[i][1]);
                    const selection = [...baseSelection];
                    dims.forEach((d, i) => { if (d >= 0) selection[d] = piece[i]; });

                    const raw = await fetcher.fetchChunk(targetVariable, selection);
                    jobs.push(pool.dispatch('processChunk',
                        { raw, coarsen, compress, hasZ, kernelInfo, indices, scalingFactor: undefined, fillValue },
                        [raw.data.buffer]
                    ).then(({ chunkF16, thisShape, chunkStride, newScalingFactor, range }) => {
                        chunkScalingFactors[chunkID] = newScalingFactor;
                        minVals.push(range.min)
                        maxVals.push(range.max)
                        cache.set(cacheName, {
                            data: chunkF16,
                            shape: thisShape.slice(-3), stride: chunkStride.slice(-3),
                            scaling: newScalingFactor, compressed: compress, coarsened: coarsen, kernel,
                            origin: piece.map(([lo], i) => lo / kernels[i]),
                            sliceStart,
                            complete,
                        });
                        setProgress(Math.round(++done / totalChunks * 100));
                    }));
                }
            }
        }
        await Promise.all(jobs);
    } finally {
        setProgress(0);
    }

    // --- CHUNK SCALING --- //
    // Bring every chunk up to the largest scaling factor so they share one scale
    const factors = Object.values(chunkScalingFactors).map(f => f ?? 0);
    const maxScaling = factors.length > 0 ? Math.max(...factors) : 0;
    await Promise.all(Object.entries(chunkScalingFactors)
        .filter(([, f]) => (f ?? 0) !== maxScaling)
        .map(async ([id, f]) => {
            const cacheName = `${cacheBase}_chunk_${id}`;
            const chunk = cache.get(cacheName);
            const {data, compressed} = chunk
            const { array } = await pool.dispatch('rescaler', { array: data, delta: maxScaling - (f ?? 0), compressed }, [data.buffer]);
            cache.set(cacheName, { ...chunk, data: array, scaling: maxScaling });
        }));
    const scalingFactor = maxScaling !== 0 ? maxScaling : undefined;
    const maxVal = maxVals.reduce((a, b) => Math.max(a, b), -Infinity); 
    const minVal = minVals.reduce((a, b) => Math.min(a, b), Infinity);
    return { shape: outputShape, indices: hasZ ? [zDimIndex, yDimIndex, xDimIndex] : [yDimIndex, xDimIndex], dtype, scalingFactor, valueScale: {minVal, maxVal} };
}
