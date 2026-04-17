import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { usePlotStore } from "@/GlobalStates/PlotStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import { GetArray } from "./GetArray";
import { GetAttributes } from "./ZarrLoaderLRU";
import { GetDimInfo, ParseExtent } from "@/utils/HelperFuncs";
import { ArrayToTexture } from "../textures";
import * as THREE from 'three'
const DataFetcher = async () => {
    const {variable, is4D,  setIsFlat,
    setShape, setDataShape, setFlipY, setValueScales, setMetadata, setDimArrays, 
    setDimNames, setDimUnits, setPlotOn, setStatus} = useGlobalStore.getState()
    const {plotType, textures, setPlotType} = usePlotStore.getState()
    const {zSlice, ySlice, xSlice} = useZarrStore.getState()

    if (variable == "Default") {
        setMetadata(null);
        return
    }

    try {
        //---- Texture Cleanup ----//
        if (textures.length) {
            textures.forEach((tex) => {
                tex.dispose();
                if (tex.source) (tex.source as any).data = null;
            });
        }
        //----- TS Cleanup ----//
        useGlobalStore.setState({timeSeries:{}, dimCoords:{}})
        //---- Set Plot Slicez ----//
        usePlotStore.setState({zSlice, ySlice, xSlice});
        //---- Main Fetch ----//
        const result = await GetArray()
        const shape = result.shape.filter((val) => val != 1);
        const [tempTextures, scaling] = ArrayToTexture({
            data: result.data,
            shape
        });
        usePlotStore.setState({textures:tempTextures})
        setValueScales(scaling as { maxVal: number; minVal: number });
        useGlobalStore.setState({scalingFactor:result.scalingFactor});

        const shapeLength = shape.length;

        if (shapeLength === 2) {
            setIsFlat(true);
            if (!["flat", "sphere"].includes(plotType)) {
                setPlotType("sphere");
            }
        } else {
            setIsFlat(false);
        }

        const aspectRatio = shape[shapeLength - 2] / shape[shapeLength - 1];
        const timeRatio = shape[shapeLength - 3] / shape[shapeLength - 1];
        
        setShape(new THREE.Vector3(2, aspectRatio * 2, Math.max(timeRatio, 2)));
        setDataShape(result.shape);
 
        setPlotOn(true);
        setStatus(null);

    } catch (error) {
        console.error(error);
        setStatus(null);
        return;
    }

    //---- Metadata ----//
    GetAttributes().then((result) => {
        setMetadata(result);
        usePlotStore.setState({stableMetadata:result});
    });

    //---- DimInfo ----//
    GetDimInfo(variable).then((arrays) => {
        let { dimArrays, dimUnits, dimNames } = arrays;
        if (is4D) {
            dimArrays = dimArrays.slice(1);
            dimUnits = dimUnits.slice(1);
            dimNames = dimNames.slice(1);
        }
        setDimNames(dimNames);
        setDimArrays(dimArrays);

        const targetDim = dimArrays.length > 2 ? dimArrays[1] : dimArrays[0];
        const shouldFlip = targetDim[1] < targetDim[0];
        setFlipY(shouldFlip);

        setDimUnits(dimUnits);
        ParseExtent(dimUnits, dimArrays);
    });
  return
}

export default DataFetcher
