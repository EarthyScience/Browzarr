import { useCacheStore } from "@/stores/CacheStore";
import { useGlobalStore } from "@/stores/GlobalStore";
import { useZarrStore } from "@/stores/ZarrStore";
import { fromBlob } from "geotiff";
import { parseGeoKeys } from "@/data/geo/geoKeyParser";
import { calculateStrides } from "@/lib/helpers";
import { usePlotStore } from "@/stores/PlotStore";
import { getPool } from "@/workers/pool";
import { epsgToProj } from "../geo/epsgToProj";

export async function getGTDims(variable: string){
    const {gtBlob} = useZarrStore.getState()
    const {cache} = useCacheStore.getState();
    const {initStore} = useGlobalStore.getState();
    const cacheName = `${initStore}_${variable}_dimfo`
    if (cache.has(cacheName)){
        const dimfo = cache.get(cacheName)
        const {dimNames, dimArrays, dimUnits} = dimfo
        return {dimNames, dimArrays, dimUnits};
    }
    const geotiff = await fromBlob(gtBlob as File)
    const baseImage = await geotiff.getImage()
    const geoKeys = baseImage.getGeoKeys()
    const parsedGK = parseGeoKeys(geoKeys as Record<string, any>);
    let imageNum = parseInt(variable.split('/')[0])
    imageNum = Number.isNaN(imageNum) ? 0 : imageNum
    const [xOrg, yOrg] = baseImage.getOrigin()
    const image = await geotiff.getImage(imageNum)
    const [xRes, yRes] = image.getResolution(baseImage)
    const width = image.getWidth()
    const height = image.getHeight()
    const xArray = Array.from({length: width}).map((_val,idx) => xOrg + idx*xRes);
    const yArray = Array.from({length: height}).map((_val,idx) => yOrg + idx*yRes);
    const dimArrays = [yArray, xArray]
    const dimNames = Object.values(parsedGK.axes).toReversed() // geotiff is x --> y so flip
    const dimUnits = [parsedGK.units,parsedGK.units]
    const dimfo = {dimNames, dimArrays, dimUnits}
    cache.set(cacheName, dimfo)
    return dimfo;
}

export async function getGTMetadata(variable: string){
    const {gtBlob} = useZarrStore.getState()
    const {cache} = useCacheStore.getState();
    const {initStore}  = useGlobalStore.getState();
    const cacheName = `${initStore}_${variable}_meta`
    if (cache.has(cacheName)){
        return cache.get(cacheName)
    }
    const geotiff = await fromBlob(gtBlob as File)
    let imageNum = parseInt(variable.split('/')[0])
    imageNum = Number.isNaN(imageNum) ? 0 : imageNum
    const baseImage = await geotiff.getImage()
    const geoKeys = baseImage.getGeoKeys()
    const image = await geotiff.getImage(imageNum)
    const parsedGK = parseGeoKeys(geoKeys as Record<string, any>);
    delete parsedGK['units' as keyof typeof parsedGK];
    const meta = {...parsedGK, shape:[image.getHeight(), image.getWidth()]}
    cache.set(cacheName, meta)
    return meta
}

export async function getRasterData(overrideVar?: string){
    const {gtBlob, ndSlices, axisMapping, coarsen, kernelSize, kernelDepth, setCurrentChunks, setArraySize} = useZarrStore.getState()
    const {cache} = useCacheStore.getState()
    const {initStore, variable, setStrides, setStatus} = useGlobalStore.getState()
    const thisVar = overrideVar?? variable as string
    setStatus("Fetching...")
    const pool = getPool();
    const xSlice = ndSlices[axisMapping.x]
    const ySlice = ndSlices[axisMapping.y]
    
    usePlotStore.setState({ xSlice, ySlice, zSlice:[0,1] });
    useZarrStore.setState({ xSlice, ySlice, zSlice:[0,1] });

    const sample = parseInt(thisVar.split('_').at(-1) as string)
    const winX = ndSlices[1]
    const winY = ndSlices[0]
    let imageNum = parseInt(thisVar.split('/')[0])
    imageNum = Number.isNaN(imageNum) ? 0 : imageNum
    const {data, width, height} = await pool.dispatch('readRasterData', {gtBlob: gtBlob as File, imageNum, winX, winY, sample})
    const transpose = axisMapping.x !== 1;
    const thisShape = transpose ? [width, height] : [height, width]
    const thisStride = transpose ? [1, width] : [width, 1]
    const destStride = calculateStrides(thisShape)
    setStrides(destStride)
    setArraySize(thisShape.reduce((a, b) => a * b, 1))
    setCurrentChunks({ x: [0, 1], y: [0, 1], z: [0, 1] }) 

    const meta = cache.get(`${initStore}_${variable}_meta`)
    if (meta.epsg){
        const epsg = meta.epsg
        try{
            epsgToProj(epsg).then(e=>{
                usePlotStore.setState({nativeCRS:e})
            })
        }catch{console.log(`Failed to fetch EPSG: ${epsg}`)}
    }
    const cacheChunk = {
        data,
        shape: thisShape,
        stride: thisStride,
        scaling: 0, compressed: false, coarsened: coarsen,
        kernel: { kernelDepth: coarsen ? kernelDepth : undefined, kernelSize: coarsen ? kernelSize : undefined },
        fullChunkDim: thisShape,
        sliceStart: [0, 0, 0],
    }
    cache.set(`${initStore}_${thisVar}_chunk_z0_y0_x0`, cacheChunk)
    setStatus(null)
    return { shape: thisShape, indices: [axisMapping.y, axisMapping.x], scalingFactor: 0 }
}