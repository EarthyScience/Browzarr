import { fromBlob, fromUrl } from "geotiff";
import { FetchStoreOptions } from "@/types/Interfaces";

// Store-free so it can be imported by the worker
export async function getBaseImage(source: File | string, fetchOptions?: FetchStoreOptions | null){
    if (typeof source !== "string") return fromBlob(source)
    const thisOptions = fetchOptions
        ? {
            headers: fetchOptions.headers,
            credentials: (fetchOptions.withCredentials ? "include" : "same-origin") 
        }
        : undefined
    return fromUrl(source, thisOptions)
}
