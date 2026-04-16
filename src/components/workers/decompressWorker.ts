export default {}
import { DecompressArray } from "../zarr/utils"

interface InputData{
    data: Uint8Array
}

self.onmessage = async (e: MessageEvent<InputData>) => {
    const {
        data
    } = e.data

    const decompressed = DecompressArray(data)
    
    const transfer = [decompressed.buffer]
    self.postMessage({ success: true, decompressed }, {transfer} )
}