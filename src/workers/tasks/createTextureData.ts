import { ArrayMinMax } from "@/lib/arrayMath";
import { toHalfFloat } from "three/src/extras/DataUtils.js";
export interface textureIn{
    array: Uint8Array | Float16Array;
    valueScales:{
        minVal: number, 
        maxVal:number
    } | undefined;
    useF16:boolean
}

export interface textureOut{
    textureData: Uint8Array | Uint16Array;
    valueScales:{
        minVal: number, maxVal:number
    };
}
export function createTextureData({array, valueScales, useF16}: textureIn): textureOut{
    const [minVal,maxVal] = valueScales ? [valueScales.minVal, valueScales.maxVal] : ArrayMinMax(array)
    const textureData = useF16 ? new Uint16Array(array.length) : new Uint8Array(array.length)
    const range = (maxVal - minVal)
    for (let i = 0; i < array.length; i++){
        const normed = (array[i] - minVal) / range;
        if (isNaN(normed)){
        textureData[i] = useF16 
            ?	toHalfFloat(NaN)
            :	255;
        } else {
        textureData[i] = useF16
            ?	toHalfFloat(normed)
            :	normed * 254;
        }
    };
    return {textureData, valueScales:{minVal, maxVal}}
}