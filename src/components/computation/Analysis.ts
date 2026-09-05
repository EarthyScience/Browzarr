import { useAnalysisStore } from "@/GlobalStates/AnalysisStore";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { GetArray } from "../zarr/GetArray";
import { ArrayMinMax, GetCurrentArray } from "@/utils/HelperFuncs";
import { DataProcess } from "./webGPU";
import { CreateTexture } from "../textures";
import { usePlotStore } from "@/GlobalStates/PlotStore";
import { useTextureStore } from "@/GlobalStates/TextureStore";

export async function Analysis(){
	const { strides, dataShape, valueScales, plotOn, isFlat, setIsFlat, setStatus, setValueScales } = useGlobalStore.getState()
    const { axis, useTwo, variable2, valueScalesOrig, kernelSize, kernelDepth, 
        reverseDirection, operationString, analysisStore, analysisMode, analysisArray, 
        setValueScalesOrig, setAnalysisArray, setAnalysisMode } = useAnalysisStore.getState()
    const {setPlotType} = usePlotStore.getState();
    const {setTextures} = useTextureStore.getState();
    const [_varCount, origShape, newShape, operation] = operationString.split(':')
	const isReduction = origShape != newShape;
    
	if (!plotOn || !operation) return;
	setStatus("Computing...");
	let newArray: Float16Array | Float32Array | undefined;

	// --- Fetch second variable if needed --- //
	let var2Data: ArrayBufferView | undefined;
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
    // --- Define Shapes --- //
    
	// --- Dispatch GPU computation based on the operation --- //
	const inputArray = analysisMode ? analysisArray : await GetCurrentArray(analysisStore)
	const dimInfo = { shape: dataShape, strides};
	const kernel = { kernelDepth, kernelSize };
	// ---- 3. Process and Check --- //
    const reduceDim = useTwo ? axis : undefined;
    newArray = await DataProcess(inputArray, var2Data, dimInfo, kernel, operationString, reduceDim, Boolean(reverseDirection))
    if (!newArray) {
        setStatus(null);
        return;
    }
    // --- Value scaling logic --- //
    let minVal, maxVal;
    const needsRescale = ['StDev', 'LinearSlope', 'Covariance', 'CUMSUM3D'].some(op => operationString.includes(op));
    const isCorrelation = operationString.includes('Correlation');

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
    const newTexture = CreateTexture(!isFlat ? dataShape : thisShape, textureData)
    // --- Final state updates --- //
    setAnalysisArray(newArray);
    if (newTexture){
        setTextures(newTexture);
    }
    setIsFlat(isFlat);
    setPlotType(isFlat ? 'flat' : 'volume' );
    setAnalysisMode(true);
    setStatus(null);
}