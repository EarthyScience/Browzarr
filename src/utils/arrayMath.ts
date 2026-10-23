// Pure, dependency-free array math helpers.
// This module must not import anything else so it is safe to use
// inside the Web Worker module graph (see workers/pool.ts).
import type { TypedArray, TypedArrayBufferLike } from './HelperFuncs';

export function ArrayMinMax(array:number[] | TypedArray | TypedArrayBufferLike){
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < array.length; i++){
    const v = array[i];
    if (v < minVal) minVal = v; 
    else if (v > maxVal) maxVal = v;
  }
  return [minVal,maxVal]
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

export function calculateStrides(
  shape: number[]
){
  const newStrides = shape.map((_val, idx) => {
    return shape.reduce((a: number, b: number, i: number) => a * (i > idx ? b : 1), 1)
  })
  return newStrides
}
