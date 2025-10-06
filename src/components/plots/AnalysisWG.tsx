"use client";
import { ArrayMinMax, GetCurrentArray } from '@/utils/HelperFuncs';
import * as THREE from 'three';
import React, { useEffect, useRef } from 'react';
import { DataReduction, Convolve, Multivariate2D, Multivariate3D, CUMSUM3D, Convolve2D } from '../computation/webGPU';
import { useGlobalStore, useAnalysisStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { ZarrDataset } from '../zarr/ZarrLoaderLRU';

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

const AnalysisWG = ({ setTexture, ZarrDS }: { setTexture: React.Dispatch<React.SetStateAction<THREE.Data3DTexture | THREE.DataTexture | null>>, ZarrDS: ZarrDataset }) => {

    // Global state hooks remain the same
    const { strides, dataShape, valueScales, isFlat, setIsFlat, setDownloading, setShowLoading, setValueScales } = useGlobalStore(useShallow(state => ({
        strides: state.strides, dataShape: state.dataShape, valueScales: state.valueScales,
        isFlat: state.isFlat, setIsFlat: state.setIsFlat, setDownloading: state.setDownloading,
        setShowLoading: state.setShowLoading, setValueScales: state.setValueScales,
    })));

    const setPlotType = usePlotStore(state => state.setPlotType);

    const { axis, execute, operation, useTwo, variable2, valueScalesOrig, kernelOperation, kernelSize, kernelDepth, reverseDirection, analysisStore, analysisMode, analysisArray, analysisDim,
        setValueScalesOrig, setAnalysisArray, setAnalysisMode, setOperation } = useAnalysisStore(useShallow(state => ({
            axis: state.axis, execute: state.execute, operation: state.operation, useTwo: state.useTwo, variable2: state.variable2,
            valueScalesOrig: state.valueScalesOrig, kernelOperation: state.kernelOperation, kernelSize: state.kernelSize, kernelDepth: state.kernelDepth,
            reverseDirection: state.reverseDirection, analysisStore: state.analysisStore, analysisMode: state.analysisMode,
            analysisArray: state.analysisArray, analysisDim: state.analysisDim, setValueScalesOrig: state.setValueScalesOrig,
            setAnalysisArray: state.setAnalysisArray, setAnalysisMode: state.setAnalysisMode, setOperation: state.setOperation
        })));

    const zarrSlice = useZarrStore(state => state.slice);

    useEffect(() => {
        const dataArray = GetCurrentArray(analysisStore);
        // Guard clauses: exit if not triggered, no operation is selected, or data is invalid.
        if (!operation || dataArray.length <= 1) {
            return;
        }
        const executeAnalysis = async () => {
            setShowLoading(true);
            const currentOperation = operation == 'Convolution' ? kernelOperation as Operation : operation as Operation; // If it's convolution use the kernelOperation
            let newArray: Float16Array | Float32Array | undefined;
            let is3DResult = !isFlat; // Assume the result's dimensionality until determined

            // --- 1. Fetch second variable if needed ---
            let var2Data: ArrayBufferView | null = null;
            if (useTwo) {
                setDownloading(true);
                const var2Array = await ZarrDS.GetArray(variable2, zarrSlice);
                var2Data = var2Array?.data;
                setDownloading(false);
                if (!var2Data) {
                    console.error("Failed to fetch data for the second variable.");
                    setShowLoading(false);
                    return;
                }
            }

            // --- 2. Dispatch GPU computation based on the operation ---
            const inputArray = analysisMode ? analysisArray : dataArray;
            const shapeInfo = { shape: dataShape, strides };
            const kernelParams = { kernelDepth, kernelSize };

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
                    newArray = await Convolve2D(inputArray, { shape: shape2D, strides: strides2D }, currentOperation.replace('2D', ''), kernelSize);
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
                    setShowLoading(false);
                    return;
            }

            // --- 3. Process and display the result ---
            if (!newArray) {
                setShowLoading(false);
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

            // --- Texture creation logic ---
            const range = maxVal - minVal;
            const normed = newArray.map(e => (e - minVal) / (range === 0 ? 1 : range));
            const textureData = new Uint8Array(normed.map(i => isNaN(i) ? 255 : i * 254));

            let newTexture;
            if (is3DResult) {
                newTexture = new THREE.Data3DTexture(textureData, dataShape[2], dataShape[1], dataShape[0]);
                newTexture.format = THREE.RedFormat;
                newTexture.minFilter = THREE.NearestFilter;
                newTexture.magFilter = THREE.NearestFilter;
            } else {
                const thisShape = dataShape.filter((_, idx) => idx !== axis);
                newTexture = new THREE.DataTexture(textureData, thisShape[1], thisShape[0], THREE.RedFormat, THREE.UnsignedByteType);
            }
            newTexture.needsUpdate = true;

            // --- Final state updates ---
            setAnalysisArray(newArray);
            setTexture(newTexture);
            setIsFlat(!is3DResult);
            setPlotType(is3DResult ? 'volume' : 'flat');
            setAnalysisMode(true);
            setShowLoading(false);
        };

        executeAnalysis();

    }, [execute]); 

    return null;
}

export default AnalysisWG;