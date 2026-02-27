"use client";
import { ArrayMinMax, GetCurrentArray } from '@/utils/HelperFuncs';
import * as THREE from 'three';
import React, { useEffect, useRef } from 'react';
import { DataReduction, Convolve, Multivariate2D, Multivariate3D, CUMSUM3D, Convolve2D, CustomShader } from '../computation/webGPU';
import { useGlobalStore, useAnalysisStore, usePlotStore } from '@/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { GetArray } from '../zarr/ZarrLoaderLRU';
import { CreateTexture } from '../textures';

// The new centralized map for all operations
const ShaderMap = {
    // Reductions
    Mean: "MeanReduction",
    Min: "MinReduction",
    Max: "MaxReduction",
    StDev: "StDevReduction",
    LinearSlope: "LinearSlopeReduction",
    // 3D Convolutions
    Mean3D: "MeanConvolution",
    Min3D: "MinConvolution",
    Max3D: "MaxConvolution",
    StDev3D: "StDevConvolution",
    // 2D Convolutions
    Mean2D: "MeanConvolution2D",
    Min2D: "MinConvolution2D",
    Max2D: "MaxConvolution2D",
    StDev2D: "StDevConvolution2D",
    // Multivariate
    Correlation2D: "CorrelationReduction",
    Correlation3D: "CorrelationConvolution",
    TwoVarLinearSlope2D: "TwoVarLinearSlopeReduction",
    TwoVarLinearSlope3D: "TwoVarLinearSlopeConvolution",
    Covariance2D: "CovarianceReduction",
    Covariance3D: "CovarianceConvolution",
    // Special
    CUMSUM3D: "CUMSUM3D"
};

// Define a type for our operations based on the ShaderMap keys
type Operation = keyof typeof ShaderMap;

const AnalysisWG = ({ setTexture, }: { setTexture: React.Dispatch<React.SetStateAction<THREE.Data3DTexture[] | THREE.DataTexture[] | null>> }) => {

    // Global state hooks remain the same
    const { strides, dataShape, valueScales, isFlat, plotOn, setIsFlat, setStatus, setValueScales } = useGlobalStore(useShallow(state => ({
        strides: state.strides, dataShape: state.dataShape, valueScales: state.valueScales,
        isFlat: state.isFlat, plotOn:state.plotOn, setIsFlat: state.setIsFlat, setStatus: state.setStatus,
         setValueScales: state.setValueScales,
    })));

    const setPlotType = usePlotStore(state => state.setPlotType);

    const { axis, execute, operation, useTwo, variable2, executeCustom, valueScalesOrig, kernelOperation, kernelSize, kernelDepth, reverseDirection, outputShape, analysisStore, analysisMode, analysisArray, analysisDim,
        setValueScalesOrig, setAnalysisArray, setAnalysisMode, customShader } = useAnalysisStore(useShallow(state => ({
            axis: state.axis, execute: state.execute, operation: state.operation, useTwo: state.useTwo, variable2: state.variable2,
            valueScalesOrig: state.valueScalesOrig, kernelOperation: state.kernelOperation, kernelSize: state.kernelSize, kernelDepth: state.kernelDepth,
            reverseDirection: state.reverseDirection, analysisStore: state.analysisStore, analysisMode: state.analysisMode,
            analysisArray: state.analysisArray, analysisDim: state.analysisDim, outputShape:state.outputShape,
            executeCustom: state.executeCustom, setValueScalesOrig: state.setValueScalesOrig,
            setAnalysisArray: state.setAnalysisArray, setAnalysisMode: state.setAnalysisMode, customShader: state.customShader
        })));

    const {zSlice, ySlice, xSlice} = usePlotStore(useShallow(state => ({
        zSlice: state.zSlice,
        ySlice: state.ySlice,
        xSlice: state.xSlice
    })));
    const isMounted = useRef(false)
    
    useEffect(() => {
        if (!plotOn){
            return
        }
        const dataArray = GetCurrentArray(analysisStore);
        // Guard clauses: exit if not triggered, no operation is selected, or data is invalid.
        if (!operation || dataArray.length <= 1) {
            return;
        }
        const executeAnalysis = async () => {
            setStatus("Computing...");
            const currentOperation = operation == 'Convolution' ? kernelOperation as Operation : operation as Operation; // If it's convolution use the kernelOperation
            let newArray: Float16Array | Float32Array | undefined;
            let is3DResult = !isFlat; // Assume the result's dimensionality until determined

            // --- 1. Fetch second variable if needed ---
            let var2Data: ArrayBufferView | null = null;
            if (useTwo) {
                setStatus("Fetching second variable...")
                const var2Array = await GetArray(variable2);
                var2Data = var2Array?.data;
                setStatus("Computing...");
                if (!var2Data) {
                    console.error("Failed to fetch data for the second variable.");
                    setStatus(null);
                    return;
                }
            }

            // --- 2. Dispatch GPU computation based on the operation ---
            const inputArray = analysisMode ? analysisArray : dataArray;
            const shapeInfo = { shape: dataShape, strides};
            const kernelParams = { kernelDepth, kernelSize };
            // [1538316, 1481, 1]
            switch (currentOperation) {
                // Reductions -> 2D Result
                case 'Mean': case 'Min': case 'Max': case 'StDev': case 'LinearSlope':
                    newArray = await DataReduction(inputArray, shapeInfo, axis, currentOperation);
                    is3DResult = false;
                    break;

                // 3D Convolutions -> 3D Result
                case 'Mean3D': case 'Min3D': case 'Max3D': case 'StDev3D':
                    newArray = await Convolve(inputArray, shapeInfo, currentOperation, kernelParams);
                    is3DResult = true;
                    break;

                // 2D Convolutions -> 2D Result
                case 'Mean2D': case 'Min2D': case 'Max2D': case 'StDev2D':
                    const shape2D = dataShape.length > 2 ? dataShape.filter((_, idx) => idx !== analysisDim) : dataShape;
                    const strides2D = strides.length > 2 ? [shape2D[1], 1] : strides;
                    newArray = await Convolve2D(inputArray, { shape: shape2D, strides: strides2D }, currentOperation, kernelSize);
                    is3DResult = false;
                    break;

                // Multivariate Reductions -> 2D Result
                case 'Correlation2D': case 'TwoVarLinearSlope2D': case 'Covariance2D':
                    newArray = await Multivariate2D(inputArray, var2Data!, shapeInfo, axis, currentOperation);
                    is3DResult = false;
                    break;

                // Multivariate Convolutions -> 3D Result
                case 'Correlation3D': case 'TwoVarLinearSlope3D': case 'Covariance3D':
                    newArray = await Multivariate3D(inputArray, var2Data!, shapeInfo, kernelParams, currentOperation);
                    is3DResult = true;
                    break;

                // Special Cases -> 3D Result
                case 'CUMSUM3D':
                    newArray = await CUMSUM3D(inputArray, shapeInfo, axis, reverseDirection);
                    is3DResult = true;
                    break;

                default:
                    console.warn(`Unknown operation: ${currentOperation}`);
                    setStatus(null);
                    return;
            }

            // --- 3. Process and display the result ---
            if (!newArray) {
                setStatus(null);
                return;
            }

            // --- Value scaling logic ---
            let minVal, maxVal;
            const needsRescale = ['StDev', 'LinearSlope', 'Covariance', 'CUMSUM3D'].some(op => currentOperation.includes(op));
            const isCorrelation = currentOperation.includes('Correlation');

            if (needsRescale) {
                if (!valueScalesOrig) setValueScalesOrig(valueScales);
                [minVal, maxVal] = ArrayMinMax(newArray);
            } else if (isCorrelation) {
                if (!valueScalesOrig) setValueScalesOrig(valueScales);
                [minVal, maxVal] = [-1, 1];
            } else {
                ({ minVal, maxVal } = valueScales);
            }
            setValueScales({ minVal, maxVal });
            let _scales;
            const thisShape = dataShape.length > 2 ? dataShape.filter((_, idx) => idx !== axis) : dataShape;
            const textureData = new Uint8Array(newArray.length)
            const range = (maxVal - minVal)
            for (let i = 0; i < newArray.length; i++){
                const normed = (newArray[i] - minVal) / range;
                if (isNaN(normed)){
                    textureData[i] = 255;
                } else {
                    textureData[i] = normed * 254;
                }
            };
            const newTexture = CreateTexture(is3DResult ? dataShape : thisShape, textureData)
            // --- Final state updates ---
            setAnalysisArray(newArray);
            if (newTexture){
                setTexture(newTexture);
            }
            setIsFlat(!is3DResult);
            setPlotType(is3DResult ? 'volume' : 'flat');
            setAnalysisMode(true);
            setStatus(null);
        };
        executeAnalysis();

    }, [execute]); 

    useEffect(()=>{
        const shapeInfo = { dataShape, outputShape, strides};
        const kernelParams = { kernelDepth, kernelSize };

        const is2D = outputShape.length === 2
        async function Analyze(){
            const dataArray = GetCurrentArray(analysisStore);
            const newArray = await CustomShader(dataArray, shapeInfo, kernelParams, axis, customShader?? "") as Float16Array
            const {minVal, maxVal} = valueScales
            const textureData = new Uint8Array(newArray.length)
            const range = (maxVal - minVal)
            for (let i = 0; i < newArray.length; i++){
                const normed = (newArray[i] - minVal) / range;
                if (isNaN(normed)){
                    textureData[i] = 255;
                } else {
                    textureData[i] = normed * 254;
                }
            };
            const newTexture = CreateTexture(outputShape, textureData)
            setAnalysisArray(newArray);
            if (newTexture){
                setTexture(newTexture);
            }
            setIsFlat(is2D)
            setPlotType(is2D ? 'flat' : 'volume')
            setAnalysisMode(true);
            setStatus(null);
        }
       
        Analyze()
    },[executeCustom])

    return null;
}

export default AnalysisWG;