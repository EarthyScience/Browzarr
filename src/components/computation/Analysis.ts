import { useAnalysisStore } from "@/GlobalStates/AnalysisStore";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { GetArray } from "../zarr/GetArray";
import { GetCurrentArray } from "@/utils/HelperFuncs";

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

export async function Analysis(){
	const { strides, dataShape, valueScales, isFlat, plotOn, setIsFlat, setStatus, setValueScales } = useGlobalStore.getState()
    const { axis, execute, useTwo, variable2, executeCustom, 
        valueScalesOrig, kernelOperation, kernelSize, kernelDepth, reverseDirection, operationString,
		outputShape, analysisStore, analysisMode, analysisArray, analysisDim, customShader } = useAnalysisStore.getState()

	const operation = operationString.split(':').at(-1) 
	const is2DOp = operationString.split(':').at(1) 
	
	if (!plotOn || !operation) return;
	setStatus("Computing...");
	let newArray: Float16Array | Float32Array | undefined;
	let is3DResult = !isFlat; // Assume the result's dimensionality until determined

	// --- 1. Fetch second variable if needed ---//
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

	 // --- 2. Dispatch GPU computation based on the operation --- //
	const inputArray = analysisMode ? analysisArray : await GetCurrentArray(analysisStore)
	const shapeInfo = { shape: dataShape, strides};
	const kernelParams = { kernelDepth, kernelSize };

	// ---- 3. Call Specific Operation --- //


}