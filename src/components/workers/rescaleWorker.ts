export default {}
import { RescaleArray } from "../zarr/utils"

interface InputData{
    data: Float16Array
    newScalingFactor: number
}

self.onmessage = async (e: MessageEvent<InputData>) => {
    const {
        data,
        newScalingFactor
    } = e.data

    RescaleArray(data, newScalingFactor)
    
    const transfer = [data.buffer]
    self.postMessage({ success: true, data }, {transfer} )
}