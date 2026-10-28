import { fromBlob } from 'geotiff'
import { toHalfFloat } from 'three/src/extras/DataUtils.js';
import { decompressSync } from 'fflate';
import {processChunk, processIn, processOut} from './tasks/processChunk';
import { createTextureData, textureIn, textureOut } from './tasks/createTextureData';
import { CompressArray, DecompressArray, RescaleArray } from '@/data/zarr/utils';

interface normalizeIn{
    data: Uint8Array | Float16Array;
    minVal: number;
    range: number;
    useF16: boolean;
}
interface readRasterIn {
    gtBlob: File;
    imageNum: number;
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
            ?	toHalfFloat(NaN)
            :	255;
        } else {
        textureData[i] = useF16
            ?	toHalfFloat(normed)
            :	normed * 254;
        }
    };
    return {textureData}
}

async function readRasterData({gtBlob, imageNum, winX, winY, sample}: readRasterIn){
    const geotiff = await fromBlob(gtBlob as File)
    const image = await geotiff.getImage(imageNum)
    const data = await image.readRasters({
        window: [winX[0], winY[0], winX[1], winY[1]],
        samples: [sample]
    })
    const {width,height} = data
    return {data:data[0], width, height}
}

function decompressArray({array}:{array:Uint8Array}){
    const decompressed = decompressSync(array)
	const newArray = new Float16Array(decompressed.buffer)
	return {newArray}
}
interface RescalerIn{array:Float16Array | Uint8Array; 
    delta:number; 
    compressed: boolean
}

function rescaler({array, delta, compressed}:RescalerIn){
    if (compressed){
        const decompressed = DecompressArray(array as Uint8Array)
        RescaleArray(decompressed, delta);
        return { array: CompressArray(decompressed, 7) }
    } else {
        RescaleArray(array as Float16Array, delta);
        return {array}
    }
}
    

export const tasks = {
    normalizeData: (d: normalizeIn): {textureData: Uint8Array | Uint16Array} => normalizeTextureData(d),
    readRasterData: (d: readRasterIn): Promise<{data: any, width:number, height: number}> => readRasterData(d),
    decompress: (d: {array:Uint8Array}): {newArray: Float16Array} => decompressArray(d),
    processChunk: (d: processIn) : Promise<processOut> => processChunk(d),
    textureData: (d: textureIn) : textureOut => createTextureData(d),
    rescaler: (d: RescalerIn) : {array: Float16Array | Uint8Array} => rescaler(d)
};
