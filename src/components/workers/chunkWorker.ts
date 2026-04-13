export default {}

import { copyChunkToArray, DecompressArray } from "../zarr/utils";

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
  } = e.data


  const typedArray = new Float16Array(sharedBuffer)
  const thisData = compressed ? DecompressArray(chunkData) : chunkData

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

  self.postMessage({ success: true })
}