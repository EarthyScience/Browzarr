import { getBaseImage } from '@/data/geo/baseImage';
import { CompressArray, DecompressArray, RescaleArray } from '@/data/zarr/utils';
import { arrayRange } from '@/lib/arrayMath';
import { FetchStoreOptions } from '@/types/Interfaces';
import { processChunk, processIn, processOut } from './tasks/processChunk';
import { TypedArray } from '@/lib/helpers';

interface readRasterIn {
    gtSource: File | string;
    fetchOptions?: FetchStoreOptions | null;
    imageNum: number;
    winX: [number, number];
    winY: [number, number];
    sample:number
}

interface readRasterOut{
    data: TypedArray;
    width: number;
    height: number;
    valueScale:{minVal:number, maxVal:number}
}


async function readRasterData({gtSource, fetchOptions, imageNum, winX, winY, sample}: readRasterIn){
    const geotiff = await getBaseImage(gtSource, fetchOptions)
    const image = await geotiff.getImage(imageNum)
    const data = await image.readRasters({
        window: [winX[0], winY[0], winX[1], winY[1]],
        samples: [sample]
    })
    const {width,height} = data
    const valueScale = arrayRange(data[0] as Uint8Array)
    return {data:data[0], width, height, valueScale}
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
    readRasterData: (d: readRasterIn): Promise<readRasterOut> => readRasterData(d),
    processChunk: (d: processIn) : Promise<processOut> => processChunk(d),
    rescaler: (d: RescalerIn) : {array: Float16Array | Uint8Array} => rescaler(d)
};
