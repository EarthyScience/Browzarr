import { toHalfFloat } from "three/src/extras/DataUtils.js";
export interface textureIn{
    array: Uint8Array | Float16Array;
    valueScales:{
        minVal: number, 
        maxVal:number
    };
    useF16:boolean
}
export interface BiTextureIn extends textureIn{
    idx: number;
    dataLength: number;
    textureData: Uint8Array | Uint16Array;
}
export interface textureOut{
    textureData: Uint8Array | Uint16Array;
}
export function createTextureData({array, valueScales, useF16}: textureIn): textureOut{
    const {minVal, maxVal} = valueScales;
    const len = array.length
    const invRange = 1 / (maxVal - minVal)
    let textureData: Uint8Array | Uint16Array
    if (useF16) {
        textureData = new Uint16Array(len)
        const nanHalf = toHalfFloat(NaN)
        for (let i = 0; i < len; i++) {
            const normed = (array[i] - minVal) * invRange
            textureData[i] = normed !== normed ? nanHalf : toHalfFloat(normed)
        }
    } else {
        textureData = new Uint8Array(len)
        const scale = 254 * invRange
        for (let i = 0; i < len; i++) {
            const scaled = (array[i] - minVal) * scale
            textureData[i] = scaled !== scaled ? 255 : scaled
        }
    }
    return {textureData}
}

export function createBiVarTextureData({array, textureData, idx, dataLength, valueScales, useF16}: BiTextureIn): textureOut{
    const {minVal, maxVal} = valueScales;
    const invRange = 1 / (maxVal - minVal)
    if (useF16) {
        const nanHalf = toHalfFloat(NaN)
        for (let i = 0, j = idx; i < dataLength; i++, j += 2) {
            const normed = (array[i] - minVal) * invRange
            textureData[j] = normed !== normed ? nanHalf : toHalfFloat(normed)
        }
    } else {
        const scale = 254 * invRange
        for (let i = 0, j = idx; i < dataLength; i++, j += 2) {
            const scaled = (array[i] - minVal) * scale
            textureData[j] = scaled !== scaled ? 255 : scaled < 0 ? 0 : scaled > 254 ? 254 : scaled
        }
    }
    return {textureData}
}