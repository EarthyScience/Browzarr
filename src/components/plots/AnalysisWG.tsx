"use client";
import { ArrayMinMax, GetCurrentArray } from '@/utils/HelperFuncs';
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { DataReduction, Convolve, Multivariate2D, Multivariate3D, CUMSUM3D, Convolve2D } from '../computation/webGPU'
import { useGlobalStore, useAnalysisStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { ZarrDataset } from '../zarr/ZarrLoaderLRU';


const AnalysisWG = ({setTexture, ZarrDS} : {setTexture : React.Dispatch<React.SetStateAction<THREE.Data3DTexture | THREE.DataTexture | null>>, ZarrDS: ZarrDataset}) => {
    
    const { strides, dataShape, valueScales, isFlat, setIsFlat, setDownloading, setShowLoading, setValueScales} = useGlobalStore(useShallow(state=>({
        strides: state.strides,
        dataShape: state.dataShape,
        valueScales: state.valueScales,
        isFlat: state.isFlat,
        setIsFlat: state.setIsFlat,
        setDownloading: state.setDownloading,
        setShowLoading: state.setShowLoading,
        setValueScales: state.setValueScales,
    })))

    const setPlotType = usePlotStore(state => state.setPlotType)
    const {axis, execute, operation, useTwo, variable2, 
        valueScalesOrig, kernelSize, kernelDepth, kernelOperation, reverseDirection, analysisStore, analysisMode, analysisArray,analysisDim,
        setValueScalesOrig, setAnalysisArray, setAnalysisMode, setOperation} = useAnalysisStore(useShallow(state => ({
        axis: state.axis,
        execute: state.execute,
        operation: state.operation,
        useTwo: state.useTwo,
        variable2: state.variable2,
        valueScalesOrig: state.valueScalesOrig,
        kernelSize: state.kernelSize,
        kernelDepth: state.kernelDepth,
        kernelOperation: state.kernelOperation,
        reverseDirection: state.reverseDirection,
        analysisStore: state.analysisStore,
        analysisMode: state.analysisMode,
        analysisArray: state.analysisArray,
        analysisDim: state.analysisDim,
        setValueScalesOrig: state.setValueScalesOrig,
        setAnalysisArray: state.setAnalysisArray,
        setAnalysisMode: state.setAnalysisMode,
        setOperation: state.setOperation
    })))

    const zarrSlice = useZarrStore(state => state.slice)
    const variable2Array = useRef<ArrayBufferView>(new Float32Array(1))

    // 3D Computations
    useEffect(()=>{ 
        const dataArray = GetCurrentArray(analysisStore) as Float16Array
        if (dataArray.length <= 1 || isFlat){
            return;
        }
        setShowLoading(true)
        if (!useTwo){
            if (operation != 'Convolution'){
                const thisShape = dataShape.filter((e, idx) => idx != axis)
                const is3D = operation == 'CUMSUM3D'
                async function GPUCompute(){
                    let newArray;
                    if (operation == 'CUMSUM3D'){
                        newArray = await CUMSUM3D(analysisMode ? analysisArray : dataArray, {shape:dataShape, strides}, axis, reverseDirection)
                    }
                    else{
                        newArray = await DataReduction(analysisMode ? analysisArray : dataArray, {shape:dataShape, strides}, axis, operation)
                    }
                    if (!newArray){return;}

                    let minVal, maxVal;
                    if (['StDev', 'CUMSUM', 'CUMSUM3D', 'LinearSlope'].includes(operation)){
                        [minVal,maxVal] = ArrayMinMax(newArray)
                        if (!valueScalesOrig){
                            setValueScalesOrig(valueScales)
                        }
                        setValueScales({minVal,maxVal})
                    }else{
                            minVal = valueScales.minVal;
                            maxVal = valueScales.maxVal
                    }
                    const normed = newArray.map(e=> (e-minVal)/(maxVal-minVal))
                    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254)); 
                    const newText = is3D ? new THREE.Data3DTexture(textureData, dataShape[2], dataShape[1], dataShape[0]): 
                        new THREE.DataTexture(textureData, thisShape[1], thisShape[0], THREE.RedFormat, THREE.UnsignedByteType)
                    if (is3D){
                        newText.format = THREE.RedFormat;
                        newText.minFilter = THREE.NearestFilter;
                        newText.magFilter = THREE.NearestFilter;
                    }
                    newText.needsUpdate = true;
                    setAnalysisArray(newArray)
                    setTexture(newText)
                    if (operation != 'CUMSUM3D'){
                        setIsFlat(true);
                        setPlotType('flat');
                    }
                    setAnalysisMode(true);
                    setShowLoading(false);
                }
                GPUCompute();
            }
            else{
                Convolve(analysisMode ? analysisArray : dataArray, {shape:dataShape, strides}, kernelOperation, {kernelDepth, kernelSize}).then(newArray=>{
                    if (!newArray){return;}
                    let minVal, maxVal;
                    if (kernelOperation == 'StDev'){
                        [minVal,maxVal] = ArrayMinMax(newArray )
                        if (!valueScalesOrig){
                            setValueScalesOrig(valueScales);
                        }
                        setValueScales({minVal,maxVal});
                    }else{
                        if (!valueScalesOrig){
                            minVal = valueScales.minVal;
                            maxVal = valueScales.maxVal;
                        }
                        else{
                            minVal = valueScalesOrig.minVal;
                            maxVal = valueScalesOrig.maxVal;
                            setValueScales(valueScalesOrig);
                            setValueScalesOrig(null);
                        }
                    }
                    const normed = newArray.map(e=> (e-minVal)/(maxVal-minVal))
                    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254)); 
                    const newText = new THREE.Data3DTexture(textureData, dataShape[2], dataShape[1], dataShape[0])
                    newText.format = THREE.RedFormat;
                    newText.minFilter = THREE.NearestFilter;
                    newText.magFilter = THREE.NearestFilter;
                    newText.needsUpdate = true;
                    setAnalysisArray(newArray);
                    setTexture(newText);
                    setIsFlat(false);
                    setPlotType('volume');
                })
                .then(e=>{
                    setAnalysisMode(true);
                    setShowLoading(false);
                }) 
            }
        }
        else{
            async function MultiVariable(){
                setDownloading(true)
                variable2Array.current = await ZarrDS.GetArray(variable2, zarrSlice)
                setDownloading(false)
                if (['TwoVarLinearSlope2D', 'Correlation2D', 'Covariance2D'].includes(operation)){ //These are 2D operations
                    const thisShape = dataShape.filter((e, idx) => idx != axis)
                    //@ts-expect-error It won't be undefined here as Multivariate2D only outputs undefined if webGPU disabled. However, impossible to call if webGPU disabled so moot point
                    const newArray: Float16Array = await Multivariate2D(analysisMode ? analysisArray : dataArray, variable2Array.current.data, {shape:dataShape, strides}, axis, operation)
                    if (!valueScalesOrig){
                            setValueScalesOrig(valueScales)
                    }
                    let [minVal, maxVal] = [-1, 1]; //Set to -1-1 for correlation
                    if (['TwoVarLinearSlope2D', 'Covariance2D'].includes(operation)){
                        [minVal, maxVal] = ArrayMinMax(newArray) //If slope get actual bounds
                    }
                    setValueScales({minVal,maxVal}) 
                    const normed = newArray.map(e=> (e-minVal)/(maxVal-minVal))
                    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254)); 
                    const newText = new THREE.DataTexture(textureData, thisShape[1], thisShape[0], THREE.RedFormat, THREE.UnsignedByteType)
                    newText.needsUpdate = true;
                    setAnalysisArray(newArray)
                    setTexture(newText)
                    setIsFlat(true)
                    setPlotType('flat')
                }
                else{ //These are 3D operations
                    //@ts-expect-error It won't be undefined here as correlate2D only outputs undefined if webGPU disabled. However, impossible to call if webGPU disabled
                    const newArray: Float16Array = await Multivariate3D(analysisMode ? analysisArray : dataArray, variable2Array.current.data, {shape:dataShape, strides}, {kernelDepth, kernelSize}, operation)
                    if (!valueScalesOrig){
                            setValueScalesOrig(valueScales)
                    }
                    let [minVal, maxVal] = [-1, 1];
                    if (['TwoVarLinearSlope3D', 'Covariance3D'].includes(operation)){
                        [minVal, maxVal] = ArrayMinMax(newArray) //If slope get actual bounds
                    }
                    setValueScales({minVal,maxVal})
                    const normed = newArray.map(e=> (e-minVal)/(maxVal-minVal))
                    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254)); 
                    const newText = new THREE.Data3DTexture(textureData, dataShape[2], dataShape[1], dataShape[0])
                    newText.format = THREE.RedFormat;
                    newText.minFilter = THREE.NearestFilter;
                    newText.magFilter = THREE.NearestFilter;
                    newText.needsUpdate = true;
                    setAnalysisArray(newArray);
                    setTexture(newText);
                    setIsFlat(false);
                    setPlotType('volume');
                }
            }
            MultiVariable().then(e=>{setAnalysisMode(true);setShowLoading(false)});
        }
    },[execute])

    //2D computations
    useEffect(()=>{
        const dataArray = GetCurrentArray(analysisStore) as Float16Array
        if (dataArray.length <= 1 || !isFlat){
            return;
        }
        setShowLoading(true)
        if (!useTwo){
            if (operation != 'Convolution'){
                //Future Proof
            }
            else{
                const thisShape = dataShape.length > 2 ? dataShape.filter((_val,idx)=> idx != analysisDim) : dataShape //This should only trigger with 3D data if an analysisDim was set
                const thisStrides = strides.length > 2 ? [thisShape[1], 1] : strides
                Convolve2D(analysisMode ? analysisArray : dataArray, {shape:thisShape, strides:thisStrides}, kernelOperation, kernelSize).then(newArray=>{
                    if (!newArray){return;}
                    let minVal, maxVal;
                    if (kernelOperation == 'StDev'){
                        [minVal,maxVal] = ArrayMinMax(newArray )
                        if (!valueScalesOrig){
                            setValueScalesOrig(valueScales)
                        }
                        setValueScales({minVal,maxVal})
                    }else{
                            minVal = valueScales.minVal;
                            maxVal = valueScales.maxVal
                    }
                    const normed = newArray.map(e=> (e-minVal)/(maxVal-minVal))
                    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254));
                    const newText = new THREE.DataTexture(textureData, thisShape[1], thisShape[0], THREE.RedFormat, THREE.UnsignedByteType)
                    newText.needsUpdate = true;
                    setAnalysisArray(newArray);
                    setTexture(newText);
                    setAnalysisMode(true);
                    setShowLoading(false);
                })
            }
        }
    },[execute])

  return null
    
}

export default AnalysisWG
