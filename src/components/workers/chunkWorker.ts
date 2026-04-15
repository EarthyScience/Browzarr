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
  if (hasZ) {
    copyChunkToArray(
      thisData,
      chunkShape,
      chunkStride,
      typedArray,
      dataShape,
      strides,
      chunkCoord,
      startCoords,
    )
  } else {
  copyChunkToArray2D(
      thisData,
      chunkShape,
      chunkStride,
      typedArray,
      dataShape,
      strides,
      chunkCoord,
      startCoords,
    )
  }

  self.postMessage({ success: true })
}