import { parseGeoKeys } from "@/data/geo/geoKeyParser";
import {fromBlob} from 'geotiff'
import { useZarrStore } from "@/stores/ZarrStore";
import { useGlobalStore } from "@/stores/GlobalStore";

export async function loadGeoTiff(file: File){
    const geotiff = await fromBlob(file)
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
    console.log(allBands.map((e, idx) => ({...baseMeta, name:e, shape:shapes[idx], chunkShape:shapes[idx]})))
    useGlobalStore.setState({
        variables: allBands,
        zMeta: allBands.map((e, idx) => ({...baseMeta, name:e, shape:shapes[idx], chunkShape:shapes[idx]})),
        initStore: `local:${file.name}`,
        titleDescription: {
        title: file.name,
        description: '',
        },
    });
    useZarrStore.setState({gtBlob:file, useGT:true, useNC:false})
}

