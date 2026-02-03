import { useZarrStore, useCacheStore, useGlobalStore, useErrorStore } from "@/GlobalStates"
import { ToFloat16, CompressArray, DecompressArray, copyChunkToArray, RescaleArray } from "./ZarrLoaderLRU";
import { Convolve } from "../computation/webGPU";
import {coarsen3DArray, calculateStrides} from '@/utils/HelperFuncs'

export async function GetNCDims(variable: string){
    const {ncModule} = useZarrStore.getState()
    const {cache} = useCacheStore.getState();
    const {initStore} = useGlobalStore.getState();
    const cacheName = `${initStore}_${variable}_meta`
    const dimNames = []
    const dimArrays = []
    const dimUnits = []
    if (cache.has(cacheName)){
        const meta = cache.get(cacheName)
        for (const dim of meta.dims){
            dimNames.push(dim.name)
            const dimArray = cache.get(`${initStore}_${dim.name}`)
            dimArrays.push(dimArray ?? [0]) // guard against missing cached arrays, though this should not happen
            dimUnits.push(dim?.units ?? null) // guards against missing cached metadata
        }
        return {dimNames: dimNames??Array(meta.shape.length).fill("Default"), dimArrays, dimUnits};
    }
    const varInfo = await ncModule.getVariableInfo(variable)
    const {dims} = varInfo
    for (const dim of dims){
        dimNames.push(dim.name)
        dimUnits.push(dim.units)
        const dimArray = await ncModule.getVariableArray(dim.id)
        dimArrays.push(dimArray)
        cache.set(`${initStore}_${dim.name}`, dimArray);
    }
    return {dimNames, dimArrays, dimUnits};
}

export async function GetNCMetadata(thisVariable? : string){
    const {ncModule} = useZarrStore.getState();
    const {cache} = useCacheStore.getState();
    const {initStore, variable} = useGlobalStore.getState();
    const cacheName = `${initStore}_${thisVariable?? variable}_meta`
    const meta = await ncModule.getVariableInfo(thisVariable?? variable);
    cache.set(cacheName, meta);
    return meta
}

export async function GetNCArray() {
    const {is4D, idx4D, initStore, variable, setProgress, setStrides, setStatus} = useGlobalStore.getState();
	const {compress, xSlice, ySlice, zSlice, ncModule, coarsen, kernelDepth, kernelSize, setCurrentChunks, setArraySize} = useZarrStore.getState()
	const {cache} = useCacheStore.getState();

    const varInfo = await ncModule.getVariableInfo(variable)
    const {shape} = varInfo
    const chunkShape = is4D 
        ? [varInfo.chunks[1], varInfo.chunks[2], varInfo.chunks[3]]
        : varInfo.chunks
    const is2D = shape.length === 2;
    const zIndexOffset = is4D ? 1 : 0;
    const atts = varInfo.attributes
    let fillValue = NaN
    if ("missing_value" in atts){
        fillValue = !Number.isNaN(atts["missing_value"][0]) ? atts["missing_value"][0] : fillValue
    }
    if ("_FillValue" in atts){
        fillValue = !Number.isNaN(atts["_FillValue"][0]) ? atts["_FillValue"][0] : fillValue
    }

    const calcDim = (slice: [number, number | null], dimIdx: number, chunkDim: number) => {
        const totalChunks = Math.ceil(shape[dimIdx + zIndexOffset] / chunkDim);
        const start = Math.floor(slice[0] / chunkDim);
        const end = slice[1] ? Math.ceil(slice[1] / chunkDim) : totalChunks;
        const size = (slice[1] ? slice[1] : shape[dimIdx + zIndexOffset]) - slice[0];
        return { start, end, size };
    };

    const xDim = calcDim(xSlice, 2, chunkShape[2]);
    const yDim = calcDim(ySlice, 1, chunkShape[1]);
    const zDim = is2D ? { start: 0, end: 1, size: 0 } : calcDim(zSlice, 0, chunkShape[0]);

    // Setup Output Array
    let outputShape = is2D ? [yDim.size, xDim.size] : [zDim.size, yDim.size, xDim.size];
    if (coarsen) {
        outputShape = outputShape.map((dim: number, idx: number) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)))
    } 
    const totalElements = outputShape.reduce((a ,b) => a * b, 1)
    const destStride = calculateStrides(outputShape)

    setStrides(destStride);
    if (!is2D) {
        setArraySize(totalElements);
        setCurrentChunks({ x: [xDim.start, xDim.end], y: [yDim.start, yDim.end], z: [zDim.start, zDim.end] }); //These are used to stitch timeseries data 
    }
    if (totalElements > 1e9){
        useErrorStore.getState().setError('largeArray');
        throw Error("Cannot allocate unbroken memory segment for array.")
    }

    const typedArray = new Float16Array(totalElements);

    // State for the loop
    let scalingFactor: number | null = null;
    const totalChunksToLoad = (zDim.end - zDim.start) * (yDim.end - yDim.start) * (xDim.end - xDim.start);
    let iter = 1; // For progress bar
    const rescaleIDs: string[] = [] // These are the downloaded chunks that need to be rescaled

    setStatus("Downloading...");
    setProgress(0);
    for (let z= zDim.start ; z < zDim.end ; z++){ // Iterate through chunks we need 
        for (let y= yDim.start ; y < yDim.end ; y++){
            for (let x= xDim.start ; x < xDim.end ; x++){
                const chunkID = `z${z}_y${y}_x${x}` // Unique ID for each chunk
                const cacheBase = is4D 
                    ? `${initStore}_${variable}_${idx4D}`
                    : `${initStore}_${variable}`
                const cacheName = `${cacheBase}_chunk_${chunkID}`
                const cachedChunk = cache.get(cacheName);

                const isCacheValid = cachedChunk && 
                                    cachedChunk.kernel.kernelSize === (coarsen ? kernelSize : undefined) && // If the data is coarsened. Make sure it's the same as current coarsen. OTherwise refetch
                                    cachedChunk.kernel.kernelDepth === (coarsen ? kernelSize : undefined) ;
                if (isCacheValid){
                    const chunkData = cachedChunk.compressed ? DecompressArray(cachedChunk.data) : cachedChunk.data.slice() // Decompress if needed. Gemini thinks the .slice() helps with garbage collector as it doesn't maintain a reference to the original array
                    copyChunkToArray(
                        chunkData,
                        cachedChunk.shape,
                        cachedChunk.stride,
                        typedArray,
                        outputShape,
                        destStride as [number, number, number],
                        [z,y,x],
                        [zDim.start,yDim.start,xDim.start],
                    )
                    setProgress(Math.round(iter/totalChunksToLoad*100)) // Progress Bar
                    iter ++;
                }
                else{
                    const getStartsAndCounts = () => {
                        if (is4D){
                            const starts = [idx4D, z*chunkShape[0], y*chunkShape[1], x*chunkShape[2]] 
                            //@ts-ignore Starts is same length as new array
                            const counts = [1, ...chunkShape].map((v:number, i:number) =>Math.min(v, shape[i] - starts[i]));
                            return [starts, counts]
                        } else {
                            const starts = [z*chunkShape[0], y*chunkShape[1], x*chunkShape[2]] 
                            const counts = chunkShape.map((v:number, i:number) =>Math.min(v, shape[i] - starts[i]));
                            return [starts, counts]
                        }
                    }
                    const [starts, counts] = getStartsAndCounts();
                    const chunkArray = await ncModule.getSlicedVariableArray(variable, starts, counts)
                    let chunkStride = is4D 
                        ? [counts[3] * counts[2], counts[3], 1] 
                        : [counts[2] * counts[1], counts[2], 1]
                    let thisShape = counts
                    let [chunkF16, newScalingFactor] = ToFloat16(chunkArray.map((v: number) => v === fillValue ? NaN : v), scalingFactor)
                    if (coarsen){
                        chunkF16 = await Convolve(chunkF16, {shape:chunkShape, strides:chunkStride}, "Mean3D", {kernelSize, kernelDepth}) as Float16Array
                        thisShape = thisShape.map((dim: number, idx: number) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)))
                        const newSize = thisShape.reduce((a: number, b: number) => a*b, 1)
                        chunkF16 = coarsen3DArray(chunkF16, chunkShape, chunkStride as [number, number, number], kernelSize, kernelDepth, newSize)
                        chunkStride = calculateStrides(thisShape)
                    }
                    if (newScalingFactor != null && newScalingFactor != scalingFactor){ // If the scalingFactor has changed, need to rescale main array
                        if (scalingFactor == null || newScalingFactor > scalingFactor){ 
                            const thisScaling = scalingFactor ? newScalingFactor - scalingFactor : newScalingFactor
                            RescaleArray(typedArray, thisScaling)
                            scalingFactor = newScalingFactor
                            for (const id of rescaleIDs){ // Set new scalingFactor on the chunks
                                const tempName = `${cacheBase}_chunk_${id}`
                                const tempChunk = cache.get(tempName)
                                tempChunk.scaling = scalingFactor
                                RescaleArray(tempChunk.data, thisScaling)
                                cache.set(tempName, tempChunk)
                            }
                        }
                    }
                    copyChunkToArray(
                        chunkF16,
                        thisShape,
                        chunkStride as [number, number, number],
                        typedArray,
                        outputShape,
                        destStride as [number, number, number],
                        [z,y,x],
                        [zDim.start,yDim.start,xDim.start],
                    )
                    const cacheChunk = {
                        data: compress ? CompressArray(chunkF16, 7) : chunkF16,
                        shape: chunkShape,
                        stride: chunkStride,
                        scaling: scalingFactor,
                        compressed: compress,
                        coarsened: coarsen,
                        kernel: {
                            kernelDepth: coarsen ? kernelDepth : undefined,
                            kernelSize: coarsen ? kernelSize : undefined
                        }
                    }
                    cache.set(cacheName,cacheChunk)
                    setProgress(Math.round(iter/totalChunksToLoad*100)) // Progress Bar
                    iter ++;
                    rescaleIDs.push(chunkID)
                }
            }
        }
    }
    return {
        data: typedArray,
        shape: outputShape,
        dtype: varInfo.dtype,
        scalingFactor
    }

}
