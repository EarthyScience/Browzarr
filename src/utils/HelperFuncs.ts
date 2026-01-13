'use client';
import * as THREE from 'three'
import { useGlobalStore, usePlotStore, useZarrStore, useCacheStore } from './GlobalStates';
import { decompressSync } from 'fflate';
import { copyChunkToArray } from '@/components/zarr/ZarrLoaderLRU';
import { GetNCDims } from '@/components/zarr/NCGetters';
import { GetZarrDims } from '@/components/zarr/ZarrGetters';

export type TypedArray =
  | Float32Array | Float64Array
  | Int8Array | Uint8Array | Uint8ClampedArray
  | Int16Array | Uint16Array
  | Int32Array | Uint32Array;

export type TypedArrayBufferLike = 
  | Uint8Array<ArrayBufferLike> | Int16Array<ArrayBufferLike> 
  | Float16Array<ArrayBufferLike>  | Float32Array<ArrayBufferLike> 
  | Int32Array<ArrayBufferLike> | Uint32Array<ArrayBufferLike> 
  | Float32Array<ArrayBufferLike> | Float64Array<ArrayBufferLike>

export function parseTimeUnit(units: string | undefined): [number, number] {
    if (units === "Default"){
        return [1, 0];
    }

    if (!units || typeof units !== 'string' || units.trim() === '') {
      return [1, 0]; 
    }
    
    // Regular expression to match CF time units (e.g., "seconds since 1970-01-01")
    const match = units.match(/^(\w+)\s+since\s+(.+)$/i);
    if (!match) {
      throw new Error(`Invalid time unit format: expected "<unit> since <date>", got "${units}"`);
    }
    
    const [_, unit, referenceDate] = match;
    const normalizedUnit = unit.toLowerCase();
    
    // Map of time units to milliseconds per unit
    const unitToMilliseconds: Record<string, number> = {
      millisecond: 1,
      milliseconds: 1,
      second: 1000,
      seconds: 1000,
      minute: 60 * 1000,
      minutes: 60 * 1000,
      hour: 60 * 60 * 1000,
      hours: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };
    // Handle singular/plural variations (e.g., "second" vs "seconds")
    const singularUnit = normalizedUnit.endsWith('s') ? normalizedUnit.slice(0, -1) : normalizedUnit;
    const effectiveUnit = unitToMilliseconds[normalizedUnit] !== undefined ? normalizedUnit : singularUnit;
    let baseDate;
    if (referenceDate.length <= 10){
      const [year, month, day] = referenceDate.split('-');
      baseDate = new Date(Date.UTC(parseInt(year),parseInt(month),parseInt(day)))
    } else {
     baseDate = referenceDate ? new Date(referenceDate) : new Date();
    }
    if (!(effectiveUnit in unitToMilliseconds)) {
      throw new Error(`Unsupported time unit: "${unit}". Supported units: ${Object.keys(unitToMilliseconds).join(', ')}`);
    }
    return [unitToMilliseconds[effectiveUnit], baseDate.getTime()];
}

const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
  
export function parseLoc(input:number, units: string | undefined, verbose: boolean = false) {
    if (!units){
      if (typeof(input) == 'bigint'){
        return input;
      } else if (typeof(input) == 'number'){
        return input?.toFixed(2);
      } else {
        return input
      }
        
    }
    if (typeof(input) === 'bigint' || units.match(/^(\w+)\s+since\s+(.+)$/i)){
      if (!units){
        return Number(input)
      }
      try{
        const [scale, offset] = parseTimeUnit(units)
        const timeStamp = Number(input) * scale;
        const date = new Date(timeStamp + offset);
        if (verbose) {
          return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`; // e.g., "18 Aug 2025"
        } else {
          const day = date.getDate();
          const month = date.getMonth() + 1; // Months are 0-indexed
          const year = date.getFullYear();
          return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`; // e.g., "18-8-2025"
        }
      }
      catch{
        return input;
      }
    }
    if ( units.match(/(degree|degrees|deg|°)/i) ){
        if (input){
          return `${input.toFixed(2)}°`
        } else{
          return input
        } 
    }
    else {
        return input ? input.toFixed(2) : input;
    }
}

export function parseUVCoords({normal,uv}:{normal:THREE.Vector3,uv:THREE.Vector2}){
  const flipY = useGlobalStore.getState().flipY
  switch(true){
    case normal.z === 1:
      return [null, flipY ? 1-uv.y : uv.y, uv.x]
    case normal.z === -1:
      return [null, flipY ? 1-uv.y : uv.y, 1-uv.x]
    case normal.x === 1:
      return [1-uv.x, flipY ? 1- uv.y : uv.y, null]
    case normal.x === -1:
      return [uv.x, flipY ? 1-uv.y : uv.y, null]
    case normal.y === 1:
      return [1-uv.y, null, uv.x]
    default:
      return [0,0,0]
  }
}

export function getUnitAxis(vec: THREE.Vector3) { //Takes the normal of a cube interaction to figure out which axis to move along within the data for the timeseries
  if (Math.abs(vec.x) === 1) return 2;
  if (Math.abs(vec.y) === 1) return 1;
  if (Math.abs(vec.z) === 1) return 0;
  return null;
}

export function ArrayMinMax(array:number[] | TypedArray | TypedArrayBufferLike){
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < array.length; i++){
    minVal = array[i] < minVal ? array[i] : minVal
    maxVal = array[i] > maxVal ? array[i] : maxVal
  }
  return [minVal,maxVal]
}

export async function getVariablesOptions(variablesPromise: Promise<string[]> | undefined) {
    if (!variablesPromise) return [{ text: 'Default', value: 'Default' }];
    
    try {
        const variables = await variablesPromise;
        if (!Array.isArray(variables)) return [{ text: 'Default', value: 'Default' }];
        
        return [
            { text: 'Default', value: 'Default' },
            ...variables.map((element: string) => ({
                text: element,
                value: element
            }))
        ];
    } catch (error) {
        console.error('Error getting variables:', error);
        return [{ text: 'Default', value: 'Default' }];
    }
}

export function linspace(start: number, stop: number, num: number): number[] {
    const step = (stop - start) / (num - 1);
    return Array.from({ length: num }, (_, i) => start + step * i);
  }

export function ParseExtent(dimUnits: string[], dimArrays: number[][]){
  const {setLonExtent, setLatExtent, setLonResolution, setLatResolution, setOriginalExtent } = usePlotStore.getState();
  const {xSlice, ySlice} = usePlotStore.getState();
  const tempUnits = dimUnits.length > 2 ? dimUnits.slice(1) : dimUnits;
  let tryParse = false;
  for (const unit of tempUnits){
    if (!unit) continue;
    if (unit.match(/(degree|degrees|deg|°)/i)){
      tryParse = true;
      break;
    }
  }
  if (tryParse){
    const tempArrs = dimArrays.length > 2 ? dimArrays.slice(1) : dimArrays
    const minLat = tempArrs[0][ySlice[0]]
    const maxLat = tempArrs[0][ySlice[1]??tempArrs[0].length-1]
    let minLon = tempArrs[1][xSlice[0]]
    let maxLon = tempArrs[1][xSlice[1]?? tempArrs[1].length-1]
    minLon = minLon > 180 ? minLon - 360 : minLon
    maxLon = maxLon > 180 ? maxLon - 360 : maxLon
    setLonExtent([minLon, maxLon])
    setLatExtent([minLat, maxLat])

    const latRes = Math.abs(tempArrs[0][1] - tempArrs[0][0])
    const lonRes = Math.abs(tempArrs[1][1] - tempArrs[1][0])
    setLonResolution(lonRes)
    setLatResolution(latRes)
    setOriginalExtent(new THREE.Vector4(minLon, maxLon, minLat, maxLat))
  }
  else{
    setLonExtent([-180,180])
    setLatExtent([-90,90])
  }
}


interface TimeSeriesInfo{
  uv:THREE.Vector2,
  normal:THREE.Vector3
}
interface arrayInfo{
  data: Uint8Array<ArrayBufferLike> | Float32Array<ArrayBufferLike>,
  shape:number[],
  stride:number[]
}

export function GetTimeSeries(array : arrayInfo, TimeSeriesInfo:TimeSeriesInfo){
  const {uv,normal} = TimeSeriesInfo
  const {data, shape, stride} = array

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

function DecompressArray(compressed : Uint8Array){
	const decompressed = decompressSync(compressed)
	const floatArray = new Float16Array(decompressed.buffer)
	return floatArray
}

export function GetCurrentArray(overrideStore?:string){
  const { variable, is4D, idx4D, initStore, strides, dataShape, setStatus }= useGlobalStore.getState()
  const { arraySize, currentChunks } = useZarrStore.getState()
  const {cache} = useCacheStore.getState();
  const store = overrideStore ? overrideStore : initStore
  
  if (cache.has(is4D ? `${store}_${idx4D}_${variable}` : `${store}_${variable}`)){
      const chunk = cache.get(is4D ? `${store}_${idx4D}_${variable}` : `${store}_${variable}`)
      const compressed = chunk.compressed
      setStatus(compressed ? "Decompressing data..." : null)
      const thisData = compressed ? DecompressArray(chunk.data) : chunk.data
      setStatus(null)
			return thisData
  }
  else{
    const typedArray = new Float16Array(arraySize)
    const [xStartIdx, xEndIdx] = currentChunks.x
    const [yStartIdx, yEndIdx] = currentChunks.y
    const [zStartIdx, zEndIdx] = currentChunks.z
    let chunkShape;
    let chunkStride;
    for (let z = zStartIdx; z < zEndIdx; z++) {
      for (let y = yStartIdx; y < yEndIdx; y++) {
        for (let x = xStartIdx; x < xEndIdx; x++) {
          const chunkID = `z${z}_y${y}_x${x}`
          const cacheName = is4D ? `${store}_${variable}_${idx4D}_chunk_${chunkID}` : `${store}_${variable}_chunk_${chunkID}`
          const chunk = cache.get(cacheName)
          const compressed = chunk.compressed
          const thisData = compressed ? DecompressArray(chunk.data) : chunk.data
          if (!chunkShape) {
            chunkShape = chunk.shape
            chunkStride = chunk.stride
          }
          copyChunkToArray(
            thisData,
            chunkShape,
            chunkStride,
            typedArray,
            dataShape,
            strides as [number, number, number], 
            [z, y, x], 
            [zStartIdx, yStartIdx, xStartIdx]
          )
        }
      }
    }
    setStatus(null)
    return typedArray
  }
}

export function TwoDecimals(val: number){
    return Math.round(val * 100)/100
}


export async function GetDimInfo(variable:string){
  const {useNC} = useZarrStore.getState()
    if (useNC){
      const output = GetNCDims(variable)
      return output
    } else {
      const output = GetZarrDims(variable)
      return output
    }
  }      


export function deg2rad(deg: number){
  return deg*Math.PI/180;
}

export function normalize(val: number | null | undefined, min:number, max:number){
  if (!val && val !=0) return undefined;
  return (val-min)/(max-min)
}

export function denormalize(  norm: number | null | undefined,  min: number,  max: number) {
  if (!norm && norm !== 0) return undefined;
  return norm * (max - min) + min;
}