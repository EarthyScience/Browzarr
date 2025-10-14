//This File will have functions converting the array information into 2D or 3D textures that we will pass to the corresponding 2D or 3D object
import * as THREE from 'three'
import { ArrayMinMax} from '@/utils/HelperFuncs';
import { useCacheStore, useGlobalStore } from '@/utils/GlobalStates';

interface Array {
    data: Float32Array | Float64Array | Int32Array | Uint32Array | Float32Array | Float16Array | Uint8Array;
    shape: number[];
}

function ArrayTo2D(array: Array, valueScales?: {maxVal: number, minVal: number}): [ THREE.DataTexture[], {minVal: number, maxVal: number}]{
    const {textureArrayDepths} = useGlobalStore.getState()
    const shape = array.shape;
    const data = array.data;
    const width = shape[1];
    const height = shape[0];
    const [minVal,maxVal] = valueScales ? [valueScales.minVal, valueScales.maxVal] : ArrayMinMax(data)
    const chunkSize = {
        y: Math.floor(height / textureArrayDepths[1]),
        x: Math.floor(width / textureArrayDepths[2])
    };
    //@ts-ignore It is float16 stop crying
    const chunkData = chunkArray2D(data as Float16Array, {y:height, x:width}, chunkSize)
    const chunks = []
    for (const chunk of chunkData){
        const normed = chunk.data.map((i)=>(i-minVal)/(maxVal-minVal))
        const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254));   
        const texture = new THREE.DataTexture(
            textureData,
            chunk.dims.x,
            chunk.dims.y,
            THREE.RedFormat,
            THREE.UnsignedByteType
        );
        texture.needsUpdate = true;
        chunks.push(texture)
    }
    return [chunks, {maxVal,minVal}]
}

export function ArrayTo3D(array: Array, valueScales?: {maxVal: number, minVal: number}) : [ THREE.Data3DTexture[], {minVal: number, maxVal: number}]{
    const {textureArrayDepths, setTextureData} = useGlobalStore.getState()
    const shape = array.shape;
    const data = array.data;
    const [lz,ly,lx] = shape
    const [minVal,maxVal] = valueScales ? [valueScales.minVal, valueScales.maxVal] : ArrayMinMax(data)
    const normed = array.data.map((i)=>(i-minVal)/(maxVal-minVal))
    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254));  
    setTextureData(textureData)
    // Calculate chunk dimensions
    const chunkSize = {
        z: Math.floor(lz / textureArrayDepths[0]),
        y: Math.floor(ly / textureArrayDepths[1]),
        x: Math.floor(lx / textureArrayDepths[2])
    };
    const chunkData = chunkArray(textureData, {z:lz, y:ly, x:lx}, chunkSize, textureArrayDepths)
    const chunks = []
    for (const chunk of chunkData){   
        //@ts-ignore stop whining
        const volTexture = new THREE.Data3DTexture(chunk.data, chunk.dims.x, chunk.dims.y, chunk.dims.z);
        volTexture.format = THREE.RedFormat;
        volTexture.minFilter = THREE.NearestFilter;
        volTexture.magFilter = THREE.NearestFilter;
        volTexture.needsUpdate = true;
        chunks.push(volTexture)
    }
    return [chunks, {maxVal,minVal}]
}

export function ArrayToTexture(array: Array, valueScales?: {maxVal: number, minVal: number}, cached?: boolean): [ THREE.Data3DTexture[] | THREE.DataTexture[], {minVal: number, maxVal: number}]{
    const shape = array.shape;
    if (cached){
      array.data = useGlobalStore.getState().textureData
    }
    const [textures,scales] = shape.length == 3 ? ArrayTo3D(array, valueScales) : ArrayTo2D(array, valueScales);
    return [textures, scales];
}

export function GetCurrentTexture(shape: number[]) : THREE.DataTexture[] | THREE.Data3DTexture[] {
  const {textureData, textureArrayDepths} = useGlobalStore.getState()

  if (shape.length == 2){
    const width = shape[1];
    const height = shape[0];
    const chunkSize = {
        y: Math.floor(height / textureArrayDepths[1]),
        x: Math.floor(width / textureArrayDepths[2])
    };
    //@ts-ignore It is float16 stop crying
    const chunkData = chunkArray2D(textureData as Float16Array, {y:height, x:width}, chunkSize)
    const chunks = []
    for (const chunk of chunkData){
        const texture = new THREE.DataTexture(
            chunk.data,
            chunk.dims.x,
            chunk.dims.y,
            THREE.RedFormat,
            THREE.UnsignedByteType
        );
        texture.needsUpdate = true;
        chunks.push(texture)
    }
    return chunks
  } else {
    const [lz,ly,lx] = shape
    const chunkSize = {
        z: Math.floor(lz / textureArrayDepths[0]),
        y: Math.floor(ly / textureArrayDepths[1]),
        x: Math.floor(lx / textureArrayDepths[2])
    };
    const chunkData = chunkArray(textureData, {z:lz, y:ly, x:lx}, chunkSize, textureArrayDepths)
    const chunks = []
    for (const chunk of chunkData){   
        //@ts-ignore stop whining
        const volTexture = new THREE.Data3DTexture(chunk.data, chunk.dims.x, chunk.dims.y, chunk.dims.z);
        volTexture.format = THREE.RedFormat;
        volTexture.minFilter = THREE.NearestFilter;
        volTexture.magFilter = THREE.NearestFilter;
        volTexture.needsUpdate = true;
        chunks.push(volTexture)
    }
    return chunks
  }
}


function chunkArray(
  arr: Uint8Array,
  dims: { z: number; y: number; x: number },
  chunkSize: { z: number; y: number; x: number },
  resolution: number[]
): { data: Uint8Array; dims: { x: number; y: number; z: number } }[] {
  const chunks: { data: Uint8Array; dims: { x: number; y: number; z: number } }[] = [];
 
  // Strides for navigating the source array
  const sourceStride = {
    z: dims.y * dims.x,
    y: dims.x
  };
  
  // Iterate through each chunk position
  for (let cz = 0; cz < resolution[0]; cz++) {
    for (let cy = 0; cy < resolution[1]; cy++) {
      for (let cx = 0; cx < resolution[2]; cx++) {
        // Calculate the starting indices for this chunk
        const startZ = cz * chunkSize.z;
        const startY = cy * chunkSize.y;
        const startX = cx * chunkSize.x;
        
        // Calculate the ending indices (don't exceed array bounds)
        const endZ = Math.min(startZ + chunkSize.z, dims.z);
        const endY = Math.min(startY + chunkSize.y, dims.y);
        const endX = Math.min(startX + chunkSize.x, dims.x);
        
        const rowLength = endX - startX;
        const chunkDepth = endZ - startZ;
        const chunkHeight = endY - startY;
        
        // Pre-allocate the typed array for this chunk
        const chunk = new Uint8Array(chunkDepth * chunkHeight * rowLength);
        let chunkOffset = 0;
        
        // Extract row by row
        for (let z = startZ; z < endZ; z++) {
          for (let y = startY; y < endY; y++) {
            // Calculate the offset to the start of this row in the source array
            const rowOffset = z * sourceStride.z + y * sourceStride.y + startX;
            
            // Copy the entire row directly into the chunk
            chunk.set(arr.subarray(rowOffset, rowOffset + rowLength), chunkOffset);
            chunkOffset += rowLength;
          }
        }
        chunks.push({ data: chunk, dims: { x: rowLength, y: chunkHeight, z: chunkDepth } });
      }
    }
  }
  
  return chunks;
}

function chunkArray2D(
  arr: Float16Array,
  dims: { y: number; x: number },
  chunkSize: { y: number; x: number }
): { data: Float16Array; dims: { x: number; y: number } }[] {
  const chunks: { data: Float16Array; dims: { x: number; y: number } }[] = [];

  // Calculate how many chunks there will be along each axis
  const numChunksY = Math.ceil(dims.y / chunkSize.y);
  const numChunksX = Math.ceil(dims.x / chunkSize.x);

  // Iterate through each chunk position
  for (let cy = 0; cy < numChunksY; cy++) {
    for (let cx = 0; cx < numChunksX; cx++) {
      // Calculate the starting indices for this chunk
      const startY = cy * chunkSize.y;
      const startX = cx * chunkSize.x;

      // Calculate the ending indices, ensuring they don't exceed array bounds
      const endY = Math.min(startY + chunkSize.y, dims.y);
      const endX = Math.min(startX + chunkSize.x, dims.x);

      // Determine the actual dimensions of this chunk
      const chunkHeight = endY - startY;
      const rowLength = endX - startX;

      // Skip creating a chunk if it has no size
      if (chunkHeight <= 0 || rowLength <= 0) {
        continue;
      }

      // Pre-allocate the typed array for this chunk's data
      const chunk = new Float16Array(chunkHeight * rowLength);
      let chunkOffset = 0;

      // Extract data row by row for this chunk
      for (let y = startY; y < endY; y++) {
        // Calculate the offset to the start of this row in the source array
        const sourceRowOffset = y * dims.x + startX;

        // Efficiently copy the entire row segment into the chunk
        chunk.set(
          arr.subarray(sourceRowOffset, sourceRowOffset + rowLength),
          chunkOffset
        );
        chunkOffset += rowLength;
      }
      
      chunks.push({ data: chunk, dims: { x: rowLength, y: chunkHeight } });
    }
  }

  return chunks;
}