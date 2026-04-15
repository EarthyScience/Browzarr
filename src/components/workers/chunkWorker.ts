export default {}

import { copyChunkToArray, copyChunkToArray2D, DecompressArray } from "../zarr/utils";

//---- Worker ----//

self.onmessage = (e) => {
  const {
    sharedBuffer,
    compressed,
    chunkData,
    chunkShape,
    chunkStride,
    dataShape,
    strides,
    chunkCoord,
    startCoords,
    hasZ
  } = e.data

  const typedArray = new Float16Array(sharedBuffer)
  const thisData = compressed ? DecompressArray(chunkData) : chunkData
  const inputs = [thisData, chunkShape, chunkStride, typedArray, dataShape, strides, chunkCoord, startCoords] as const

  if (hasZ) copyChunkToArray(...inputs)
  else copyChunkToArray2D(...inputs)

  self.postMessage({ success: true })
}