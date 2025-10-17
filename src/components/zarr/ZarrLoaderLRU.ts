import * as zarr from "zarrita";
import * as THREE from 'three';
import MemoryLRU from "@/utils/MemoryLRU";
import { parseUVCoords, ArrayMinMax } from "@/utils/HelperFuncs";
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
	if (maxVal <= 65504 && minVal >= -65504){ // If values fit in Float16, use that to save memory
		newArray = new Float16Array(array)
	}
	else{
		newScalingFactor = Math.ceil(Math.log10(maxVal/65504))
		newScalingFactor = scalingFactor ? (scalingFactor > newScalingFactor ? scalingFactor : newScalingFactor) : newScalingFactor
		for (let i = 0; i < array.length; i++) {
			array[i] /= Math.pow(10,newScalingFactor);
		}
		newArray = new Float16Array(array)
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
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const d_store = zarr.tryWithConsolidated(
					new zarr.FetchStore(storePath)
				);
				const gs = await d_store.then(store => zarr.open(store, {kind: 'group'}));
				return gs;
			} catch (error) {
				// If this is the final attempt, handle the error
				if (attempt === maxRetries) {
					if (storePath.slice(0,5) != 'local'){
						useErrorStore.getState().setError('zarrFetch')
						useGlobalStore.getState().setShowLoading(false)
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

interface Slices{
	xSlice: [number, number | null],
	ySlice: [number, number | null],
	zSlice: [number, number | null]
}
interface TimeSeriesInfo{
	uv:THREE.Vector2,
	normal:THREE.Vector3
}
  
export class ZarrDataset{
	private groupStore: Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>>;
	private variable: string;
	private dimNames: string[];
	private chunkIDs: number[];
	constructor(store: Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>>){
		this.groupStore = store;
		this.variable = "Default";
		this.dimNames = ["","",""]
		this.chunkIDs = [];
	}
	async GetArray(variable: string, slices: Slices){
		const {is4D, idx4D, initStore, setProgress, setStrides, setDownloading} = useGlobalStore.getState();
		const {compress, setCurrentChunks, setArraySize} = useZarrStore.getState()
		const {cache} = useCacheStore.getState();
		const {xSlice, ySlice, zSlice} = slices
		//Check if cached
		this.variable = variable;
		if (cache.has(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`)){
			const thisChunk = cache.get(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`)
			if (thisChunk.compressed){
				thisChunk.data = DecompressArray(thisChunk.data)
			}
			setStrides(thisChunk.stride)
			return thisChunk;
		}

		const group = await this.groupStore;
		const outVar = await zarr.open(group.resolve(variable), {kind:"array"})
		const shape = is4D ? outVar.shape.slice(1) : outVar.shape;
		let [totalSize, _chunkSize, chunkShape] = GetSize(outVar);
		if (is4D){
			totalSize /= outVar.shape[0];
			chunkShape = chunkShape.slice(1);
			_chunkSize /=  outVar.shape[0] //Don't need to use this but Lint is being a whiner
		}
		const hasTimeChunks = is4D ? outVar.shape[1]/chunkShape[0] > 1 : outVar.shape[0]/chunkShape[0] > 1

		// Type check using zarr.Array.is
		if (outVar.is("number") || outVar.is("bigint")) {
			let chunk;
			let typedArray;
			let shape;
			let scalingFactor = null;
			if (totalSize < 50e6 || !hasTimeChunks){ // Check if total is less than 50MB or no chunks along time
				setDownloading(true)
				for (let attempt = 0; attempt <= maxRetries; attempt++) {
					try {
						chunk = is4D ? await zarr.get(outVar, [idx4D, null , null, null]) :  await zarr.get(outVar);
						break; // If successful, exit the loop
					} catch (error) {
						// If this is the final attempt, handle the error
						if (attempt === maxRetries) {
							useErrorStore.getState().setError('zarrFetch')
							useGlobalStore.getState().setShowLoading(false)
							setDownloading(false)
							throw new ZarrError(`Failed to fetch variable ${variable}`, error);
						}
						
						// Wait before retrying (except on the last attempt which we've already handled above)
						await new Promise(resolve => setTimeout(resolve, retryDelay));
					}
				}
				if (!chunk) {
					throw new Error('Unexpected: chunk was not assigned'); // This is redundant but satisfies TypeScript
				}
				shape = is4D ? outVar.shape.slice(1) : outVar.shape;
				setStrides(chunk.stride) // Need strides for the point cloud
				if (chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
							throw new Error("BigInt arrays are not supported for conversion to Float16Array.");
				} else {
					[typedArray, scalingFactor] = ToFloat16(chunk.data as Float32Array, null)
					const cacheChunk = {
						data: compress ? CompressArray(typedArray, 7) : typedArray,
						shape: chunk.shape,
						stride: chunk.stride,
						scaling: scalingFactor,
						compressed: compress
					}
					cache.set(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`, cacheChunk)
				}
				setDownloading(false)
			} else if (outVar.shape.length == 2){
				const totalYChunks = Math.ceil(outVar.shape[0]/chunkShape[0])
				const totalXChunks = Math.ceil(outVar.shape[1]/chunkShape[1])

				const yStartIdx = Math.floor(ySlice[0]/chunkShape[1])
				const yEndIdx = ySlice[1] ? Math.ceil(ySlice[1]/chunkShape[1]) : totalYChunks
				const xStartIdx = Math.floor(xSlice[0]/chunkShape[2])
				const xEndIdx = xSlice[1] ? Math.ceil(xSlice[1]/chunkShape[2]) : totalXChunks
				const chunkCount = (yEndIdx - yStartIdx) * (xEndIdx - xStartIdx)

				const yShape = (ySlice[1] ? ySlice[1] : outVar.shape[1+(is4D ? 1 : 0)]) - ySlice[0]
				const xShape = (xSlice[1] ? xSlice[1] : outVar.shape[2+(is4D ? 1 : 0)]) - xSlice[0]
				const arraySize = yShape*xShape
				shape =  [yShape, xShape] 

				const destStride = [shape[1], 1];
				setStrides(destStride)
				typedArray = new Float16Array(arraySize);
				let iter = 1;
				const rescaleIDs : string[] = []
				for (let y= yStartIdx ; y < yEndIdx ; y++){
					for (let x= xStartIdx ; x < xEndIdx ; x++){
						const chunkID = `y${y}_x${x}` // Unique ID for each chunk
						const cacheBase = `${initStore}_${variable}`
						const cacheName = `${cacheBase}_chunk_${chunkID}`
						if (cache.has(cacheName)){
							const cachedChunk = cache.get(cacheName)
							const chunkData = cachedChunk.compressed ? DecompressArray(cachedChunk.data) : cachedChunk.data.slice() // Decompress if needed. Gemini thinks the .slice() helps with garbage collector as it doesn't maintain a reference to the original array
							copyChunkToArray2D(
								chunkData,
								cachedChunk.shape,
								cachedChunk.stride,
								typedArray,
								shape,
								destStride as [number, number],
								[y,x],
								[yStartIdx,xStartIdx],
							)
							setProgress(Math.round(iter/chunkCount*100)) // Progress Bar
							iter ++;
						} else {
							for (let attempt = 0; attempt <= maxRetries; attempt++) {
								try {
									chunk = await zarr.get(outVar, [zarr.slice(y*chunkShape[1], (y+1)*chunkShape[1]), zarr.slice(x*chunkShape[2], (x+1)*chunkShape[2])])
									break; // If successful, exit the loop
								} catch (error) {
									// If this is the final attempt, handle the error
									if (attempt === maxRetries) {
										useErrorStore.getState().setError('zarrFetch')
										useGlobalStore.getState().setShowLoading(false)
										setDownloading(false)
										setProgress(0)
										throw new ZarrError(`Failed to fetch chunk ${chunkID} for variable ${variable}`, error);
									}
									// Wait before retrying (except on the last attempt which we've already handled above)
									await new Promise(resolve => setTimeout(resolve, retryDelay));
								}
							}	
							if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
								throw new Error("BigInt arrays are not supported for conversion to Float32Array.");
							} 
							const originalData = chunk.data as Float32Array;
							const chunkStride = chunk.stride;
							chunk = null; // Clear reference!
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
							copyChunkToArray2D(
								chunkF16,
								chunkShape,
								chunkStride,
								typedArray,
								shape,
								destStride as [number, number],
								[y,x],
								[yStartIdx,xStartIdx],
							)
							const cacheChunk = {
								data: compress ? CompressArray(chunkF16, 7) : chunkF16,
								shape: chunkShape,
								stride: chunkStride,
								scaling: scalingFactor,
								compressed: compress
							}
							cache.set(cacheName,cacheChunk)
							setProgress(Math.round(iter/chunkCount*100)) // Progress Bar
							iter ++;
							rescaleIDs.push(chunkID)
						}
					}
				}
				setDownloading(false)
				setProgress(0) 
			} else { 
				setDownloading(true)
				setProgress(0)
				const totalZChunks = Math.ceil(outVar.shape[0+(is4D ? 1 : 0)]/chunkShape[1])
				const totalYChunks = Math.ceil(outVar.shape[1+(is4D ? 1 : 0)]/chunkShape[1])
				const totalXChunks = Math.ceil(outVar.shape[2+(is4D ? 1 : 0)]/chunkShape[2])

				const zStartIdx = Math.floor(zSlice[0]/chunkShape[0])
				const zEndIdx = zSlice[1] ? Math.ceil(zSlice[1]/chunkShape[0]) : totalZChunks //If Slice[1] is null, use the end of the array
				const yStartIdx = Math.floor(ySlice[0]/chunkShape[1])
				const yEndIdx = ySlice[1] ? Math.ceil(ySlice[1]/chunkShape[1]) : totalYChunks
				const xStartIdx = Math.floor(xSlice[0]/chunkShape[2])
				const xEndIdx = xSlice[1] ? Math.ceil(xSlice[1]/chunkShape[2]) : totalXChunks
				const chunkCount = (zEndIdx - zStartIdx) * (yEndIdx - yStartIdx) * (xEndIdx - xStartIdx) // Used for Progress Bar
		
				const zShape = (zSlice[1] ? zSlice[1] : outVar.shape[0+(is4D ? 1 : 0)]) - zSlice[0]
				const yShape = (ySlice[1] ? ySlice[1] : outVar.shape[1+(is4D ? 1 : 0)]) - ySlice[0]
				const xShape = (xSlice[1] ? xSlice[1] : outVar.shape[2+(is4D ? 1 : 0)]) - xSlice[0]
				const arraySize = zShape*yShape*xShape
				setArraySize(arraySize) // This is used for the getcurrentarray function
				const chunkIDs = {x:[xStartIdx,xEndIdx], y:[yStartIdx,yEndIdx], z:[zStartIdx,zEndIdx]}
				setCurrentChunks(chunkIDs) // These are used for Getcurrentarray 
				shape =  [zShape, yShape, xShape] 
				const destStride = [shape[1] * shape[2], shape[2], 1];
				setStrides(destStride)
				typedArray = new Float16Array(arraySize);
				let iter = 1; // For progress bar
				const rescaleIDs = [] // These are the downloaded chunks that need to be rescaled

				for (let z= zStartIdx ; z < zEndIdx ; z++){ // Iterate through chunks we need 
					for (let y= yStartIdx ; y < yEndIdx ; y++){
						for (let x= xStartIdx ; x < xEndIdx ; x++){
							const chunkID = `z${z}_y${y}_x${x}` // Unique ID for each chunk
							const cacheBase = is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`
							const cacheName = `${cacheBase}_chunk_${chunkID}`
							if (cache.has(cacheName)){
								const cachedChunk = cache.get(cacheName)
								const chunkData = cachedChunk.compressed ? DecompressArray(cachedChunk.data) : cachedChunk.data.slice() // Decompress if needed. Gemini thinks the .slice() helps with garbage collector as it doesn't maintain a reference to the original array
								copyChunkToArray(
									chunkData,
									cachedChunk.shape,
									cachedChunk.stride,
									typedArray,
									shape,
									destStride as [number, number, number],
									[z,y,x],
									[zStartIdx,yStartIdx,xStartIdx],
								)
								setProgress(Math.round(iter/chunkCount*100)) // Progress Bar
								iter ++;
							}
							else{
								// Download Chunk
								for (let attempt = 0; attempt <= maxRetries; attempt++) {
									try {
										chunk = await zarr.get(outVar, is4D ? 
											[idx4D , zarr.slice(z*chunkShape[0], (z+1)*chunkShape[0]), zarr.slice(y*chunkShape[1], (y+1)*chunkShape[1]), zarr.slice(x*chunkShape[2], (x+1)*chunkShape[2])] : 
											[zarr.slice(z*chunkShape[0], (z+1)*chunkShape[0]), zarr.slice(y*chunkShape[1], (y+1)*chunkShape[1]), zarr.slice(x*chunkShape[2], (x+1)*chunkShape[2])])
										break; // If successful, exit the loop
									} catch (error) {
										// If this is the final attempt, handle the error
										if (attempt === maxRetries) {
											useErrorStore.getState().setError('zarrFetch')
											useGlobalStore.getState().setShowLoading(false)
											setDownloading(false)
											setProgress(0)
											throw new ZarrError(`Failed to fetch chunk ${chunkID} for variable ${variable}`, error);
										}
										// Wait before retrying (except on the last attempt which we've already handled above)
										await new Promise(resolve => setTimeout(resolve, retryDelay));
									}
								}	
								if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
									throw new Error("BigInt arrays are not supported for conversion to Float32Array.");
								} 
								const originalData = chunk.data as Float32Array;
								const chunkStride = chunk.stride;
								chunk = null; // Clear reference!
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
									shape,
									destStride as [number, number, number],
									[z,y,x],
									[zStartIdx,yStartIdx,xStartIdx],
								)
								const cacheChunk = {
									data: compress ? CompressArray(chunkF16, 7) : chunkF16,
									shape: chunkShape,
									stride: chunkStride,
									scaling: scalingFactor,
									compressed: compress
								}
								cache.set(cacheName,cacheChunk)
								setProgress(Math.round(iter/chunkCount*100)) // Progress Bar
								iter ++;
								rescaleIDs.push(chunkID)
							}
						}
					}
				}
				setDownloading(false)
				setProgress(0) // Reset progress for next load
			}
			return {
				data: typedArray,
				shape: shape,
				dtype: outVar.dtype,
				scalingFactor
			}
		} else {
			throw new Error(`Unsupported data type: Only numeric arrays are supported. Got: ${outVar.dtype}`)
		}
	}

	async GetAttributes(variable:string){
		const {cache} = useCacheStore.getState();
		const {initStore} = useGlobalStore.getState();
		const cacheName = `${initStore}_${variable}_meta`
		if (cache.has(cacheName)){
			const meta = cache.get(cacheName)
			this.dimNames = meta._ARRAY_DIMENSIONS as string[]
			return meta;
		}
		const group = await this.groupStore;
		const outVar = await zarr.open(group.resolve(variable), {kind:"array"});
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
		this.dimNames = dims;
		return meta;
	}

	GetDimArrays(){
		const {initStore, variable} = useGlobalStore.getState();
		const {cache} = useCacheStore.getState();
		const dimArr = [];
		const dimUnits = []
		let fallBackNames: string[] = [];
		if (this.dimNames){
			for (const dim of this.dimNames){
				dimArr.push(cache.get(`${initStore}_${dim}`));
				dimUnits.push(cache.get(`${initStore}_${dim}_meta`).units)
			}
		} else {
			const shape = cache.get(`${initStore}_${variable}_meta`).shape
			for (const dimLength of shape){
				dimArr.push(Array(dimLength).fill(0))
				dimUnits.push("Default")
				fallBackNames.push("Default")
			}
		}
		
		return [dimArr,dimUnits, this.dimNames??fallBackNames];
	}

	GetTimeSeries(TimeSeriesInfo:TimeSeriesInfo){
		const {uv,normal} = TimeSeriesInfo
		const {cache} = useCacheStore.getState();
		if (!cache.has(this.variable) && this.chunkIDs.length == 0){
			return [0]
		}
		let data, shape : number[], stride; 
		if (this.chunkIDs.length > 0){
			const arrays = []
			for (const id of this.chunkIDs){
				arrays.push(cache.get(`${this.variable}_chunk_${id}`))
			}
			({shape, stride} = arrays[0])
			const totalLength = arrays.reduce((sum, arr) => sum + arr.data.length, 0);

			data = new Float32Array(totalLength);
			let accum = 0;
			for (const array of arrays){
				data.set(array.data, accum);
				accum += array.data.length
			}
		}
		else{
			({data, shape, stride} = cache.get(this.variable))
		}
		//This is a complicated logic check but it works bb
		const sliceSize = parseUVCoords({normal,uv})
		const slice = sliceSize.map((value, index) =>
			value === null || shape[index] === null ? null : Math.round(value * shape[index]-.5));
		const mapDim = slice.indexOf(null);
		const dimStride = stride[mapDim];
		const pz = slice[0] == null ? 0 : stride[0]*slice[0]
		const py = slice[1] == null ? 0 : stride[1]*slice[1]
		const px = slice[2] == null ? 0 : stride[2]*slice[2]
		const ts = [];

		for (let i = 0; i < shape[mapDim] ; i++){
			const idx = i*dimStride+pz+py+px
			ts.push(data[idx])
		}
		return ts;
	}
}