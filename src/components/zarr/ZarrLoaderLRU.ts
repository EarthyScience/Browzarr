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
	private cache: MemoryLRU<string,any>;
	private dimNames: string[];
	private chunkIDs: number[];
	private chunkShape: number[];
	constructor(store: Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>>){
		this.groupStore = store;
		this.variable = "Default";
		this.cache = useCacheStore.getState().cache;
		this.dimNames = ["","",""]
		this.chunkIDs = [];
		this.chunkShape = [1, 1, 1]
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
		let [totalSize, _chunkSize, chunkShape] = GetSize(outVar);
		this.chunkShape = chunkShape
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
			if (totalSize < 1e8 || !hasTimeChunks){ // Check if total is less than 100MB or no chunks along time
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
			}
			else { 
				setDownloading(true)
				setProgress(0)

				const zStartIdx = Math.floor(zSlice[0]/chunkShape[0])
				const zEndIdx = zSlice[1] ? Math.ceil(zSlice[1]/chunkShape[0]) : is4D ? Math.ceil(outVar.shape[1]/chunkShape[0]) : Math.ceil(outVar.shape[0]/chunkShape[0]) //If Slice[1] is null, use the end of the array
				const zChunkCount = zEndIdx-zStartIdx
				const yStartIdx = Math.floor(ySlice[0]/chunkShape[1])
				const yEndIdx = ySlice[1] ? Math.ceil(ySlice[1]/chunkShape[1]) : is4D ? Math.ceil(outVar.shape[2]/chunkShape[1]) : Math.ceil(outVar.shape[1]/chunkShape[1])
				const yChunkCount = yEndIdx - yStartIdx
				const xStartIdx = Math.floor(xSlice[0]/chunkShape[2])
				const xEndIdx = xSlice[1] ? Math.ceil(xSlice[1]/chunkShape[2]) : is4D ? Math.ceil(outVar.shape[3]/chunkShape[2]) : Math.ceil(outVar.shape[2]/chunkShape[2])
				const xChunkCount = xEndIdx - xStartIdx
				const chunkCount = zChunkCount*yChunkCount*xChunkCount
				const arraySize = chunkShape[0]*zChunkCount*chunkShape[1]*yChunkCount*chunkShape[2]*xChunkCount // Total size of the output array
				setArraySize(arraySize) // This is used for the getcurrentarray function

				shape =  [zChunkCount*chunkShape[0], chunkShape[1]*yChunkCount, chunkShape[2]*xChunkCount] 
				typedArray = new Float16Array(arraySize);
				let accum = 0;
				let iter = 1; // For progress bar
				const chunkIDs: string[] = []
				const rescaleIDs = [] // These are the downloaded chunks that need to be rescaled
				for (let z= zStartIdx ; z < zEndIdx ; z++){ // Iterate through chunks we need // (let z= zStartIdx ; z < zEndIdx ; z++)
					for (let y= yStartIdx ; y < yEndIdx ; y++){
						for (let x= xStartIdx ; x < xEndIdx ; x++){
							const chunkID = `z${z}_y${y}_x${x}`
							const cacheBase = is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`
							const cacheName = `${cacheBase}_chunk_${chunkID}`
							chunkIDs.push(chunkID) // identify which chunks to use when recombining cache for getcurrentarray function
							if (this.cache.has(cacheName)){
								chunk = cache.get(cacheName)
								setStrides(chunk.stride)
								const chunkData = chunk.compressed ? DecompressArray(chunk.data) : chunk.data // Decompress if needed
								typedArray.set(chunkData,accum)
								setProgress(Math.round(iter/chunkCount*100)) // Progress Bar
								accum += chunk.data.length;
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
								if (chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
									throw new Error("BigInt arrays are not supported for conversion to Float32Array.");
								} 
								const [chunkF16, newScalingFactor] = ToFloat16(chunk.data as Float32Array, scalingFactor)
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
								typedArray.set(chunkF16,accum)
								const cacheChunk = {
									data: compress ? CompressArray(chunkF16, 7) : chunkF16,
									shape: chunk.shape,
									stride: chunk.stride,
									scaling: scalingFactor,
									compressed: compress
								}
								cache.set(cacheName,cacheChunk)
								accum += chunk.data.length;
								setStrides(chunk.stride)
								setProgress(Math.round(iter/chunkCount*100)) // Progress Bar
								iter ++;
								
								rescaleIDs.push(chunkID)
							}
						}
					}
				}
				setCurrentChunks(chunkIDs) // These are used for the Getcurrentarray 
				setDownloading(false)
				setProgress(0) // Reset progress for next load
			}
			console.log(shape)
			console.log(typedArray)
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
		const {initStore, is4D} = useGlobalStore.getState();
		const {cache} = useCacheStore.getState();
		const {zSlice} = useZarrStore.getState();
		const dimArr = [];
		const dimMetas = []
		for (const dim of this.dimNames){
			dimArr.push(cache.get(`${initStore}_${dim}`));
			dimMetas.push(cache.get(`${initStore}_${dim}_meta`))
		}
		if (zSlice[0] != 0 || zSlice[1] != null){ //Trim the time dimension based on slice
			const chunkDepth = is4D ? this.chunkShape[1] : this.chunkShape[0]
			const startVal = Math.max(zSlice[0] - (zSlice[0] % chunkDepth), 0)
			const endVal = zSlice[1] ? zSlice[1] + (chunkDepth-(zSlice[1] % chunkDepth)) : null
			dimArr[0] = dimArr[0].slice(startVal,endVal)
        }
		return [dimArr,dimMetas, this.dimNames];
	}

	GetTimeSeries(TimeSeriesInfo:TimeSeriesInfo){
		const {uv,normal} = TimeSeriesInfo
		if (!this.cache.has(this.variable) && this.chunkIDs.length == 0){
			return [0]
		}
		let data, shape : number[], stride; 
		if (this.chunkIDs.length > 0){
			const arrays = []
			for (const id of this.chunkIDs){
				arrays.push(this.cache.get(`${this.variable}_chunk_${id}`))
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
			({data, shape, stride} = this.cache.get(this.variable))
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