
import { create } from "zustand";
const ESDC = 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr'

type AnalysisState = {
  analysisMode: boolean;
  axis: number;
  reduceOnAxis: boolean;
  execute: boolean;
  useTwo: boolean;
  variable2: string;
  valueScalesOrig: {minVal: number, maxVal:number} | null
  analysisArray: Uint8Array | Float32Array | Float16Array;
  analysisStore: string;
  analysisDim: number | null; //The collapsed dim after a dim reduction
  analysisShape: number[]; // The shape of the analysisArray
  customShader: string | undefined;
  useEditor: boolean;
  executeCustom: boolean;
  outputShape: number[];
  analysisInfo: {operation: string | undefined, kernelOp: string | undefined, axis: number, reverse: boolean, kernelShape:{size: number, depth:number}} | undefined;

  setAnalysisMode: (analysisMode: boolean) => void;
  setAxis: (axis: number) => void;
  setReduceOnAxis: (reduceOnAxis: boolean) => void;
  setExecute: (execute: boolean) => void;
  setUseTwo: (useTwo: boolean) => void;
  setVariable2: (variable2: string) => void;
  setValueScalesOrig: (valueScalesOrig: {minVal: number, maxVal:number} | null) => void;
  setAnalysisArray: (analysisArray: Uint8Array | Float32Array | Float16Array) => void;
  setAnalysisStore: (analysisStore: string) => void;
  setAnalysisDim: (analysisDim: number | null) => void;
  setAnalysisShape: (analysisShape: number[]) => void;
  setCustomShader: (customShader: string | undefined) => void;
  setOutPutShape: (outputShape: number[]) => void;
  setAnalysisInfo: (analysisInfo: {operation: string | undefined, kernelOp: string | undefined, axis: number, reverse: boolean, kernelShape:{size: number, depth:number}}) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  analysisMode: false,
  axis: 0,
  reduceOnAxis: false,
  execute: false,
  useTwo: false,
  variable2: "Default",
  valueScalesOrig: null,
  analysisArray: new Uint8Array(1),
  analysisStore: ESDC,
  analysisDim: null,
  analysisShape: [],
  customShader: undefined,
  useEditor: false,
  executeCustom:false,
  outputShape: [],
  analysisInfo:undefined,
  

  setAnalysisMode: (analysisMode) => set({ analysisMode }),
  setAxis: (axis) => set({ axis }),
  setReduceOnAxis: (reduceOnAxis) => set({ reduceOnAxis }),
  setExecute: (execute) => set({ execute }),
  setUseTwo: (useTwo) => set({ useTwo}),
  setVariable2: (variable2) => set({ variable2 }), 
  setValueScalesOrig: (valueScalesOrig) => set({ valueScalesOrig }),
  setAnalysisArray: (analysisArray) => set({ analysisArray }),
  setAnalysisStore: (analysisStore) => set({ analysisStore }),
  setAnalysisDim: (analysisDim) => set({ analysisDim }),
  setAnalysisShape: (analysisShape) => set({ analysisShape }),
  setCustomShader: (customShader) => set({ customShader }),
  setOutPutShape: (outputShape) => set({ outputShape }),
  setAnalysisInfo: (analysisInfo) => set({ analysisInfo })
}));