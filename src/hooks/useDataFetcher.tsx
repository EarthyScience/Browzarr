import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { useGlobalStore } from '@/stores/GlobalStore';
import { usePlotStore } from '@/stores/PlotStore';
import { useZarrStore } from '@/stores/ZarrStore';
import { useShallow } from 'zustand/shallow';
import { GetDimInfo } from '@/lib/helpers';
import { GetAttributes } from '@/data/zarr/ZarrLoaderLRU';
import { GetArray } from '@/data/zarr/GetArray';
import { handleIrregularGrid, reproject } from '@/gpu/textures/ProjectionTexture';
import { parseExtent } from '@/data/geo/parseExtent';
import { createDataTexture } from '@/gpu/textures/TextureMakers';
import { useAnalysisStore } from '@/stores/AnalysisStore';
import { getRasterData } from '@/data/zarr/GTGetters';

export const useDataFetcher = () => {
    const { variable, bivariate, variable2, mainTextures, setUnits, setIsFlat, setUseF16Textures, setValueScales,
    setShape, setDataShape, setFlipY, setMainTextures, setMetadata, setPlotOn, setStatus, setScalingFactors} = useGlobalStore(
    useShallow(s => ({
        variable: s.variable, bivariate: s.bivariate, variable2: s.variable2, mainTextures: s.mainTextures,
        setUnits: s.setUnits, setIsFlat: s.setIsFlat, setUseF16Textures: s.setUseF16Textures, setValueScales: s.setValueScales,
        setShape: s.setShape, setDataShape: s.setDataShape, setFlipY: s.setFlipY, setMainTextures: s.setMainTextures,
        setMetadata: s.setMetadata, setPlotOn: s.setPlotOn, setStatus: s.setStatus, setScalingFactors: s.setScalingFactors
    })))
    const {plotType, preProject, setPlotType} = usePlotStore(useShallow(s => ({
        plotType: s.plotType, preProject: s.preProject, setPlotType: s.setPlotType
    })))
    const {reFetch, useGT} = useZarrStore(useShallow(s => ({
        reFetch: s.reFetch, useGT: s.useGT
    })))

    //---- Local State ----//
    const [show, setShow] = useState<boolean>(false);
    const [stableMetadata, setStableMetadata] = useState<Record<string, any>>({});
    const arrayGetter = useGT ? getRasterData : GetArray
    useEffect(() => {
        if (variable) {
            // Could remove this. But I think it looks better to just wipe then have an empty texture.
            // ---- RESET STATES ---- //
            setShow(false);
            setUseF16Textures(false);
            // Keep URL-provided crs through the reset when preprojecting
            const {nativeCRS: urlNativeCRS, destCRS: urlDestCRS} = usePlotStore.getState();
            usePlotStore.setState({nativeCRS:undefined, destCRS:undefined})
            useGlobalStore.setState({remapTexture: undefined, remapBorders:undefined, });
            // ---- FETCH DATA ---- //
            try {
                //---- Texture Cleanup ----//
                if (mainTextures) {
                    const oldTextures = mainTextures;
                    setTimeout(() => {
                        oldTextures.forEach((tex) => {
                            tex.dispose();
                            if (tex.source) (tex.source as any).data = null;
                        });
                    }, 0);
                    setMainTextures(undefined);
                }
                //----- TimeSeries Cleanup ----//
                useGlobalStore.setState({timeSeries:{}, dimCoords:{}})
                //---- Main Fetch ----//
                const scalingFactors: number[] = [];
                const promises: Promise<any>[] = [];
                const valueScales: {minVal: number, maxVal:number}[] = []
                if ( bivariate ) promises.push(arrayGetter(variable2).then(
                    result => {
                        scalingFactors[1] = result.scalingFactor?? 0;
                        valueScales[1] = result.valueScale
                    }

                ));
                promises.push(arrayGetter().then((result) => {
                    setDataShape(result.shape);
                    const shape = result.shape.filter((val) => val != 1);
                    const activeIndices = result.indices.filter((_, idx) => result.shape[idx] != 1);
                    useGlobalStore.getState().setActiveIndices(activeIndices);
                    // Create textures and store valuescales
                    scalingFactors[0] = result.scalingFactor?? 0;
                    valueScales[0] = result.valueScale;
                    useAnalysisStore.setState({originalScalingFactor: result.scalingFactor})
                    const shapeLength = shape.length;
                    if (shapeLength === 2) {
                        setIsFlat(true);
                        if (!["flat", "sphere"].includes(plotType)) {
                            setPlotType("flat");
                        }
                    } else {
                        setIsFlat(false);
                    }
                    const aspectRatio = shape[shapeLength - 2] / shape[shapeLength - 1];
                    const timeRatio = shape[shapeLength - 3] / shape[shapeLength - 1];
                    setShape(new THREE.Vector3(2, aspectRatio * 2, Math.max(timeRatio, 2)));
                }))
                //---- Metadata ----//
                const units: string[] = []
                
                promises.push(GetAttributes(variable).then((result) => {
                    setMetadata(result);
                    setStableMetadata(result);
                    units[0] = result.units;
                }));
                if (bivariate)promises.push(GetAttributes(variable2).then((result) => {
                    units[1] = result.units;
                }));

                //---- DimInfo ----//
                promises.push(GetDimInfo(variable).then((arrays) => {
                    let { dimArrays, dimUnits, dimNames } = arrays;
                    useGlobalStore.setState({dimArrays, dimNames, dimUnits, 
                        axisDimArrays: dimArrays, axisDimNames: dimNames, axisDimUnits: dimUnits});
                    const { axisMapping } = useZarrStore.getState();
                    const yIdx = (axisMapping.y >= 0 && axisMapping.y < dimArrays.length) ? axisMapping.y : Math.max(0, dimArrays.length - 2);
                    const targetDim = dimArrays[yIdx] || dimArrays[0];
                    const shouldFlip = (targetDim && targetDim.length >= 2) ? targetDim[1] < targetDim[0] : false;
                    setFlipY(shouldFlip);   
                }))
                Promise.all(promises).then(async () =>{
                    try{
                        await parseExtent();
                    } catch{}
                    setValueScales(valueScales)
                    createDataTexture();
                    if (preProject) {
                        usePlotStore.setState({
                            nativeCRS: urlNativeCRS ?? usePlotStore.getState().nativeCRS,
                            destCRS: urlDestCRS,
                            preProject: false
                        });
                        reproject();
                    }
                    else handleIrregularGrid();
                    setShow(true);
                    setPlotOn(true);
                    setStatus(null);
                    setUnits(units)
                    setScalingFactors(scalingFactors)
                });
            } catch (error) {
                setStatus(null);
                return;
            }
        } else {
            setMetadata(null);
        }
    }, [reFetch]); 

  useEffect(() => {
    // This cleanup function will run when the `textures` state is about to change,
    // or when the component unmounts.
    return () => {
      if (mainTextures) {
        mainTextures.forEach(tex => {
          tex.dispose();
        });
      }
    };
  }, [mainTextures]);

    return { show, stableMetadata };
};

