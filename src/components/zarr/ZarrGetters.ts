import { useZarrStore, useCacheStore, useGlobalStore, useErrorStore } from "@/GlobalStates";
import * as zarr from 'zarrita';
import { CompressArray, DecompressArray, ZarrError, RescaleArray, ToFloat16, copyChunkToArray } from "./ZarrLoaderLRU";
import { GetSize } from "./GetMetadata";
import { Convolve, Convolve2D } from "../computation/webGPU";
import { coarsen3DArray, calculateStrides } from "@/utils/HelperFuncs";

export async function GetZarrDims(variable: string){
    const {cache} = useCacheStore.getState();
    const {initStore} = useGlobalStore.getState();
    const cacheName = `${initStore}_${variable}_meta`
    const dimArrays = []
    const dimUnits = []
    if (cache.has(cacheName)){
        const meta = cache.get(cacheName)
        const dimNames = meta._ARRAY_DIMENSIONS as string[]
        if (dimNames){
        for (const dim of dimNames){
            const dimArray = cache.get(`${initStore}_${dim}`)
            const dimMeta = cache.get(`${initStore}_${dim}_meta`)
            dimArrays.push(dimArray ?? [0]) // guard against missing cached arrays, though this should not happen
            dimUnits.push(dimMeta?.units ?? null) // guards against missing cached metadata
        }
        } else {
        for (const dimLength of meta.shape){
            dimArrays.push(Array(dimLength).fill(0))
            dimUnits.push("Default")
        }
        }
        return {dimNames: dimNames??Array(meta.shape.length).fill("Default"), dimArrays, dimUnits};
    } 
    const group = await useZarrStore.getState().currentStore
    if (!group) {
        throw new Error(`Failed to open Zarr store: ${initStore}`);
    }
    const outVar = await zarr.open(group.resolve(variable), {kind:"array"});
    const meta = outVar.attrs;
    meta.shape = outVar.shape;
    cache.set(cacheName, meta);
    const dimNames = meta._ARRAY_DIMENSIONS as string[]
    if (dimNames){
        for (const dim of dimNames){
        const dimArray = await zarr.open(group.resolve(dim), {kind:"array"})
            .then((result) => zarr.get(result));
        const dimMeta = await zarr.open(group.resolve(dim), {kind:"array"})
            .then((result) => result.attrs)
        cache.set(`${initStore}_${dim}`, dimArray.data);
        cache.set(`${initStore}_${dim}_meta`, dimMeta)
        dimArrays.push(dimArray.data)
        dimUnits.push(dimMeta.units)
        } 
    } else {
        for (const dimLength of outVar.shape){
        dimArrays.push(Array(dimLength).fill(0))
        dimUnits.push("Default")
        }
    }
    return {dimNames: dimNames?? Array(outVar.shape.length).fill("Default"), dimArrays, dimUnits};
}

export async function GetZarrAttributes(thisVariable?: string){
    const {initStore, variable } = useGlobalStore.getState();
	const {cache} = useCacheStore.getState();
	const {currentStore} = useZarrStore.getState();
	const cacheName = `${initStore}_${thisVariable?? variable}_meta`
    const group = await currentStore;
    const outVar = await zarr.open(group.resolve(thisVariable?? variable), {kind:"array"});
    const meta = outVar.attrs;
    cache.set(cacheName, meta);
    return meta
}


async function fetchWithRetry<T>(
    operation: () => Promise<T>, 
    context: string, 
    setStatus: (s: string | null) => void,
    maxRetries = 3, 
    retryDelay = 1000
): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                useErrorStore.getState().setError('zarrFetch');
                setStatus(null);
                throw new ZarrError(`Failed to fetch ${context}`, error);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    throw new Error("Unreachable");
}
const maxRetries = 10;
const retryDelay = 500; // 0.5 seconds in milliseconds

export async function GetStore(storePath: string): Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>> | undefined>{
        const {setStatus} = useGlobalStore.getState();
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const d_store = zarr.tryWithConsolidated(
                    new zarr.FetchStore(storePath)
                );
                const gs = await d_store.then(store => zarr.open(store, {kind: 'group'}));
                setStatus(null)
                return gs;
            } catch (error) {
                // If this is the final attempt, handle the error
                if (attempt === maxRetries) {
                    if (storePath.slice(0,5) != 'local'){
                        useErrorStore.getState().setError('zarrFetch')
                        setStatus(null)
                    }
                    throw new ZarrError(`Failed to initialize store at ${storePath}`, error);
                }
                
                // Wait before retrying (except on the last attempt which we've already handled above)
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
}

export async function GetZarrArray(variable: string){
    const {idx4D, initStore, setProgress, setStrides, setStatus} = useGlobalStore.getState();
	const {compress, xSlice, ySlice, zSlice, currentStore, coarsen, kernelSize, kernelDepth, setCurrentChunks, setArraySize} = useZarrStore.getState()
	const {cache} = useCacheStore.getState();

    //---- Open Zarr Resource ----//
    const group = await currentStore;
    const outVar = await zarr.open(group.resolve(variable), {kind:"array"})
    const symbols = Object.getOwnPropertySymbols(outVar);

    //---- Fill Value ----//
    //fillValue is hidden in Zarrita for some reason. Need to extract it this way
    const contextSymbol = symbols.find(s => s.toString().includes('zarrita.context'));

    let fillValue = NaN
    if (contextSymbol) {
        fillValue = !Number.isNaN((outVar as any)[contextSymbol]?.fill_value) ? (outVar as any)[contextSymbol]?.fill_value : fillValue
    }
    if (!outVar.is("number") && !outVar.is("bigint")) {
        throw new Error(`Unsupported data type: Only numeric arrays are supported. Got: ${outVar.dtype}`);
    }
    
    //----  Shape Info ----//
    let fullShape = outVar.shape;
    let [_totalSize, _chunkSize, chunkShape] = GetSize(outVar);

    const rank = fullShape.length;
    const hasZ = rank >= 3;

    const xDimIndex = rank - 1;
    const yDimIndex = rank - 2;
    const zDimIndex = rank - 3;

    //---- If 2D download whole array (Chunking Logic doesn't work on 2D atm) ----//
    if (rank === 2){ 
        setStatus("Downloading...")
        const chunk = await fetchWithRetry(
            () => zarr.get(outVar),
            `variable ${variable}`,
            setStatus
        );
        if (!chunk) throw new Error('Unexpected: chunk was not assigned'); // This is redundant but satisfies TypeScript
        if (chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
            throw new Error("BigInt arrays not supported.");
        }
        const shape = outVar.shape;
        const strides = chunk.stride;
        setStrides(strides) // Need strides for the point cloud

        let [typedArray, scalingFactor] = ToFloat16(chunk.data.map((v: number) => v === fillValue ? NaN : v) as Float32Array, null)
        if (coarsen){
            typedArray = await Convolve2D(typedArray, {shape, strides}, "Mean2D", kernelSize) as Float16Array
            const newShape = shape.map((dim) => Math.ceil(dim / kernelSize))
            let newStrides = newShape.slice()
            newStrides = newStrides.map((_val, idx) => {
                return newStrides.reduce((a, b, i) => a * (i < idx ? b : 1), 1)
            })
        }
        const cacheChunk = {
            data: compress ? CompressArray(typedArray, 7) : typedArray,
            shape: chunk.shape,
            stride: chunk.stride,
            scaling: scalingFactor,
            compressed: compress
        }
        cache.set(`${initStore}_${variable}`, cacheChunk)
        setStatus(null)
        return { data: typedArray, shape, dtype: outVar.dtype, scalingFactor };
    } 
   
    //---- Dimension Indices to Grab ----//
    const calcDim = (slice: [number, number | null], dimIdx: number) => {
        // Return an empty array if no zIdx
        if (dimIdx < 0) return { start: 0, end: 1, size: 0, chunkDim: 1 };
        const dimSize = fullShape[dimIdx];
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

    //---- Setup Output Array ----//
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
    
    //---- State for the loop ----//
    let scalingFactor: number | null = null;
    const totalChunksToLoad = (zDim.end - zDim.start) * (yDim.end - yDim.start) * (xDim.end - xDim.start);
    let iter = 1; // For progress bar
    const rescaleIDs = [] // These are the downloaded chunks that need to be rescaled

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
                const cachedChunk = cache.get(cacheName)
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
                    // Download Chunk
                    const getChunkSlice = () =>{
                        const chunkSlice = new Array(rank).fill(0);

                        chunkSlice[xDimIndex] = zarr.slice(x * chunkShape[xDimIndex], (x + 1) * chunkShape[xDimIndex]);
                        chunkSlice[yDimIndex] = zarr.slice(y * chunkShape[yDimIndex], (y + 1) * chunkShape[yDimIndex]);
                        if (zDimIndex >= 0) {
                            chunkSlice[zDimIndex] = zarr.slice(z * chunkShape[zDimIndex], (z + 1) * chunkShape[zDimIndex]);
                        }
                        if (rank >= 4) { //When rank is 4 or 5. The first will always be depth. In the case of 5 that will only be if last dimension is vector variable
                            chunkSlice[0] = idx4D; 
                        }
                        return chunkSlice;
                    }
                    const chunkSlice = getChunkSlice()
                    const chunk = await fetchWithRetry(
                        () => zarr.get(outVar, chunkSlice),
                        `variable ${variable}`,
                        setStatus
                    );
                    if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
                        throw new Error("BigInt arrays are not supported for conversion to Float32Array.");
                    } 
                    const originalData = chunk.data as Float32Array;
                    let chunkStride = chunk.stride;
                    let thisShape = chunkShape
                    let [chunkF16, newScalingFactor] = ToFloat16(originalData.map((v: number) => v === fillValue ? NaN : v), scalingFactor)
                    if (coarsen){
                        chunkF16 = await Convolve(chunkF16, {shape:chunkShape, strides:chunkStride}, "Mean3D", {kernelSize, kernelDepth}) as Float16Array
                        thisShape = chunkShape.map((dim: number, idx: number) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)))
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
    setProgress(0) // Reset progress for next load
    return {
        data: typedArray,
        shape: outputShape,
        dtype: outVar.dtype,
        scalingFactor
    }
}