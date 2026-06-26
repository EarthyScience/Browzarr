import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useErrorStore } from "@/GlobalStates/ErrorStore";
import { ToFloat16, CompressArray, DecompressArray, copyChunkToArray, RescaleArray, copyChunkToArray2D } from "./utils";
import { Convolve } from "../computation/webGPU";
import {coarsen3DArray, calculateStrides, TypedArray} from '@/utils/HelperFuncs'

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

export async function GetNCArray(variable: string){
    const {idx4D, initStore, setProgress, setStrides} = useGlobalStore.getState();
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
    let validRange: {min: number, max: number} | undefined;
    if("valid_min" in atts && "valid_max" in atts){
        validRange = {
            min: atts["valid_min"][0],
            max: atts["valid_max"][0]
        }
    }
    let preScaling: number | undefined;
    if ("scale_factor" in atts){
        const thisScale = atts["scale_factor"][0]
        if (thisScale != 1) preScaling = thisScale
    }

    //---- Dimension Indices to Grab ----//
    const calcDim = (slice: [number, number | null], dimIdx: number) => {
        // Return an empty array if no zIdx
        if (dimIdx < 0) return { start: 0, end: 1, size: 0, chunkDim: 1, sliceStart: 0, sliceEnd: 1 };
        const dimSize = shape[dimIdx];
        const chunkDim = chunkShape[dimIdx];
        const sliceStart = slice[0];
        const sliceEnd = slice[1] ?? dimSize;
        const start = Math.floor(sliceStart / chunkDim);
        const end = Math.ceil(sliceEnd / chunkDim);
        const size = sliceEnd - sliceStart;
        //Chunkdim is the shape of the chunk at that index
        return { start, end, size, chunkDim, sliceStart, sliceEnd };
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

        // Priority based on total useful data volume (not density)
        // This avoids penalizing chunks in sparse dimensions
        const totalUsefulData = xOverlap * yOverlap * zOverlap;

        // Also consider chunk size (smaller chunks may download faster)
        const chunkSize = xDim.chunkDim * yDim.chunkDim * (hasZ ? zDim.chunkDim : 1);

        // Combine factors: prioritize high data volume, then smaller chunks for faster downloads
        return totalUsefulData * 1000 + (1 / chunkSize) * 100;
    };

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
    let processedChunks = 0;
    const rescaleIDs: string[] = [] // These are the downloaded chunks that need to be rescaled
    const cacheBase = rank > 3
        ? `${initStore}_${variable}_${idx4D}`
        : `${initStore}_${variable}`

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
                const xOverlap = calculateChunkOverlap(x, xDimIndex, xDim.sliceStart, xDim.sliceEnd, xDim.chunkDim);
                const yOverlap = calculateChunkOverlap(y, yDimIndex, yDim.sliceStart, yDim.sliceEnd, yDim.chunkDim);
                const zOverlap = hasZ ? calculateChunkOverlap(z, zDimIndex, zDim.sliceStart, zDim.sliceEnd, zDim.chunkDim) : xDim.chunkDim;

                if (xOverlap === 0 || yOverlap === 0 || zOverlap === 0) {
                    continue; // Skip chunks that don't contain any requested data
                }

                const chunkID = `z${z}_y${y}_x${x}` // Unique ID for each chunk
                const cacheName = `${cacheBase}_chunk_${chunkID}`
                const cachedChunk = cache.get(cacheName);

                const isCacheValid = cachedChunk &&
                                    cachedChunk.kernel.kernelSize === (coarsen ? kernelSize : undefined) && // If the data is coarsened. Make sure it's the same as current coarsen. Otherwise refetch
                                    cachedChunk.kernel.kernelDepth === (coarsen ? kernelSize : undefined);
                if (isCacheValid) {
                    const chunkData = cachedChunk.compressed ? DecompressArray(cachedChunk.data) : cachedChunk.data.slice();
                    copyChunkToArray(
                        chunkData,
                        cachedChunk.shape,
                        cachedChunk.stride,
                        typedArray,
                        outputShape,
                        destStride as [number, number, number],
                        [z, y, x],
                        [zDim.start, yDim.start, xDim.start],
                    );
                    processedChunks += 1;
                    setProgress(Math.round(processedChunks / totalChunksToLoad * 100));
                } else {
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

    // Sort chunks by priority, then preserve contiguous disk order when priorities tie
    chunksToFetch.sort((a, b) => {
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;
        if (a.coords.z !== b.coords.z) return a.coords.z - b.coords.z;
        if (a.coords.y !== b.coords.y) return a.coords.y - b.coords.y;
        return a.coords.x - b.coords.x;
    });

    const totalFetchChunks = chunksToFetch.length;
    setProgress(0);

    // Use a bounded batch size to balance parallelism and contiguous chunk reads
    const baseBatchSize = Math.min(10, totalFetchChunks || 10);
    let currentBatchSize = Math.min(baseBatchSize, totalFetchChunks);

    for (let i = 0; i < totalFetchChunks; i += currentBatchSize) {
        // Adjust batch size based on remaining chunks
        const remainingChunks = totalFetchChunks - i;
        currentBatchSize = Math.min(baseBatchSize, remainingChunks);

        // For high-priority chunks (first 20%), use smaller batches for better responsiveness
        if (i < chunksToFetch.length * 0.2) {
            currentBatchSize = Math.min(5, currentBatchSize);
        }

        const batch = chunksToFetch.slice(i, i + currentBatchSize);
        
        // Start all fetches in this batch
        const fetchPromises = batch.map(chunk => {
            const { z, y, x } = chunk.coords;
            const starts = new Array(rank).fill(0);
            const counts = new Array(rank).fill(1);
            if (rank > 3) { //When rank is 4 or 5. The first will always be depth. In the case of 5 that will only be if last dimension is vector variable. This case not handled yet
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
            return ncModule.getSlicedVariableArray(variable, starts, counts);
        });

        // Wait for all in batch to complete
        const results = await Promise.all(fetchPromises);

        // Process results in order
        for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const { z, y, x } = chunk.coords;
            let chunkArray = results[j];
            
            const chunkType = chunkArray.constructor.name
            const isInt = chunkType.includes("int") 
            let thisShape = [1, 1, 1]; // Will be set properly below
            let chunkStride = calculateStrides(thisShape)
            
            // Recalculate shape for this specific chunk
            const starts = new Array(rank).fill(0);
            const counts = new Array(rank).fill(1);
            if (rank > 3) {
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
            thisShape = counts;
            chunkStride = calculateStrides(thisShape);

            const filterValues = (array: TypedArray) =>{
                for (let i = 0; i < array.length; i++){
                    if (array[i] === fillValue && !isInt) array[i] = NaN
                    if (validRange){
                        if (isInt){
                            if (array[i] < validRange.min) array[i] = validRange.min 
                            if (array[i] > validRange.max) array[i] = validRange.max
                        } else{
                            if (array[i] < validRange.min || array[i] > validRange.max) array[i] = NaN
                        }

                    }
                }
            }
            const preScale = (array: TypedArray, scaler: number) =>{
                const tempArray = new Float32Array(array.length);
                for (let i = 0; i < array.length; i++){
                    tempArray[i] = array[i] * scaler;
                }
                return tempArray;
            }
            filterValues(chunkArray)
            if (preScaling) chunkArray = preScale(chunkArray, preScaling)
            let [chunkF16, newScalingFactor] = ToFloat16(chunkArray, scalingFactor)
            if (coarsen){
                chunkF16 = await Convolve(chunkF16, {shape:chunkShape, strides:chunkStride}, "Mean3D", {kernelSize, kernelDepth}) as Float16Array
                thisShape = thisShape.map((dim: number, idx: number) => Math.floor(dim / (idx === 0 ? kernelDepth : kernelSize)))
                const newSize = thisShape.reduce((a: number, b: number) => a*b, 1)
                chunkF16 = coarsen3DArray(chunkF16, chunkShape, chunkStride as [number, number, number], kernelSize, kernelDepth, newSize)
                chunkStride = calculateStrides(thisShape)
            }
            if (newScalingFactor != null 
                && newScalingFactor != scalingFactor){ // If the scalingFactor has changed, need to rescale main array. Not worried about shrinking values at the moment. 
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
            if (hasZ)copyChunkToArray(
                chunkF16,
                chunkShape.slice(-3),
                chunkStride.slice(-3) as [number, number, number],
                typedArray,
                outputShape,
                destStride as [number, number, number],
                [z,y,x],
                [zDim.start,yDim.start,xDim.start],
            )
            else copyChunkToArray2D(
                chunkF16,                chunkShape,
                chunkStride as [number, number],
                typedArray,
                outputShape,
                destStride as [number, number],
                [y,x],
                [yDim.start,xDim.start],
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
            cache.set(chunk.cacheName, cacheChunk)
            processedChunks += 1;
            setProgress(Math.round(processedChunks / totalChunksToLoad * 100));
            rescaleIDs.push(chunk.chunkID)
        }
    }

    return {
        data: typedArray,
        shape: outputShape,
        dtype: varInfo.dtype,
        scalingFactor
    }

}
