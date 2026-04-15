import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useCacheStore } from '@/GlobalStates/CacheStore';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import * as zarr from 'zarrita';
import { ZarrError } from '@/GlobalStates/ErrorStore';


export async function GetZarrDims(variable: string){
    const {cache} = useCacheStore.getState();
    const {initStore} = useGlobalStore.getState();
    const cacheName = `${initStore}_${variable}_meta`
    const dimArrays = []
    const dimUnits = []
    if (cache.has(cacheName)){
        const meta = cache.get(cacheName)
        const dimNames = meta._ARRAY_DIMENSIONS as string[]
        if (dimNames){
        for (const dim of dimNames){
            const dimArray = cache.get(`${initStore}_${dim}`)
            const dimMeta = cache.get(`${initStore}_${dim}_meta`)
            dimArrays.push(dimArray ?? [0]) // guard against missing cached arrays, though this should not happen
            dimUnits.push(dimMeta?.units ?? null) // guards against missing cached metadata
        }
        } else {
        for (const dimLength of meta.shape){
            dimArrays.push(Array(dimLength).fill(0))
            dimUnits.push("Default")
        }
        }
        return {dimNames: dimNames??Array(meta.shape.length).fill("Default"), dimArrays, dimUnits};
    } 
    const group = await useZarrStore.getState().currentStore
    if (!group) {
        throw new Error(`Failed to open Zarr store: ${initStore}`);
    }
    const outVar = await zarr.open(group.resolve(variable), {kind:"array"});
    const meta = outVar.attrs;
    meta.shape = outVar.shape;
    cache.set(cacheName, meta);
    const dimNames = meta._ARRAY_DIMENSIONS as string[]
    if (dimNames){
        for (const dim of dimNames){
        const dimArray = await zarr.open(group.resolve(dim), {kind:"array"})
            .then((result) => zarr.get(result));
        const dimMeta = await zarr.open(group.resolve(dim), {kind:"array"})
            .then((result) => result.attrs)
        cache.set(`${initStore}_${dim}`, dimArray.data);
        cache.set(`${initStore}_${dim}_meta`, dimMeta)
        dimArrays.push(dimArray.data)
        dimUnits.push(dimMeta.units)
        } 
    } else {
        for (const dimLength of outVar.shape){
        dimArrays.push(Array(dimLength).fill(0))
        dimUnits.push("Default")
        }
    }
    return {dimNames: dimNames?? Array(outVar.shape.length).fill("Default"), dimArrays, dimUnits};
}

export async function GetZarrAttributes(thisVariable?: string){
    const {initStore, variable } = useGlobalStore.getState();
	const {cache} = useCacheStore.getState();
	const {currentStore} = useZarrStore.getState();
	const cacheName = `${initStore}_${thisVariable?? variable}_meta`
    const group = await currentStore;
    const outVar = await zarr.open(group.resolve(thisVariable?? variable), {kind:"array"});
    const meta = outVar.attrs;
    cache.set(cacheName, meta);
    return meta
}


async function fetchWithRetry<T>(
    operation: () => Promise<T>, 
    context: string, 
    setStatus: (s: string | null) => void,
    maxRetries = 3, 
    retryDelay = 1000
): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                useErrorStore.getState().setError('zarrFetch');
                setStatus(null);
                throw new ZarrError(`Failed to fetch ${context}`, error);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    throw new Error("Unreachable");
}
const maxRetries = 10;
const retryDelay = 500; // 0.5 seconds in milliseconds

export async function GetStore(storePath: string): Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>> | undefined>{
        const {setStatus} = useGlobalStore.getState();
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const d_store = zarr.tryWithConsolidated(
                    new zarr.FetchStore(storePath)
                );
                const gs = await d_store.then(store => zarr.open(store, {kind: 'group'}));
                setStatus(null)
                return gs;
            } catch (error) {
                // If this is the final attempt, handle the error
                if (attempt === maxRetries) {
                    if (storePath.slice(0,5) != 'local'){
                        useErrorStore.getState().setError('zarrFetch')
                        setStatus(null)
                    }
                    throw new ZarrError(`Failed to initialize store at ${storePath}`, error);
                }
                
                // Wait before retrying (except on the last attempt which we've already handled above)
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
}

