//This File will have functions converting the array information into 2D or 3D textures that we will pass to the corresponding 2D or 3D object
import * as THREE from 'three'
import { ArrayMinMax} from '@/utils/HelperFuncs';
import { useGlobalStore } from '@/utils/GlobalStates';

interface Array {
    data: Float32Array | Float64Array | Int32Array | Uint32Array | Float32Array;
    shape: number[];
}

// ? Please, try when possible to define the types of your variables. Otherwise building will fail.
function ArrayTo2D(array: Array): [ THREE.DataTexture, {minVal: number, maxVal: number}]{
    //We assume there is no slicing here. That will occur in the ZarrLoader stage. This is just pure data transfer
    const shape = array.shape;
    const data = array.data;
    const width = shape[1];
    const height = shape[0];
    const [minVal,maxVal] = ArrayMinMax(data)
    const normed = data.map((i)=>(i-minVal)/(maxVal-minVal))

    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254))
    const texture = new THREE.DataTexture(
        textureData,
        width,
        height,
        THREE.RedFormat,
        THREE.UnsignedByteType
    );

    // Update texture
    texture.needsUpdate = true;
    return [texture, {maxVal,minVal}]
}

export function ArrayTo3D(array: Array) : [ THREE.Data3DTexture[], {minVal: number, maxVal: number}]{
    const {textureArrayDepths} = useGlobalStore.getState()
    const shape = array.shape;
    const data = array.data;
    const [lz,ly,lx] = shape
    const [minVal,maxVal] = ArrayMinMax(data)
    
    // Calculate chunk dimensions
    const chunkSize = {
        z: Math.ceil(lz / textureArrayDepths[0]),
        y: Math.ceil(ly / textureArrayDepths[1]),
        x: Math.ceil(lx / textureArrayDepths[2])
    };
    //@ts-ignore It is float16 stop crying
    const chunkData = chunkArray(data as Float16Array, {z:lz, y:ly, x:lx}, chunkSize, textureArrayDepths)
    const chunks = []
    for (const chunkArray of chunkData){
        const normed = chunkArray.map((i)=>(i-minVal)/(maxVal-minVal))
        const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254));   
        const volTexture = new THREE.Data3DTexture(textureData, chunkSize.x, chunkSize.y, chunkSize.z);
        volTexture.format = THREE.RedFormat;
        volTexture.minFilter = THREE.NearestFilter;
        volTexture.magFilter = THREE.NearestFilter;
        volTexture.needsUpdate = true;
        chunks.push(volTexture)
    }
    console.log(chunks)
    return [chunks, {maxVal,minVal}]
}

export function ArrayToTexture(array: Array): [ THREE.Data3DTexture[] | THREE.DataTexture, {minVal: number, maxVal: number}]{
    const shape = array.shape;
    const [texture,scales] = shape.length == 3 ? ArrayTo3D(array) : ArrayTo2D(array);
    return [texture, scales];
}

export function DefaultCubeTexture() {
    // Create a Float32Array instead of regular array
    const data = new Float32Array(1000);
    // Fill with random values
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() < 0.2 ? NaN : Math.random();
    }
    
    const shape = [10, 10, 10];
    const array: Array = {
        data,
        shape,
    }
    const [texture, _scaling] = ArrayTo3D(array)
    return texture
}

function chunkArray(
  arr: Float16Array,
  dims: { z: number; y: number; x: number },
  chunkSize: { z: number; y: number; x: number },
  resolution: number[]
): Float16Array[] {
  const chunks: Float16Array[] = [];
 
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
        const chunk = new Float16Array(chunkDepth * chunkHeight * rowLength);
        
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
        chunks.push(chunk);
      }
    }
  }
  
  return chunks;
}