import { parseGeoKeys } from "./geoKeyParser";
import {fromBlob} from 'geotiff'
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import {epsgToProj} from "./epsgToProj";
export async function loadGeoTiff(file: File){
    //Maybe just need blob
    const geotiff = await fromBlob(file)
    const image = await geotiff.getImage()
    const geoKeys = image.getGeoKeys()
    const parsedGK = parseGeoKeys(geoKeys);
    const fd = image.getFileDirectory();  
    const [xOrg, yOrg] = image.getOrigin()
    const [xRes, yRes] = image.getResolution()
    const width = image.getWidth()
    const height = image.getHeight()
    const xArray = Array.from({length: width}).map((_val,idx) => xOrg + idx*xRes);
    const yArray = Array.from({length: height}).map((_val,idx) => yOrg + idx*yRes);
    console.log(xArray, yArray)
    console.log(image)
    console.log(parsedGK)
    console.log(fd.toObject())
    console.log(fd.parseGeoKeyDirectory())
}