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
    const {idx4D, initStore, variable, setProgress, setStrides, setStatus} = useGlobalStore.getState();
	const {compress, xSlice, ySlice, zSlice, ncModule, coarsen, kernelDepth, kernelSize, setCurrentChunks, setArraySize} = useZarrStore.getState()
	const {cache} = useCacheStore.getState();

    const varInfo = await ncModule.getVariableInfo(variable)
    const { shape, attributes: atts } = varInfo;
    const chunkShape = varInfo.chunks || shape;

    //---- Shape Info ----//
    const rank = shape.length;
    const hasZ = rank >= 3;

    const xDimIndex = rank - 1;
    const yDimIndex = rank - 2;
    const zDimIndex = rank - 3;

    //---- Fill-Value ----//
    let fillValue = NaN
    if ("missing_value" in atts){
        fillValue = !Number.isNaN(atts["missing_value"][0]) ? atts["missing_value"][0] : fillValue
    }
    if ("_FillValue" in atts){
        fillValue = !Number.isNaN(atts["_FillValue"][0]) ? atts["_FillValue"][0] : fillValue
    }

    //---- Dimension Indices to Grab ----//
    const calcDim = (slice: [number, number | null], dimIdx: number) => {
        // Return an empty array if no zIdx
        if (dimIdx < 0) return { start: 0, end: 1, size: 0, chunkDim: 1 };
        const dimSize = shape[dimIdx];
        const chunkDim = chunkShape[dimIdx];
        const start = Math.floor(slice[0] / chunkDim);
        const sliceEnd = slice[1] ?? dimSize; 
        const end = Math.ceil(sliceEnd / chunkDim);
        const size = sliceEnd - slice[0];
        //Chunkdim is the shape of the chunk at that index
        return { start, end, size, chunkDim };
    };

    const xDim = calcDim(xSlice, xDimIndex);
    const yDim = calcDim(ySlice, yDimIndex);
    const zDim = calcDim(zSlice, zDimIndex);

    // Setup Output Array
    let outputShape = hasZ 
        ? [zDim.size, yDim.size, xDim.size] 
        : [yDim.size, xDim.size];
    
    if (coarsen) {
        outputShape = outputShape.map((dim: number, idx: number) => {
            const isDepth = hasZ && idx === 0;
            const kern = isDepth ? kernelDepth : kernelSize;
            return Math.floor(dim / kern)
        })
    } 
    const totalElements = outputShape.reduce((a ,b) => a * b, 1)
    const destStride = calculateStrides(outputShape)

    setStrides(destStride);
    setArraySize(totalElements);
    setCurrentChunks({ x: [xDim.start, xDim.end], y: [yDim.start, yDim.end], z: [zDim.start, zDim.end] }); //These are used to stitch timeseries data 
    
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
                const cacheBase = rank > 3
                    ? `${initStore}_${variable}_${idx4D}`
                    : `${initStore}_${variable}`
                const cacheName = `${cacheBase}_chunk_${chunkID}`
                const cachedChunk = cache.get(cacheName);

                const isCacheValid = cachedChunk && 
                                    cachedChunk.kernel.kernelSize === (coarsen ? kernelSize : undefined) && // If the data is coarsened. Make sure it's the same as current coarsen. Otherwise refetch
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
                        const starts = new Array(rank).fill(0);
                        const counts = new Array(rank).fill(1);
                        if (rank > 3) { //When rank is 4 or 5. The first will always be depth. In the case of 5 that will only be if last dimension is vector variable
                            starts[0] = idx4D; 
                            counts[0] = 1;
                        }
                        starts[xDimIndex] = x * chunkShape[xDimIndex];
                        counts[xDimIndex] = Math.min(chunkShape[xDimIndex], shape[xDimIndex] - starts[xDimIndex]);

                        starts[yDimIndex] = y * chunkShape[yDimIndex];
                        counts[yDimIndex] = Math.min(chunkShape[yDimIndex], shape[yDimIndex] - starts[yDimIndex]);

                        if (zDimIndex >= 0) {
                            starts[zDimIndex] = z * chunkShape[zDimIndex];
                            counts[zDimIndex] = Math.min(chunkShape[zDimIndex], shape[zDimIndex] - starts[zDimIndex]);
                        }
                        return {starts, counts}
                    }
                    const { starts, counts } = getStartsAndCounts();
                    const chunkArray = await ncModule.getSlicedVariableArray(variable, starts, counts)
                    let chunkStride = rank > 3 
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
