import { parseGeoKeys } from "@/data/geo/geoKeyParser";
import {fromBlob} from 'geotiff'
import { useZarrStore } from "@/stores/ZarrStore";
import { useGlobalStore } from "@/stores/GlobalStore";

export async function loadGeoTiff(file: File){
    const geotiff = await fromBlob(file)
    const image = await geotiff.getImage()
    const bandCount = image.getSamplesPerPixel()
    const bands = Array.from({length: bandCount}).map((_val, idx) => `band_${idx}`)
    const geoKeys = image.getGeoKeys()
    const parsedGK = parseGeoKeys(geoKeys as Record<string, any>);
    const fd = image.getFileDirectory();  
    const width = image.getWidth()
    const height = image.getHeight()
    const shape = [height, width]
    const baseMeta = {...parsedGK, bandCount, shape, chunkShape:shape}
    useGlobalStore.setState({
        variables: bands,
        zMeta: bands.map(e => ({...baseMeta, name:e})),
        initStore: `local:${file.name}`,
        titleDescription: {
        title: file.name,
        description: '',
        },
    });
    useZarrStore.setState({gtBlob:file, useGT:true, useNC:false})
}

