import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { useGlobalStore, usePlotStore, useZarrStore } from '@/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { ParseExtent, GetDimInfo } from '@/utils/HelperFuncs';
import { GetArray, GetAttributes } from '@/components/zarr/ZarrLoaderLRU';
import { ArrayToTexture } from '@/components/textures';

export const useDataFetcher = () => {
    const {
    setShape, setDataShape, setFlipY, setValueScales, setMetadata, setDimArrays, 
    setDimNames, setDimUnits, setPlotOn, setStatus} = useGlobalStore(
    useShallow(state => ({  
        setShape:state.setShape,
        setDataShape: state.setDataShape,
        setFlipY:state.setFlipY,
        setValueScales:state.setValueScales,
        setMetadata: state.setMetadata,
        setDimArrays:state.setDimArrays, 
        setDimNames:state.setDimNames,
        setDimUnits:state.setDimUnits,
        setPlotOn: state.setPlotOn,
        setStatus: state.setStatus  
    })))
    const {variable, is4D, setIsFlat} = useGlobalStore(
        useShallow(state=>({
            variable: state.variable, 
            is4D: state.is4D,
            setIsFlat: state.setIsFlat, 
    })))
    const {plotType, interpPixels, setPlotType} = usePlotStore(
        useShallow(state => ({
            plotType: state.plotType,
            interpPixels:state.interpPixels,
            setPlotType: state.setPlotType
    })))
    const {zSlice, ySlice, xSlice, reFetch} = useZarrStore(
        useShallow(state=> ({
            zSlice: state.zSlice,
            ySlice: state.ySlice,
            xSlice: state.xSlice,
            reFetch: state.reFetch,
            coarsen: state.coarsen,
            kernelDepth: state.kernelDepth,
            kernelSize: state.kernelSize
    })))

    //---- Local State ----//
    const [textures, setTextures] = useState<THREE.DataTexture[] | THREE.Data3DTexture[] | null>(null);
    const [show, setShow] = useState<boolean>(true);
    const [stableMetadata, setStableMetadata] = useState<Record<string, any>>({});

    useEffect(() => {
        if (variable !== "Default") {
            setShow(false);
            try {
                //---- Texture Cleanup ----//
                if (textures) {
                    textures.forEach((tex) => {
                        tex.dispose();
                        if (tex.source) (tex.source as any).data = null;
                    });
                }

                //---- Set Plot Slicez ----//
                const { setZSlice, setYSlice, setXSlice } = usePlotStore.getState();
                setZSlice(zSlice);
                setYSlice(ySlice);
                setXSlice(xSlice);

                //---- Main Fetch ----//
                GetArray().then((result) => {
                    const shape = result.shape;
                    const [tempTexture, scaling] = ArrayToTexture({
                        data: result.data,
                        shape
                    });

                    setTextures(tempTexture);
                    setValueScales(scaling as { maxVal: number; minVal: number });
                    useGlobalStore.getState().setScalingFactor(result.scalingFactor);

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
                    
                    setShow(true);
                    setPlotOn(true);
                    setStatus(null);
                });
            } catch (error) {
                console.error(error);
                setStatus(null);
                return;
            }

            //---- Metadata ----//
            GetAttributes().then((result) => {
                setMetadata(result);
                setStableMetadata(result);
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

        } else {
            setMetadata(null);
        }
    }, [reFetch]); 

    useEffect(()=> {
    if (!textures) return;
    const updated = textures.map(tex => {
      const clone = tex.clone(); 
      if (interpPixels) {
        clone.minFilter = THREE.LinearFilter;
        clone.magFilter = THREE.LinearFilter;
      } else {
        clone.minFilter = THREE.NearestFilter;
        clone.magFilter = THREE.NearestFilter;
      }
      clone.needsUpdate = true; 
      return clone ;
    });
    setTextures(updated as THREE.Data3DTexture[] | THREE.DataTexture[]);
  },[interpPixels])

  useEffect(() => {
    // This cleanup function will run when the `textures` state is about to change,
    // or when the component unmounts.
    return () => {
      if (textures) {
        textures.forEach(tex => {
          tex.dispose();
        });
      }
    };
  }, [textures]);

    return { textures, show, stableMetadata, setTextures };
};