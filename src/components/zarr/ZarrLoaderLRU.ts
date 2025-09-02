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

export class ZarrError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'ZarrError';
    }
}

export async function GetStore(storePath: string): Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>> | null>{
		try {
			const d_store = zarr.tryWithConsolidated(
				new zarr.FetchStore(storePath)
			);
			const gs = await d_store.then(store => zarr.open(store, {kind: 'group'}));
			return gs;
		} catch (error) {
			if (storePath.slice(0,5) != 'local'){
				useErrorStore.getState().setError('zarrFetch')
				useGlobalStore.getState().setShowLoading(false)
			}
			throw new ZarrError(`Failed to initialize store at ${storePath}`, error);
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

	constructor(store: Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>>){
		this.groupStore = store;
		this.variable = "Default";
		this.cache = useCacheStore.getState().cache;
		this.dimNames = ["","",""]
		this.chunkIDs = [];
	}

	async GetArray(variable: string, slice: [number, number | null]){

		const {is4D, idx4D, initStore, setProgress, setStrides, setDownloading} = useGlobalStore.getState();
		const {compress, setCurrentChunks, setArraySize} = useZarrStore.getState()
		const {cache} = useCacheStore.getState();

		//Check if cached
		this.variable = variable;
		if (cache.has(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`)){
			const thisChunk = cache.get(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`)
			if (thisChunk.compressed){
				thisChunk.data = DecompressArray(thisChunk.data)
			}
			return thisChunk;
		}

		const group = await this.groupStore;
		const outVar = await zarr.open(group.resolve(variable), {kind:"array"})
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
			if (totalSize < 1e8 || !hasTimeChunks){ // Check if total is less than 100MB or no chunks along time
				setDownloading(true)
				chunk = is4D ? await zarr.get(outVar, [idx4D, null , null, null]) :  await zarr.get(outVar) ;
				shape = is4D ? outVar.shape.slice(1) : outVar.shape;
				setStrides(chunk.stride) // Need strides for the point cloud
				if (chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
							throw new Error("BigInt arrays are not supported for conversion to Float32Array.");
				} else {
					typedArray = new Float32Array(chunk.data)
					const [minVal, maxVal] = ArrayMinMax(typedArray)
					if (maxVal <= 65504 && minVal >= -65504){ // If values fit in Float16, use that to save memory
						typedArray = new Float16Array(chunk.data)
					}
					else{
						scalingFactor = Math.ceil(Math.log10(maxVal/65504))
						for (let i = 0; i < typedArray.length; i++) {
							typedArray[i] /= Math.pow(10,scalingFactor);
						}
						typedArray = new Float16Array(typedArray)
					}
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

				const startIdx = Math.floor(slice[0]/chunkShape[0])
				const endIdx = slice[1] ? Math.ceil(slice[1]/chunkShape[0]) : is4D ? Math.ceil(outVar.shape[1]/chunkShape[0]) : Math.ceil(outVar.shape[0]/chunkShape[0]) //If Slice[1] is null, use the end of the array
				const chunkCount = endIdx-startIdx
				const timeSize = is4D ? outVar.shape[2]*outVar.shape[3] : outVar.shape[1]*outVar.shape[2]
				const arraySize = (endIdx-startIdx)*chunkShape[0]*timeSize
				setArraySize(arraySize) // This is used for the getcurrentarray function

				shape = is4D ? [(endIdx-startIdx)*chunkShape[0], outVar.shape[2],outVar.shape[3]] :
				[(endIdx-startIdx)*chunkShape[0], outVar.shape[1],outVar.shape[2]]

				typedArray = new Float32Array(arraySize);
				let accum = 0;
				let iter = 1;
				const chunkIDs = []
				const rescaleIDs = [] // These are the downloaded chunks that need to be rescaled

				for (let i= startIdx ; i < endIdx ; i++){ // Iterate through chunks we need
					const cacheName = is4D ? `${initStore}_${idx4D}_${variable}_chunk_${i}` : `${initStore}_${variable}_chunk_${i}`
					chunkIDs.push(i) // identify which chunks to use when recombining cache for getcurrentarray function
					if (this.cache.has(cacheName)){
						chunk = cache.get(cacheName)
						setStrides(chunk.stride)
						const chunkData = chunk.compressed ? DecompressArray(chunk.data) : chunk.data // Decompress if needed
						typedArray.set(chunkData,accum)
						setProgress(Math.round(iter/chunkCount*100))
						accum += chunk.data.length;
						iter ++;
					}
					else{
						rescaleIDs.push(i)
						chunk = await zarr.get(outVar, is4D ? [idx4D , zarr.slice(i*chunkShape[0], (i+1)*chunkShape[0]), null, null] : [zarr.slice(i*chunkShape[0], (i+1)*chunkShape[0]), null, null])
						if (chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
							throw new Error("BigInt arrays are not supported for conversion to Float32Array.");
						} else {
							typedArray.set(chunk.data,accum)
							cache.set(cacheName,chunk)
							accum += chunk.data.length;
							setStrides(chunk.stride)
							setProgress(Math.round(iter/chunkCount*100))
							iter ++;
						}
					}
				}
				const [minVal, maxVal] = ArrayMinMax(typedArray)
				if (maxVal <= 65504 && minVal >= -65504){ // If values fit in Float16, use that to save memory
					typedArray = new Float16Array(typedArray)
				}
				else{
					scalingFactor = Math.ceil(Math.log10(maxVal/65504))
					for (let i = 0; i < typedArray.length; i++) {
						typedArray[i] /= Math.pow(10,scalingFactor);
					}
					typedArray = new Float16Array(typedArray)
				}

				for (const id of rescaleIDs){ // Rescale the chunks that were just downloaded. This isn't great logic as it assumes the scaling factor will be roughly the same as previous chunks. Will need to revisit
					const cacheName = is4D ? `${initStore}_${idx4D}_${variable}_chunk_${id}` : `${initStore}_${variable}_chunk_${id}`
					if (scalingFactor){
						chunk = cache.get(cacheName)
						const newData = new Float32Array(chunk.data.length)
						for (let i = 0; i < chunk.data.length; i++) {
							newData[i] = chunk.data[i]/Math.pow(10,scalingFactor);
						}
						const newTyped = new Float16Array(newData)
						const newChunk = {
							data: compress ? CompressArray(newTyped, 7) : newTyped,
							shape: chunk.shape,
							stride: chunk.stride,
							scaling: scalingFactor,
							compressed: compress
						}
						cache.set(cacheName,newChunk)
					}
					else{
						chunk = cache.get(cacheName)
						const newTyped = new Float16Array(chunk.data)
						const newChunk = {
							data: compress ? CompressArray(newTyped, 7) : newTyped,
							shape: chunk.shape,
							stride: chunk.stride,
							scaling: null
						}
						cache.set(cacheName,newChunk)
					}
				}
				setCurrentChunks(chunkIDs) // These are used for the Getcurrentarray 
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
		const {initStore} = useGlobalStore.getState();
		const {cache} = useCacheStore.getState();
		const dimArr = [];
		const dimMetas = []
		for (const dim of this.dimNames){
			dimArr.push(cache.get(`${initStore}_${dim}`));
			dimMetas.push(cache.get(`${initStore}_${dim}_meta`))
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