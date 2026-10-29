import { parseGeoKeys } from "@/data/geo/geoKeyParser";
import { useZarrStore } from "@/stores/ZarrStore";
import { useGlobalStore } from "@/stores/GlobalStore";
import { getBaseImage } from "../zarr/GTGetters";

export async function loadGeoTiff(source: File | string){
    const isURL = typeof source === "string"
    const name = (isURL ? source.split("/").at(-1) : source.name) || "geotiff.tif"
    const geotiff = await getBaseImage(source)
    const imageCount = await geotiff.getImageCount()
    const allBands: string[] = []
    const shapes: [number, number][] = []
    const noTree = imageCount == 1;
    for (let i = 0; i < imageCount; i++){
        const image = await geotiff.getImage(i)
        const bandCount = image.getSamplesPerPixel()
        const bands = Array.from({length: bandCount}).map((_val, idx) => noTree ? `band_${idx}` : `${i}/band_${idx}` )
        shapes.push(...Array.from({ length: bandCount }, (): [number, number] => [image.getHeight(), image.getWidth()]))
        allBands.push(...bands)
    }
    const image = await geotiff.getImage()
    const geoKeys = image.getGeoKeys()
    const parsedGK = parseGeoKeys(geoKeys as Record<string, any>);
    const fd = image.getFileDirectory();  
    const baseMeta = {...parsedGK, imageCount} 
    useGlobalStore.setState({
        variables: allBands,
        zMeta: allBands.map((e, idx) => ({...baseMeta, name:e, shape:shapes[idx], chunkShape:shapes[idx]})),
        initStore: `local:${name}`,
        titleDescription: {
            title: name,
            description: '',
        },
        status: null
    });
    useZarrStore.setState({gtSource:source, useGT:true, useNC:false})
}

