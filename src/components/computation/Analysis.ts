import { useAnalysisStore } from "@/GlobalStates/AnalysisStore";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { GetArray } from "../zarr/GetArray";
import { ArrayMinMax, GetCurrentArray, calculateStrides } from "@/utils/HelperFuncs";
import { DataProcess } from "./webGPU";
import { CreateTexture } from "../textures";
import { usePlotStore } from "@/GlobalStates/PlotStore";
import { getValueScales } from "@/hooks";

export async function Analysis(){
	const { strides, dataShape, plotOn, setIsFlat, setStatus, setMainTextures, setValueScales, setScalingFactor } = useGlobalStore.getState()
    const { useTwo, variable2, analysisInfo, valueScalesOrig, analysisStore, analysisMode, analysisArray, analysisShape,
        setValueScalesOrig, setAnalysisArray, setAnalysisMode, setAnalysisShape } = useAnalysisStore.getState()
    const {setPlotType} = usePlotStore.getState();
    const valueScales = getValueScales()
    if (!analysisInfo) return;
    const {operation, kernelOp, kernelShape, reverse, axis} = analysisInfo;
	if (!plotOn || !operation) return;
	setStatus("Computing...");
	// --- Fetch second variable if needed --- //
	let var2Data: ArrayBufferView | undefined;
	if (useTwo) {
		setStatus("Fetching second variable...")
		await GetArray(variable2);
		var2Data = GetCurrentArray(analysisStore, variable2);
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
	const dimInfo = analysisMode ? { shape: analysisShape, strides: calculateStrides(analysisShape) }
        : { shape: dataShape, strides };
	// ---- 3. Process and Check --- //
    const result = await DataProcess(inputArray, var2Data, dimInfo, operation, kernelOp, kernelShape, axis, reverse)
    if (!result) {
        setStatus(null);
        return;
    }
    const newArray = result.array;
    const thisShape = result.shape
    const newScalingFactor = result.scalingFactor;
    setScalingFactor(newScalingFactor)
    setAnalysisShape(thisShape);
    // --- Value scaling logic --- //
    let minVal, maxVal;
    const needsRescale = ['Deviation', 'Linear', 'Covariance', 'CUMSUM3D'].some(op => operation.includes(op)) ||
        ['Deviation', 'Linear', 'Covariance', 'CUMSUM3D'].some(op => kernelOp?.includes(op))
    ;
    const isCorrelation = operation.includes('Correlation') || kernelOp?.includes('Correlation');
    if (needsRescale) {
        if (!valueScalesOrig) setValueScalesOrig(valueScales);
        [minVal, maxVal] = ArrayMinMax(newArray);
    } else if (isCorrelation) {
        if (!valueScalesOrig) setValueScalesOrig(valueScales);
        [minVal, maxVal] = [-1, 1];
    } else {
        ({ minVal, maxVal } = valueScales);
    }
    setValueScales([{ minVal, maxVal }]);
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
    const newTexture = CreateTexture(thisShape, textureData)
    // --- Final state updates --- //
    setAnalysisArray(newArray);
    if (newTexture){
        setMainTextures(newTexture);
    }
    const newFlat = thisShape.length == 2
    setIsFlat(newFlat);
    setPlotType(newFlat ? 'flat' : 'volume' );
    setAnalysisMode(true);
    setStatus(null);
}