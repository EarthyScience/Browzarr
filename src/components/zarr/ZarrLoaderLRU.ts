import * as zarr from "zarrita";
import {  ArrayMinMax } from "@/utils/HelperFuncs";
import { GetSize } from "./GetMetadata";
import { useGlobalStore, useZarrStore, useErrorStore, useCacheStore } from "@/utils/GlobalStates";
import { gzipSync, decompressSync } from 'fflate';
import { GetNCArray, GetNCAttributes } from "./NCGetters";
import { GetZarrAttributes, GetZarrArray } from "./ZarrGetters";

export const ZARR_STORES = {
    ESDC: 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr',
    SEASFIRE: 'https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr',
    ICON_ESM: 'https://eerie.cloud.dkrz.de/datasets/icon-esm-er.hist-1950.v20240618.atmos.native.2d_1h_mean/kerchunk',
    OLCI_CHL: 'https://s3.waw3-2.cloudferro.com/wekeo/egu2025/OLCI_L1_CHL_cube.zarr',
    LOCAL: 'http://localhost:5173/GlobalForcingTiny.zarr'
} as const;

export function ToFloat16(array : Float32Array, scalingFactor: number | null) : [Float16Array, number | null]{ 
	let newArray : Float16Array;
	let newScalingFactor: number | null = null;
	const [minVal, maxVal] = ArrayMinMax(array)
	if (maxVal <= 65504 && minVal >= -65504 && Math.abs(maxVal) > 1e-3 && Math.abs(minVal) > 1e-3){ // If values fit in Float16, use that to save memory
		newArray = new Float16Array(array)
	}
	else{
		if ((Math.abs(maxVal) < 1e-3)){ // If low precision it will bump up
			newScalingFactor = Math.floor(Math.log10(maxVal))
			newScalingFactor = scalingFactor ? (scalingFactor < newScalingFactor ? scalingFactor : newScalingFactor) : newScalingFactor
			for (let i = 0; i < array.length; i++) {
				array[i] /= Math.pow(10,newScalingFactor);
			}
		} else if (Math.abs(minVal) < 1e-3 ){
			const minFactor = Math.floor(Math.log10(Math.abs(minVal)))
			const newMax = maxVal/Math.pow(10, minFactor)
			const maxFactor = Math.ceil(Math.log10(newMax /65504))
			newScalingFactor = maxFactor + minFactor
			newScalingFactor = scalingFactor ? (scalingFactor < newScalingFactor ? scalingFactor : newScalingFactor) : newScalingFactor
			for (let i = 0; i < array.length; i++) {
				array[i] /= Math.pow(10,newScalingFactor);
			}

		} else {
			newScalingFactor = Math.ceil(Math.log10(maxVal/65504))
			newScalingFactor = scalingFactor ? (scalingFactor > newScalingFactor ? scalingFactor : newScalingFactor) : newScalingFactor
			for (let i = 0; i < array.length; i++) {
				array[i] /= Math.pow(10,newScalingFactor);
			}
		}	
		newArray = new Float16Array(array)
	}
	return [newArray, newScalingFactor]
}

export function RescaleArray(array: Float16Array, scalingFactor: number){ // Rescales built array when new chunk has higher scalingFactor
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

export function CompressArray(array: Float16Array, level: number){
	const uint8View = new Uint8Array(array.buffer);
	const compressed = gzipSync(uint8View, { level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined })
	return compressed
}
// Infer compressed type
export function DecompressArray(compressed : Uint8Array){
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
	data: Float16Array,
	shape: number[],
	dtype: string,
	scalingFactor: number | null
}>{
	const {is4D, idx4D, initStore, variable, setStrides} = useGlobalStore.getState();
	const {useNC} = useZarrStore.getState()
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
	if (useNC){
		const output = GetNCArray()
		return output
	} else{
		const output = await GetZarrArray()
		return output
	}
}

export async function GetAttributes(thisVariable? : string){
	const {initStore, variable } = useGlobalStore.getState();
	const {cache} = useCacheStore.getState();
	const {useNC} = useZarrStore.getState();
	const cacheName = `${initStore}_${thisVariable?? variable}_meta`
	if (cache.has(cacheName)){
		const meta = cache.get(cacheName)
		return meta;
	}
	else {
		if (useNC){
			const meta = GetNCAttributes(thisVariable)
			return meta
		} else {
			const meta = await GetZarrAttributes(thisVariable)
			return meta
		}
	}
}


