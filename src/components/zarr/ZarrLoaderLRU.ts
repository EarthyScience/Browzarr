import * as zarr from "zarrita";
import {  ArrayMinMax } from "@/utils/HelperFuncs";
import { GetSize } from "./GetMetadata";
import { useGlobalStore, useZarrStore, useErrorStore, useCacheStore } from "@/utils/GlobalStates";
import { gzipSync, decompressSync } from 'fflate';

export const ZARR_STORES = {
    ESDC: 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr',
    SEASFIRE: 'https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr',
    ICON_ESM: 'https://eerie.cloud.dkrz.de/datasets/icon-esm-er.hist-1950.v20240618.atmos.native.2d_1h_mean/kerchunk',
    OLCI_CHL: 'https://s3.waw3-2.cloudferro.com/wekeo/egu2025/OLCI_L1_CHL_cube.zarr',
    LOCAL: 'http://localhost:5173/GlobalForcingTiny.zarr'
} as const;

function ToFloat16(array : Float32Array, scalingFactor: number | null) : [Float16Array, number | null]{ 
	let newArray : Float16Array;
	let newScalingFactor: number | null = null;
	const [minVal, maxVal] = ArrayMinMax(array)
	if (maxVal <= 65504 && minVal >= -65504 && (Math.abs(maxVal) > 1e-3)){ // If values fit in Float16, use that to save memory
		newArray = new Float16Array(array)
	}
	else{
		if ((Math.abs(maxVal) < 1e-3)){ // If low precision it will bump up
			newScalingFactor = Math.floor(Math.log10(maxVal))
			newScalingFactor = scalingFactor ? (scalingFactor < newScalingFactor ? scalingFactor : newScalingFactor) : newScalingFactor
			console.log(Math.pow(10,newScalingFactor))
			for (let i = 0; i < array.length; i++) {
				array[i] /= Math.pow(10,newScalingFactor);
			}
			newArray = new Float16Array(array)
		} else {
			newScalingFactor = Math.ceil(Math.log10(maxVal/65504))
			newScalingFactor = scalingFactor ? (scalingFactor > newScalingFactor ? scalingFactor : newScalingFactor) : newScalingFactor
			for (let i = 0; i < array.length; i++) {
				array[i] /= Math.pow(10,newScalingFactor);
			}
			newArray = new Float16Array(array)
		}	
	}
	return [newArray, newScalingFactor]
}


function RescaleArray(array: Float16Array, scalingFactor: number){ // Rescales built array when new chunk has higher scalingFactor
	for (let i = 0; i < array.length; i++) {
		array[i] /= Math.pow(10,scalingFactor);
	}
}

export class ZarrError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'ZarrError';
    }
}

export function copyChunkToArray(
    chunkData: Float16Array,
    chunkShape: number[],
    chunkStride: number[],
    destArray: Float16Array,
    destShape: number[], 
    destStride: number[],
    chunkGridPos: number[],
    chunkGridStart: number[],
): void {
    const [z, y, x] = chunkGridPos;
    const [zStartIdx, yStartIdx, xStartIdx] = chunkGridStart;
    const [chunkShapeZ, chunkShapeY, chunkShapeX] = chunkShape;
    const [destShapeZ, destShapeY, destShapeX] = destShape;

    // 1. Calculate the local coordinates of the chunk within the destination grid
    const localZ = z - zStartIdx;
    const localY = y - yStartIdx;
    const localX = x - xStartIdx;

    // 2. Determine the starting element position for this chunk in the destination array
    const zStart = localZ * chunkShapeZ;
    const yStart = localY * chunkShapeY;
    const xStart = localX * chunkShapeX;

    // 3. Calculate the actual number of elements to copy for this chunk
    // This prevents writing past the end of the destination array for partial chunks.
    const zLimit = Math.min(chunkShapeZ, destShapeZ - zStart);
    const yLimit = Math.min(chunkShapeY, destShapeY - yStart);
    const xLimit = Math.min(chunkShapeX, destShapeX - xStart);

    // 4. Loop using the calculated limits and copy row by row
    for (let cz = 0; cz < zLimit; cz++) {
        for (let cy = 0; cy < yLimit; cy++) {
            // Offset to the start of the row in the SOURCE chunk data
            const sourceRowOffset = cz * chunkStride[0] + cy * chunkStride[1];
            
            // Offset to the start of the row in the DESTINATION typedArray
            const destRowOffset = (zStart + cz) * destStride[0] + (yStart + cy) * destStride[1] + xStart;
            
            // Get the row of data from the source chunk, using the new xLimit
            const rowData = chunkData.subarray(sourceRowOffset, sourceRowOffset + xLimit);
            
            // Place the row in the correct position in the final array
            destArray.set(rowData, destRowOffset);
        }
    }
}

export function copyChunkToArray2D(
    chunkData: Float16Array,
    chunkShape: number[],
    chunkStride: number[],
    destArray: Float16Array,
    destShape: number[],
    destStride: number[],
    chunkGridPos: number[],
    chunkGridStart: number[],
): void {
    // Destructure the 2D properties
    const [y, x] = chunkGridPos;
    const [yStartIdx, xStartIdx] = chunkGridStart;
    const [chunkShapeY, chunkShapeX] = chunkShape;
    const [destShapeY, destShapeX] = destShape;

    // 1. Calculate the local coordinates of the chunk within the destination grid
    const localY = y - yStartIdx;
    const localX = x - xStartIdx;

    // 2. Determine the starting element position for this chunk in the destination array
    const yStart = localY * chunkShapeY;
    const xStart = localX * chunkShapeX;

    // 3. Calculate the actual number of elements to copy for this chunk.
    // This prevents writing past the end of the destination array for partial chunks.
    const yLimit = Math.min(chunkShapeY, destShapeY - yStart);
    const xLimit = Math.min(chunkShapeX, destShapeX - xStart);

    // 4. Loop through the rows (Y-axis) and copy each one
    for (let cy = 0; cy < yLimit; cy++) {
        // Offset to the start of the row in the SOURCE chunk data
        // chunkStride[0] is the stride for the Y-dimension
        const sourceRowOffset = cy * chunkStride[0];
        
        // Offset to the start of the row in the DESTINATION typedArray
        // destStride[0] is the stride for the Y-dimension
        const destRowOffset = (yStart + cy) * destStride[0] + xStart;
        
        // Get the row of data from the source chunk, using the calculated xLimit
        const rowData = chunkData.subarray(sourceRowOffset, sourceRowOffset + xLimit);
        
        // Place the row in the correct position in the final destination array
        destArray.set(rowData, destRowOffset);
    }
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

function CompressArray(array: Float16Array, level: number){
	const uint8View = new Uint8Array(array.buffer);
	const compressed = gzipSync(uint8View, { level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined })
	return compressed
}
// Infer compressed type
function DecompressArray(compressed : Uint8Array){
	const decompressed = decompressSync(compressed)
	const floatArray = new Float16Array(decompressed.buffer)
	return floatArray
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

export async function GetArray(): Promise<{
	data: Float16Array | Float32Array,
	shape: number[],
	dtype: string,
	scalingFactor: number | null
}>{
	const {is4D, idx4D, initStore, variable, setProgress, setStrides, setStatus} = useGlobalStore.getState();
	const {compress, xSlice, ySlice, zSlice, currentStore, setCurrentChunks, setArraySize} = useZarrStore.getState()
	const {cache} = useCacheStore.getState();

	//---- 1. Global Cache Check ----//
	if (cache.has(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`)){
		const thisChunk = cache.get(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`)
		if (thisChunk.compressed){
			thisChunk.data = DecompressArray(thisChunk.data)
		}
		setStrides(thisChunk.stride)
		return thisChunk;
	}

	//---- 2. Open Zarr Resource ----//
	const group = await currentStore;
	const outVar = await zarr.open(group.resolve(variable), {kind:"array"})

	if (!outVar.is("number") && !outVar.is("bigint")) {
        throw new Error(`Unsupported data type: Only numeric arrays are supported. Got: ${outVar.dtype}`);
    }

	//---- 3. Determine Structure ----//
	const fullShape = outVar.shape;
	let [totalSize, _chunkSize, chunkShape] = GetSize(outVar);

	if (is4D){
		chunkShape = chunkShape.slice(1);
	}

	const hasTimeChunks = is4D ? fullShape[1]/chunkShape[0] > 1 : fullShape[0]/chunkShape[0] > 1

	//---- Strategy 1. Download whole array (No time chunks) ----//
	if (!hasTimeChunks){ // No chunking along time axis, can download whole array at once
		setStatus("Downloading...")
		const chunk = await fetchWithRetry(
            () => is4D ? zarr.get(outVar, [idx4D, null, null, null]) : zarr.get(outVar),
            `variable ${variable}`,
            setStatus
        );
		if (!chunk) throw new Error('Unexpected: chunk was not assigned'); // This is redundant but satisfies TypeScript
		if (chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
            throw new Error("BigInt arrays not supported.");
        }
		const shape = is4D ? outVar.shape.slice(1) : outVar.shape;
		setStrides(chunk.stride) // Need strides for the point cloud
		const [typedArray, scalingFactor] = ToFloat16(chunk.data as Float32Array, null)
		const cacheChunk = {
			data: compress ? CompressArray(typedArray, 7) : typedArray,
			shape: chunk.shape,
			stride: chunk.stride,
			scaling: scalingFactor,
			compressed: compress
		}
		cache.set(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`, cacheChunk)
		setStatus(null)
		return { data: typedArray, shape, dtype: outVar.dtype, scalingFactor };
	} 

	//---- Strategy 2. Download Chunks ----//
	const is2D = outVar.shape.length === 2;
    
    // Calculate Indices
    const zIndexOffset = is4D ? 1 : 0;
	
	// Helper to calculate start/end/shape for a dimension
    const calcDim = (slice: [number, number | null], dimIdx: number, chunkDim: number) => {
        const totalChunks = Math.ceil(fullShape[dimIdx + zIndexOffset] / chunkDim);
        const start = Math.floor(slice[0] / chunkDim);
        const end = slice[1] ? Math.ceil(slice[1] / chunkDim) : totalChunks;
        const size = (slice[1] ? slice[1] : fullShape[dimIdx + zIndexOffset]) - slice[0];
        return { start, end, size };
    };

    const xDim = calcDim(xSlice, 2, chunkShape[2]);
    const yDim = calcDim(ySlice, 1, chunkShape[1]);
    const zDim = is2D ? { start: 0, end: 1, size: 0 } : calcDim(zSlice, 0, chunkShape[0]);

	// Setup Output Array
    const outputShape = is2D ? [yDim.size, xDim.size] : [zDim.size, yDim.size, xDim.size];
    const totalElements = is2D ? yDim.size * xDim.size : zDim.size * yDim.size * xDim.size;
    const destStride = is2D 
        ? [outputShape[1], 1] 
        : [outputShape[1] * outputShape[2], outputShape[2], 1];

    setStrides(destStride);
    if (!is2D) {
        setArraySize(totalElements);
        setCurrentChunks({ x: [xDim.start, xDim.end], y: [yDim.start, yDim.end], z: [zDim.start, zDim.end] });
    }
    const typedArray = new Float16Array(totalElements);

	// State for the loop
    let scalingFactor: number | null = null;
    const totalChunksToLoad = (zDim.end - zDim.start) * (yDim.end - yDim.start) * (xDim.end - xDim.start);

    setStatus("Downloading...");
    setProgress(0);

	let iter = 1; // For progress bar
	const rescaleIDs = [] // These are the downloaded chunks that need to be rescaled
	for (let z= zDim.start ; z < zDim.end ; z++){ // Iterate through chunks we need 
		for (let y= yDim.start ; y < yDim.end ; y++){
			for (let x= xDim.start ; x < xDim.end ; x++){
				const chunkID = `y${y}_x${x}` // Unique ID for each chunk
				const cacheBase = `${initStore}_${variable}`
				const cacheName = `${cacheBase}_chunk_${chunkID}`
				if (cache.has(cacheName)){
					const cachedChunk = cache.get(cacheName)
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
					const chunk = await fetchWithRetry(
						() => is4D ? zarr.get(outVar, [idx4D, null, null, null]) : zarr.get(outVar),
						`variable ${variable}`,
						setStatus
					);
					if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
						throw new Error("BigInt arrays are not supported for conversion to Float32Array.");
					} 
					const originalData = chunk.data as Float32Array;
					const chunkStride = chunk.stride;
					const [chunkF16, newScalingFactor] = ToFloat16(originalData, scalingFactor)
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
						chunkShape,
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
						compressed: compress
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

export async function GetAttributes(thisVariable? : string){
	const {initStore, variable } = useGlobalStore.getState();
	const {cache} = useCacheStore.getState();
	const {currentStore} = useZarrStore.getState();
	const cacheName = `${initStore}_${variable}_meta`
	if (cache.has(cacheName)){
		const meta = cache.get(cacheName)
		return meta;
	}
	const group = await currentStore;
	const outVar = await zarr.open(group.resolve(thisVariable?? variable), {kind:"array"});
	const meta = outVar.attrs;
	cache.set(cacheName, meta);
	const dims = [];
	for (const dim of meta._ARRAY_DIMENSIONS as string[]){ //Put the dimension arrays in the cache to access later
		if (!cache.has(dim)){
			const dimArray = await zarr.open(group.resolve(dim), {kind:"array"})
					.then((result) => zarr.get(result));
				const dimMeta = await zarr.open(group.resolve(dim), {kind:"array"})
					.then((result) => result.attrs)
				cache.set(`${initStore}_${dim}`, dimArray.data);
				cache.set(`${initStore}_${dim}_meta`, dimMeta)
			}
			dims.push(dim)
	}
	return meta;
}

export function GetDimArrays(){
	const {initStore, variable, dimNames} = useGlobalStore.getState();
	const {cache} = useCacheStore.getState();
	const dimArr = [];
	const dimUnits = []
	const fallBackNames: string[] = [];
	if (dimNames){
		for (const dim of dimNames){
			const dimArray = cache.get(`${initStore}_${dim}`)
			const dimMeta = cache.get(`${initStore}_${dim}_meta`)
			dimArr.push(dimArray ?? [0]) // this should not happend
			dimUnits.push(dimMeta?.units ?? null) // Units may not be present
		}
	} else {
		const shape = cache.get(`${initStore}_${variable}_meta`).shape
		for (const dimLength of shape){
			dimArr.push(Array(dimLength).fill(0))
			dimUnits.push("Default")
			fallBackNames.push("Default")
		}
	}
	return [dimArr,dimUnits, dimNames??fallBackNames];
}	


