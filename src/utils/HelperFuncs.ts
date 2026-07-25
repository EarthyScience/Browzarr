'use client';
import * as THREE from 'three'
import { useCacheStore } from '@/GlobalStates/CacheStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { decompressSync } from 'fflate';
import { copyChunkToArray, copyChunkToArray2D } from '@/components/zarr/utils';
import { GetNCDims } from '@/components/zarr/NCGetters';
import { GetZarrDims } from '@/components/zarr/ZarrLoaderLRU';

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

// Map of CF time unit names and short aliases (h, hr, hrs, s, min, etc.) to milliseconds per unit.
export const unitToMilliseconds: Record<string, number> = {
  millisecond: 1,
  milliseconds: 1,
  msec: 1,
  msecs: 1,
  ms: 1,
  second: 1000,
  seconds: 1000,
  sec: 1000,
  secs: 1000,
  s: 1000,
  minute: 60 * 1000,
  minutes: 60 * 1000,
  min: 60 * 1000,
  mins: 60 * 1000,
  hour: 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  hr: 60 * 60 * 1000,
  hrs: 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// Short display suffix mapping for relative time duration labels (e.g., 'hours' -> 'h').
const timeUnitSuffix: Record<string, string> = {
  millisecond: 'ms',
  milliseconds: 'ms',
  msec: 'ms',
  msecs: 'ms',
  ms: 'ms',
  second: 's',
  seconds: 's',
  sec: 's',
  secs: 's',
  s: 's',
  minute: 'min',
  minutes: 'min',
  min: 'min',
  mins: 'min',
  hour: 'h',
  hours: 'h',
  hr: 'h',
  hrs: 'h',
  h: 'h',
  day: 'd',
  days: 'd',
  d: 'd',
};

export function parseTimeUnit(units: string | undefined): [number, number] {
    if (units === "Default"){
        return [1, 0];
    }

    if (!units || typeof units !== 'string' || units.trim() === '') {
      return [1, 0]; 
    }
    
    const trimmedUnits = units.trim();
    // Regular expression to match CF time units (e.g., "seconds since 1970-01-01")
    const match = trimmedUnits.match(/^(\w+)\s+since\s+(.+)$/i);
    if (!match) {
      // Handle bare time duration units without a "since" clause (e.g. "hours", "h", "lead_time" units)
      const bareUnit = trimmedUnits.toLowerCase();
      const singularBare = bareUnit.endsWith('s') ? bareUnit.slice(0, -1) : bareUnit;
      const effectiveBare = unitToMilliseconds[bareUnit] !== undefined ? bareUnit : singularBare;
      if (effectiveBare in unitToMilliseconds) {
        return [unitToMilliseconds[effectiveBare], 0];
      }
      throw new Error(`Invalid time unit format: expected "<unit> since <date>", got "${units}"`);
    }
    
    const [_, unit, referenceDate] = match;
    const normalizedUnit = unit.toLowerCase();
    
    const singularUnit = normalizedUnit.endsWith('s') ? normalizedUnit.slice(0, -1) : normalizedUnit;
    const effectiveUnit = unitToMilliseconds[normalizedUnit] !== undefined ? normalizedUnit : singularUnit;
    if (!(effectiveUnit in unitToMilliseconds)) {
      throw new Error(`Unsupported time unit: "${unit}". Supported units: ${Object.keys(unitToMilliseconds).join(', ')}`);
    }

    let baseDate: Date;
    let s = referenceDate.trim().replace(" ", "T");
    // Ensure ISO date-times without explicit timezone parse as UTC per CF convention instead of local time
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
    if (!hasTz && s.includes("T")) s += "Z";

    if (referenceDate.length <= 10 && !referenceDate.includes("T")){
      const [year, month, day] = referenceDate.split('-');
      baseDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    } else {
      const parsedMs = Date.parse(s);
      baseDate = !isNaN(parsedMs) ? new Date(parsedMs) : new Date(referenceDate);
    }
    return [unitToMilliseconds[effectiveUnit], baseDate.getTime()];
}

const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
  
export function parseLoc(input: any, units: string | undefined, verbose: boolean = false) {
    if (input === null || input === undefined) return input;
    if (!units || typeof units !== 'string' || units.trim() === '') {
      if (typeof input === 'bigint') return input;
      if (typeof input === 'number') return input.toFixed(2);
      return input;
    }

    const trimmedUnits = units.trim();
    const lowerUnits = trimmedUnits.toLowerCase();

    // 1. Check for CF time unit with "since" (absolute datetime)
    const sinceMatch = trimmedUnits.match(/^(\w+)\s+since\s+(.+)$/i);
    if (typeof input === 'bigint' || sinceMatch) {
      try {
        const [scale, offset] = parseTimeUnit(trimmedUnits);
        const timeStamp = Number(input) * scale;
        const date = new Date(timeStamp + offset);
        
        const day = date.getUTCDate();
        const month = date.getUTCMonth() + 1; // Months are 0-indexed
        const year = date.getUTCFullYear();
        const hours = date.getUTCHours();
        const mins = date.getUTCMinutes();
        const secs = date.getUTCSeconds();
        
        const unitName = sinceMatch ? sinceMatch[1].toLowerCase() : '';
        // Include hour/min/sec aliases so time (HH:mm) is displayed for sub-day absolute datetimes
        const isSubDayUnit = ['hour', 'hours', 'hr', 'hrs', 'h', 'minute', 'minutes', 'min', 'mins', 'second', 'seconds', 'sec', 'secs', 's', 'ms', 'msec', 'msecs'].includes(unitName);
        const showTime = isSubDayUnit || lowerUnits.includes('hour') || lowerUnits.includes('hr') || lowerUnits.includes('h') || lowerUnits.includes('min') || lowerUnits.includes('sec') || hours !== 0 || mins !== 0 || secs !== 0;
        
        if (verbose) {
          let dateStr = `${day} ${months[month - 1]} ${year}`;
          if (showTime) {
             dateStr += ` ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
             if (secs !== 0 || ['second', 'seconds', 'sec', 'secs', 's'].includes(unitName)) dateStr += `:${String(secs).padStart(2, '0')}`;
          }
          return dateStr;
        } else {
          let dateStr = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
          if (showTime) {
             dateStr += ` ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
             if (secs !== 0 || ['second', 'seconds', 'sec', 'secs', 's'].includes(unitName)) dateStr += `:${String(secs).padStart(2, '0')}`;
          }
          return dateStr;
        }
      }
      catch{
        return input;
      }
    }

    // 2. Format relative duration coordinates into clean human time unit labels
    const singularBare = lowerUnits.endsWith('s') ? lowerUnits.slice(0, -1) : lowerUnits;
    const effectiveBare = unitToMilliseconds[lowerUnits] !== undefined ? lowerUnits : singularBare;
    if (effectiveBare in unitToMilliseconds) {
      const num = Number(input);
      if (isNaN(num)) return input;
      const perUnitMs = unitToMilliseconds[effectiveBare];
      const ms = num * perUnitMs;

      const isHourUnit = ['hour', 'hours', 'hr', 'hrs', 'h'].includes(effectiveBare);
      const isDayUnit = ['day', 'days', 'd'].includes(effectiveBare);
      const isMinUnit = ['minute', 'minutes', 'min', 'mins'].includes(effectiveBare);

      if (isDayUnit) {
        return Number.isInteger(num) ? `${num} d` : `${num.toFixed(2)} d`;
      }
      if (isHourUnit) {
        return Number.isInteger(num) ? `${num} h` : `${num.toFixed(2)} h`;
      }
      if (isMinUnit) {
        if (ms % 3_600_000 === 0 && ms !== 0) return `${ms / 3_600_000} h`;
        return Number.isInteger(num) ? `${num} min` : `${num.toFixed(2)} min`;
      }

      // For sub-minute units (e.g. seconds, ms), upconvert whole hours to "h" and whole minutes to "min"
      if (Number.isInteger(ms)) {
        if (ms % 3_600_000 === 0) return `${ms / 3_600_000} h`;
        if (ms % 60_000 === 0) return `${ms / 60_000} min`;
        if (ms % 1000 === 0) return `${ms / 1000} s`;
        return `${ms} ms`;
      }
      const suffix = timeUnitSuffix[effectiveBare] || 's';
      return `${num.toFixed(2)} ${suffix}`;
    }

    // 3. Degrees
    if (lowerUnits.match(/(degree|degrees|deg|°)/i)) {
        if (input !== undefined && input !== null){
          return `${Number(input).toFixed(2)}°`
        } else{
          return input
        } 
    }

    // 4. Default fallback
    return (input !== undefined && input !== null && typeof input !== 'string') ? Number(input).toFixed(2) : input;
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
    case normal.y === -1:
      return [uv.y, null, uv.x]
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

export function ArrayMinMax(array:number[] | TypedArray | TypedArrayBufferLike): [number, number, number | undefined] {
  let minVal = Infinity;
  let maxVal = -Infinity;
  let minPosVal = Infinity;
  for (let i = 0; i < array.length; i++){
    const v = array[i];
    if (!isNaN(v)) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      if (v > 0 && v < minPosVal) minPosVal = v;
    }
  }
  return [minVal, maxVal, minPosVal === Infinity ? undefined : minPosVal];
}

export function getLogEps(minVal: number, maxVal: number, minPosVal?: number): number {
  if (minVal > 0) return 0.000001;
  const range = maxVal - minVal;
  if (range <= 0) return 0.0001;
  const posMin = (minPosVal !== undefined && minPosVal > 0)
    ? Math.max(minPosVal, maxVal * 1e-6)
    : Math.max(maxVal * 1e-4, 1e-6);
  const xPos = (posMin - minVal) / range;
  return Math.max(Math.min(xPos, 0.5), 0.000001);
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

export function ParseExtent(dimUnits: string[], dimArrays: any[][]){
  const {setLonExtent, setLatExtent, setLonResolution, setLatResolution, setOriginalExtent } = usePlotStore.getState();
  const {xSlice, ySlice} = usePlotStore.getState();
  const {axisMapping} = useZarrStore.getState();
  const shapeLength = dimArrays.length;
  const xIdx = axisMapping.x >= 0 ? axisMapping.x : shapeLength - 1;
  const yIdx = axisMapping.y >= 0 ? axisMapping.y : shapeLength - 2;

  let tryParse = false;
  const xUnit = dimUnits[xIdx];
  const yUnit = dimUnits[yIdx];

  if ((xUnit && xUnit.match(/(degree|degrees|deg|°)/i)) || (yUnit && yUnit.match(/(degree|degrees|deg|°)/i))) {
      tryParse = true;
  }

  if (tryParse){
    const xArray = dimArrays[xIdx] || [];
    const yArray = dimArrays[yIdx] || [];

    const minLat = Number(yArray[ySlice[0]]);
    const maxLatIdx = ySlice[1] !== null ? ySlice[1] - 1 : yArray.length - 1;
    const maxLat = Number(yArray[maxLatIdx]);
    
    let minLon = Number(xArray[xSlice[0]]);
    const maxLonIdx = xSlice[1] !== null ? xSlice[1] - 1 : xArray.length - 1;
    let maxLon = Number(xArray[maxLonIdx]);

    let finalMinLon = Math.min(minLon, maxLon);
    let finalMaxLon = Math.max(minLon, maxLon);
    let finalMinLat = Math.min(minLat, maxLat);
    let finalMaxLat = Math.max(minLat, maxLat);

    if (finalMaxLon > 180){
      finalMaxLon -= 180
      finalMinLon -= 180
      usePlotStore.setState({is360Deg:true})
    } else{
      usePlotStore.setState({is360Deg:false})
    }
    setLonExtent([finalMinLon, finalMaxLon])
    setLatExtent([finalMinLat, finalMaxLat])

    const latRes = Math.abs(Number(yArray[1] ?? 0) - Number(yArray[0] ?? 0)) || 1;
    const lonRes = Math.abs(Number(xArray[1] ?? 0) - Number(xArray[0] ?? 0)) || 1;
    setLonResolution(lonRes)
    setLatResolution(latRes)
    setOriginalExtent(new THREE.Vector4(finalMinLon, finalMaxLon, finalMinLat, finalMaxLat))
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
  const { variable, idx4D, initStore, strides, dataShape }= useGlobalStore.getState()
  const { arraySize, currentChunks, ndSlices } = useZarrStore.getState()
  const {cache} = useCacheStore.getState();
  const store = overrideStore ? overrideStore : initStore
  
  const scalarIndices = (ndSlices && ndSlices.length > 0) ? ndSlices.filter(s => typeof s === "number").join("_") : "";
  let cacheBase = scalarIndices !== "" ? `${store}_${variable}_${scalarIndices}` : `${store}_${variable}`;
  if (ndSlices && ndSlices.length >= 4 && idx4D !== undefined && idx4D !== null) {
      cacheBase = `${cacheBase}_time${idx4D}`;
  }
  
  if (cache.has(cacheBase)){
      const chunk = cache.get(cacheBase)
      const compressed = chunk?.compressed
      const thisData = compressed ? DecompressArray(chunk.data) : chunk.data
			return thisData
  }
  else{
    const typedArray = new Float16Array(arraySize)
    const [xStartIdx, xEndIdx] = currentChunks.x
    const [yStartIdx, yEndIdx] = currentChunks.y
    const [zStartIdx, zEndIdx] = currentChunks.z

    const hasZ = strides.length > 2;

    for (let z = zStartIdx; z < zEndIdx; z++) {
      for (let y = yStartIdx; y < yEndIdx; y++) {
        for (let x = xStartIdx; x < xEndIdx; x++) {
          const chunkID = `z${z}_y${y}_x${x}`
          const cacheName = `${cacheBase}_chunk_${chunkID}`
          const chunk = cache.get(cacheName)
          if (!chunk) continue;
          const compressed = chunk.compressed
          const thisData = compressed ? DecompressArray(chunk.data) : chunk.data
          if (hasZ) {
            copyChunkToArray(
              thisData,
              chunk.shape,
              chunk.stride,
              typedArray,
              dataShape,
              strides as [number, number, number], 
              [z, y, x], 
              chunk.fullChunkDim || [1, 1, 1],
              chunk.sliceStart || [0, 0, 0]
            )
          } else {
            copyChunkToArray2D(
              thisData,
              chunk.shape,
              chunk.stride,
              typedArray,
              dataShape,
              strides as [number, number], 
              [y, x], 
              chunk.fullChunkDim ? chunk.fullChunkDim.slice(-2) : [1, 1],
              chunk.sliceStart ? chunk.sliceStart.slice(-2) : [0, 0]
            )
          }
        }
      }
    }
    cache.set(cacheBase, { data: typedArray, compressed: false })
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

export function HandleKernelNums(e: string){
  const newVal = parseInt(e);
  if (newVal % 2 == 0){
    return Math.max(1, newVal - 1)
  }
  else{
    return newVal
  }
}

export function HandleCoarselNums(e: string){
  const newVal = parseInt(e);
  if (newVal % 2 == 1){
    return Math.max(1, newVal - 1 )
  }
  else{
    return newVal
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

export function coarsen3DArray(
  array: Float16Array,
  shape: [number, number, number],
  strides: [number, number, number],
  spatialFactor: number,
  depthFactor: number,
  newSize: number
) {
  const [dimZ, dimY, dimX] = shape;
  const [strideZ, strideY, strideX] = strides;
  const spatialOffset = Math.floor(spatialFactor / 2);
  const depthOffset = Math.floor(depthFactor / 2);
  const outputArray = new Float16Array(newSize)

  let outputIdx = 0;
  for (let z = depthOffset; z < dimZ; z += depthFactor) {
    for (let y = spatialOffset; y < dimY; y += spatialFactor) {
      for (let x = spatialOffset; x < dimX; x += spatialFactor) {
        // Calculate the flat index using strides
        const flatIndex = z * strideZ + y * strideY + x * strideX;
        outputArray[outputIdx] = array[flatIndex];
        outputIdx++;
      }
    }
  }
  return outputArray
}

export function coarsenFlatArray(
  array: any,
  factor: number
) {
  const offset = Math.floor(factor/2);
  const output = [];
  for ( let i = offset; i < array.length-offset; i += factor){
    output.push(array[i])
  }
  return output
}


export function calculateStrides(
  shape: number[]
){
  const newStrides = shape.map((_val, idx) => {
    return shape.reduce((a: number, b: number, i: number) => a * (i > idx ? b : 1), 1)
  })
  return newStrides
}

export function parseColorToVec4(hex: string, alpha = 1.0): THREE.Vector4 {
  if (!hex) return new THREE.Vector4(0, 0, 0, alpha);
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  if (isNaN(bigint)) return new THREE.Vector4(0, 0, 0, alpha);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return new THREE.Vector4(r, g, b, alpha);
}