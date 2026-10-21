import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { fromBlob, type GeoTIFFImage } from "geotiff";
import { parseGeoKeys } from "@/utils/geoKeyParser";
import { calculateStrides } from "@/utils/HelperFuncs";
import { usePlotStore } from "@/GlobalStates/PlotStore";

export async function getGTDims(){
    const {gtBlob} = useZarrStore.getState()
    const {cache} = useCacheStore.getState();
    const {initStore} = useGlobalStore.getState();
    const cacheName = `${initStore}_raster_meta`
    if (cache.has(cacheName)){
        const meta = cache.get(cacheName)
        const {dimNames, dimArrays, dimUnits} = meta
        return {dimNames, dimArrays, dimUnits};
    }
    const geotiff = await fromBlob(gtBlob as File)
    const image = await geotiff.getImage()
    const geoKeys = image.getGeoKeys()
    const parsedGK = parseGeoKeys(geoKeys as Record<string, any>);
    const [xOrg, yOrg] = image.getOrigin()
    const [xRes, yRes] = image.getResolution()
    const width = image.getWidth()
    const height = image.getHeight()
    const xArray = Array.from({length: width}).map((_val,idx) => xOrg + idx*xRes);
    const yArray = Array.from({length: height}).map((_val,idx) => yOrg + idx*yRes);
    const dimArrays = [yArray, xArray]
    const dimNames = Object.values(parsedGK.axes).toReversed() // geotiff is x --> y so flip
    const dimUnits = [parsedGK.units,parsedGK.units]
    return {dimNames, dimArrays, dimUnits};
}   

export async function getGTMetadata(){
    const {gtBlob} = useZarrStore.getState()
    const {cache} = useCacheStore.getState();
    const {initStore}  = useGlobalStore.getState();
    const cacheName = `${initStore}_raster_meta`
    if (cache.has(cacheName)){
        return cache.get(cacheName)
    }
    const geotiff = await fromBlob(gtBlob as File)
    const image = await geotiff.getImage()
    const geoKeys = image.getGeoKeys()
    const parsedGK = parseGeoKeys(geoKeys as Record<string, any>);
    delete parsedGK['units' as keyof typeof parsedGK];
    const meta = {...parsedGK, shape:[image.getHeight(), image.getWidth()]}
    return meta
}

export async function getRasterData(overrideVar?: string){
    const {gtBlob, ndSlices, axisMapping, coarsen, kernelSize, kernelDepth, setCurrentChunks, setArraySize} = useZarrStore.getState()
    const {cache} = useCacheStore.getState()
    const {initStore, variable, setStrides} = useGlobalStore.getState()
    const thisVar = overrideVar?? variable as string
    const geotiff = await fromBlob(gtBlob as File)

    const xSlice = ndSlices[axisMapping.x]
    const ySlice = ndSlices[axisMapping.y]
    
    usePlotStore.setState({ xSlice, ySlice, zSlice:[0,1] });
    useZarrStore.setState({ xSlice, ySlice, zSlice:[0,1] });

    const sample = parseInt(thisVar.split('_').at(-1) as string)
    const image = await geotiff.getImage()
    const winX = ndSlices[1]
    const winY = ndSlices[0]
    const data = await image.readRasters({
        window: [winX[0], winY[0], winX[1], winY[1]],
        samples: [sample]
    })
    const src = data[0]
    const width = data.width 
    const height = data.height 

    const transpose = axisMapping.x !== 1;
    const thisShape = transpose ? [width, height] : [height, width]
    const thisStride = transpose ? [1, width] : [width, 1]
    const destStride = calculateStrides(thisShape)
    setStrides(destStride)
    setArraySize(thisShape.reduce((a, b) => a * b, 1))
    setCurrentChunks({ x: [0, 1], y: [0, 1], z: [0, 1] }) 

    const cacheChunk = {
        data: src,
        shape: thisShape,
        stride: thisStride,
        scaling: 0, compressed: false, coarsened: coarsen,
        kernel: { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined },
        fullChunkDim: thisShape,
        sliceStart: [0, 0, 0],
    }
    cache.set(`${initStore}_${thisVar}_chunk_z0_y0_x0`, cacheChunk)
    return { shape: thisShape, indices: [axisMapping.y, axisMapping.x], scalingFactor: 0 }
}