import { useZarrStore, useCacheStore, useGlobalStore, useErrorStore } from "@/utils/GlobalStates"
import { ToFloat16, CompressArray, DecompressArray } from "./ZarrLoaderLRU";

export function GetNCDims(variable: string){
    const {ncModule} = useZarrStore.getState()
    const {cache} = useCacheStore.getState();
    const {initStore} = useGlobalStore.getState();
    const dimNames = []
    const dimArrays = []
    const dimUnits = []
    const varInfo = ncModule.getVariableInfo(variable)
    const {dims} = varInfo
    for (const dim of dims){
        dimNames.push(dim.name)
        dimUnits.push(dim.units)
        const dimArray = ncModule.getVariableArray(dim.id)
        dimArrays.push(dimArray)
        cache.set(`${initStore}_${dim.name}`, dimArray.data);
        cache.set(`${initStore}_${dim.name}_meta`, dim)
    }
    return {dimNames, dimArrays, dimUnits};
}

export function GetNCAttributes(thisVariable? : string){
    const {ncModule} = useZarrStore.getState();
    const {cache} = useCacheStore.getState();
    const {initStore, variable} = useGlobalStore.getState();
    const cacheName = `${initStore}_${thisVariable?? variable}_meta`
    const meta = ncModule.getVariableInfo(thisVariable?? variable);
    cache.set(cacheName, meta);
    return meta
}

export function GetNCArray() {
    const {is4D, idx4D, initStore, variable, setProgress, setStrides, setStatus} = useGlobalStore.getState();
	const {compress, xSlice, ySlice, zSlice, ncModule, setCurrentChunks, setArraySize} = useZarrStore.getState()
	const {cache} = useCacheStore.getState();

    const varInfo = ncModule.getVariableInfo(variable)
    const {shape, chunks:chunkShape, size:totalElements} = varInfo
    if (totalElements > 1e9){
        useErrorStore.getState().setError('largeArray');
        throw Error("Cannot allocate unbroken memory segment for array.")
    }
    const is2D = shape.length === 2;

    const zIndexOffset = is4D ? 1 : 0;
    let outputArray = ncModule.getVariableArray(variable)
    
    const atts = varInfo.attributes
    let fillValue = NaN
    fillValue = !Number.isNaN(atts["missing_value"][0]) ? atts["missing_value"][0] : fillValue
    fillValue = !Number.isNaN(atts["_FillValue"][0]) ? atts["_FillValue"][0] : fillValue

    const [typedArray, scalingFactor] = ToFloat16(outputArray.map((v: number) => v === fillValue ? NaN : v), null)

    const cacheChunk = {
        data: compress ? CompressArray(typedArray, 7) : typedArray,
        shape: shape,
        stride: shape,
        scaling: scalingFactor,
        compressed: compress
    }
    cache.set(is4D ? `${initStore}_${idx4D}_${variable}` : `${initStore}_${variable}`, cacheChunk)
    return {
        data: typedArray,
        shape: shape,
        dtype: varInfo.dtype,
        scalingFactor
    }

}