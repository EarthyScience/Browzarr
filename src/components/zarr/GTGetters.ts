import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { fromBlob, type GeoTIFFImage } from "geotiff";
import { parseGeoKeys } from "@/utils/geoKeyParser";
import { calculateStrides } from "@/utils/HelperFuncs";
import { usePlotStore } from "@/GlobalStates/PlotStore";

export async function getGTDims(preload?: GeoTIFFImage){
    const {gtBlob} = useZarrStore.getState()
    const {cache} = useCacheStore.getState();
    const {initStore} = useGlobalStore.getState();
    const cacheName = `${initStore}_raster_meta`
    if (cache.has(cacheName)){
        const meta = cache.get(cacheName)
        const {dimNames, dimArrays, dimUnits} = meta
        return {dimNames, dimArrays, dimUnits};
    }
    let image;
    if (!preload){
        const geotiff = await fromBlob(gtBlob as File)
        image = await geotiff.getImage()
    } else image = preload
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
    const {initStore} = useGlobalStore.getState();
    const cacheName = `${initStore}_raster_meta`
    if (cache.has(cacheName)){
        return cache.get(cacheName)
    }
    const geotiff = await fromBlob(gtBlob as File)
    const image = await geotiff.getImage()
    const geoKeys = image.getGeoKeys()
    const parsedGK = parseGeoKeys(geoKeys as Record<string, any>);
    const {dimNames, dimArrays, dimUnits} = await getGTDims(image)
    const meta = {...parsedGK, dimInfo:{dimNames, dimArrays, dimUnits}, shape:dimArrays.map((e: any[]) => e.length)}
    return meta
}

export async function getRasterData(overrideVar?: string){
    const {gtBlob, ndSlices, compress, axisMapping, coarsen, kernelSize, kernelDepth} = useZarrStore.getState()
    const {cache} = useCacheStore.getState()
    const {initStore, variable} = useGlobalStore.getState()
    const thisVar = overrideVar?? variable as string
    const geotiff = await fromBlob(gtBlob as File)
    const xSlice = ndSlices.at(-1) as [number, number]
    const ySlice = ndSlices.at(-2) as [number, number]
    usePlotStore.setState({ xSlice, ySlice, zSlice:[0,1] });
    useZarrStore.setState({ xSlice, ySlice, zSlice:[0,1] });
    const sample = parseInt(thisVar.split('_').at(-1) as string)
    const image = await geotiff.getImage()
    const data = await image.readRasters({
        window: [xSlice[0], ySlice[0], xSlice[1], ySlice[1]],
        samples: [sample]
    })
    const thisShape = [data.height, data.width]
    const thisStride = calculateStrides(thisShape)
    const cacheChunk = {
        data:data[0],
        shape: thisShape, 
        stride: thisStride,
        scaling: 0, compressed: false, coarsened: coarsen,
        kernel: { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined },
    }
    cache.set(`${initStore}_${thisVar}`, cacheChunk)
    return  { shape: thisShape, indices: [0, 1], scalingFactor:0 }
}