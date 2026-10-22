import { fromBlob } from 'geotiff'
import * as THREE from 'three/webgpu'
import { TypedArray } from '../HelperFuncs';
import { decompressSync } from 'fflate';
import {processChunk, processIn, processOut} from './tasks/processChunk';

interface normalizeIn{
    data: Uint8Array | Float16Array;
    minVal: number;
    range: number;
    useF16: boolean;
}
interface readRasterIn {
    gtBlob: File;
    winX: [number, number];
    winY: [number, number];
    sample:number
}


function normalizeTextureData({data, minVal, range, useF16}: normalizeIn){
    const textureData = useF16 ? new Uint16Array(data.length) : new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++){
        const normed = (data[i] - minVal) / range;
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
    return {textureData}
}

async function readRasterData({gtBlob, winX, winY, sample}: readRasterIn){
    const geotiff = await fromBlob(gtBlob as File)
    const image = await geotiff.getImage()
    const data = await image.readRasters({
        window: [winX[0], winY[0], winX[1], winY[1]],
        samples: [sample]
    })
    return {data}
}

function printInputs({input}:{input:any}){
    console.log(input)
}

function decompressArray({array}:{array:Uint8Array}){
    const decompressed = decompressSync(array)
	const newArray = new Float16Array(decompressed.buffer)
	return {newArray}
}

export const tasks = {
    normalizeData: (d: normalizeIn): {textureData: Uint8Array | Uint16Array} => normalizeTextureData(d),
    readRasterData: (d: readRasterIn): Promise<{data: any}> => readRasterData(d),
    printIn: (d: any): void => printInputs(d),
    decompress: (d: {array:Uint8Array}): {newArray: Float16Array} => decompressArray(d),
    processChunk: (d: processIn) : Promise<processOut> => processChunk(d)
};