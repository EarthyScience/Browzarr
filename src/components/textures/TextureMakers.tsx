//This File will have functions converting the array information into 2D or 3D textures that we will pass to the corresponding 2D or 3D object
import * as THREE from 'three'
import { ArrayMinMax, GetCurrentArray, TypedArray, TypedArrayBufferLike  } from '@/utils/HelperFuncs';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { clamp } from 'three/src/math/MathUtils.js';

interface Array {
    data: TypedArray | TypedArrayBufferLike;
    shape: number[];
}

function StoreData(array:  TypedArray | TypedArrayBufferLike, valueScales?: {maxVal: number, minVal: number}, useF16=false): {minVal: number, maxVal: number}{
    const { setTextureData } = useGlobalStore.getState()
    const [minVal,maxVal] = valueScales ? [valueScales.minVal, valueScales.maxVal] : ArrayMinMax(array)
    const textureData = useF16 ? new Uint16Array(array.length) : new Uint8Array(array.length)
    const range = (maxVal - minVal)
    for (let i = 0; i < array.length; i++){
      const normed = (array[i] - minVal) / range;
      if (isNaN(normed)){
        textureData[i] = useF16 
			?	THREE.DataUtils.toHalfFloat(NaN)
			:	255;
      } else {
        textureData[i] = useF16
			?	THREE.DataUtils.toHalfFloat(normed)
			:	normed * 254;
      }
    };
    setTextureData(textureData)
    return {minVal, maxVal}
}

export function CreateTexture(shape: number[], data?: Uint8Array | Uint16Array, useF16=false) : THREE.DataTexture[] | THREE.Data3DTexture[] | undefined {
  const {textureArrayDepths, bivariate} = useGlobalStore.getState()
  const textureData = data ?? useGlobalStore.getState().textureData
  if (!textureData) return;

  const numComponents = bivariate ? 2 : 1;
  const format = bivariate ? THREE.RGFormat : THREE.RedFormat;

  if (shape.length == 2){
    const width = shape[1];
    const height = shape[0];
    const chunkSize = {
        y: Math.floor(height / textureArrayDepths[1]),
        x: Math.floor(width / textureArrayDepths[2]),
        z: 1
    };
    const chunkData = chunkArray(textureData as Uint8Array, {y:height, x:width, z:1}, chunkSize, useF16, numComponents)
    const chunks = []
    for (const chunk of chunkData){
        const texture = new THREE.DataTexture(
            chunk.data,
            chunk.dims.x,
            chunk.dims.y,
            format,
            useF16 ? THREE.HalfFloatType : THREE.UnsignedByteType
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
    const chunkData = chunkArray(textureData, {z:lz, y:ly, x:lx}, chunkSize, useF16, numComponents)
    const chunks = []
    for (const chunk of chunkData){   
        //@ts-ignore stop whining
        const volTexture = new THREE.Data3DTexture(chunk.data, chunk.dims.x, chunk.dims.y, chunk.dims.z);
        volTexture.format = format;
        volTexture.minFilter = THREE.NearestFilter;
        volTexture.magFilter = THREE.NearestFilter;
		    volTexture.type = useF16 ? THREE.HalfFloatType : THREE.UnsignedByteType
        volTexture.needsUpdate = true;
        chunks.push(volTexture)
    }
    return chunks
  }
}

export function createDataTexture(){
  const { dataShape, bivariate, setMainTextures, setValueScales} = useGlobalStore.getState();
  if (bivariate){setValueScales(storeBivariate());}
  else{
    const dataArray = GetCurrentArray();
    setValueScales([StoreData(dataArray)]);
  }
  const textures = CreateTexture(dataShape);
  setMainTextures(textures);
}

export function ArrayToTexture(array: Array, valueScales?: {maxVal: number, minVal: number}, useF16=false): [ THREE.Data3DTexture[] | THREE.DataTexture[], {minVal: number, maxVal: number}]{
    const scales = StoreData(array.data, valueScales, useF16);
    const textures = CreateTexture(array.shape, undefined, useF16)
    return [textures as THREE.Data3DTexture[] | THREE.DataTexture[], scales];
}

export function storeBivariate(useF16=false): {minVal: number, maxVal: number}[]{
	const {variable, variable2, shareScale, dataShape, setTextureData} = useGlobalStore.getState();
	const dataLength = dataShape.reduce((a, b) => a * b , 1)
	let minVal: number, maxVal: number;
	const textureData = useF16 ? new Uint16Array(dataLength * 2) : new Uint8Array(dataLength * 2)
	const variables = [variable, variable2];
  const valueScales: {minVal:number, maxVal:number}[] = []
	variables.forEach((thisVar, idx) =>{
		const array = GetCurrentArray(undefined, thisVar);
		if (!shareScale || idx == 0) [minVal, maxVal] = ArrayMinMax(array);
    valueScales.push({minVal,maxVal})
		const range = (maxVal - minVal)
		for (let i = 0; i < dataLength; i++){
			let normed = (array[i] - minVal) / range;
			if (isNaN(normed)){
				textureData[i * 2 + idx] = useF16 
					?	THREE.DataUtils.toHalfFloat(NaN)
					:	255;
			} else {
				textureData[i * 2 + idx] = useF16
					?	THREE.DataUtils.toHalfFloat(normed)
					:	clamp(normed, 0, 1) * 254;
			}
		};
	})
	setTextureData(textureData)
    return valueScales
}

function chunkArray(
  arr: Uint8Array | Uint16Array,
  dims: { z?: number; y: number; x: number },
  chunkSize: { z?: number; y: number; x: number },
  useF16 = false,
  numComponents = 1
): { data: Uint8Array | Uint16Array; dims: { x: number; y: number; z: number } }[] {
  const dz = dims.z ?? 1;
  const csz = chunkSize.z ?? dz; // one chunk deep if z not given

  const chunks: { data: Uint8Array | Uint16Array; dims: { x: number; y: number; z: number } }[] = [];

  const sourceStride = {
    z: dims.y * dims.x * numComponents,
    y: dims.x * numComponents
  };

  const numChunksZ = Math.ceil(dz / csz);
  const numChunksY = Math.ceil(dims.y / chunkSize.y);
  const numChunksX = Math.ceil(dims.x / chunkSize.x);

  for (let cz = 0; cz < numChunksZ; cz++) {
    for (let cy = 0; cy < numChunksY; cy++) {
      for (let cx = 0; cx < numChunksX; cx++) {
        const startZ = cz * csz;
        const startY = cy * chunkSize.y;
        const startX = cx * chunkSize.x;

        const endZ = Math.min(startZ + csz, dz);
        const endY = Math.min(startY + chunkSize.y, dims.y);
        const endX = Math.min(startX + chunkSize.x, dims.x);

        const rowLength = endX - startX;
        const chunkDepth = endZ - startZ;
        const chunkHeight = endY - startY;

        if (chunkDepth <= 0 || chunkHeight <= 0 || rowLength <= 0) continue;

        const rowElements = rowLength * numComponents;

        const chunk = useF16
          ? new Uint16Array(chunkDepth * chunkHeight * rowElements)
          : new Uint8Array(chunkDepth * chunkHeight * rowElements);
        let chunkOffset = 0;

        for (let z = startZ; z < endZ; z++) {
          for (let y = startY; y < endY; y++) {
            const rowOffset = z * sourceStride.z + y * sourceStride.y + startX * numComponents;
            chunk.set(arr.subarray(rowOffset, rowOffset + rowElements), chunkOffset);
            chunkOffset += rowElements;
          }
        }
        chunks.push({ data: chunk, dims: { x: rowLength, y: chunkHeight, z: chunkDepth } });
      }
    }
  }

  return chunks;
}