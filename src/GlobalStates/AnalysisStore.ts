
import { create } from "zustand";
const ESDC = 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr'

type AnalysisState = {
  analysisMode: boolean;
  axis: number;
  operation: string;
  execute: boolean;
  useTwo: boolean;
  variable2: string;
  valueScalesOrig: {minVal: number, maxVal:number} | null
  kernelSize: number;
  kernelDepth: number;
  kernelOperation: string;
  analysisArray: Uint8Array | Float32Array | Float16Array;
  reverseDirection: number;
  analysisStore: string;
  analysisDim: number | null;
  customShader: string | undefined;
  useEditor: boolean;

  setAnalysisMode: (analysisMode: boolean) => void;
  setAxis: (axis: number) => void;
  setOperation: (operation: string) => void;
  setExecute: (execute: boolean) => void;
  setUseTwo: (useTwo: boolean) => void;
  setVariable2: (variable2: string) => void;
  setValueScalesOrig: (valueScalesOrig: {minVal: number, maxVal:number} | null) => void;
  setKernelSize: (kernelSize: number) => void;
  setKernelDepth: (kernelDepth: number) => void;
  setKernelOperation: (kernelOperation: string) => void;
  setAnalysisArray: (analysisArray: Uint8Array | Float32Array | Float16Array) => void;
  setReverseDirection: (reverseDirection: number) => void;
  setAnalysisStore: (analysisStore: string) => void;
  setAnalysisDim: (analysisDim: number | null) => void;
  setCustomShader: (customShader: string | undefined) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  analysisMode: false,
  axis: 0,
  operation: "Default", 
  execute: false,
  useTwo: false,
  variable2: "Default",
  valueScalesOrig: null,
  kernelSize: 3,
  kernelDepth: 3,
  kernelOperation: 'Default',
  analysisArray: new Uint8Array(1),
  reverseDirection: 0,
  analysisStore: ESDC,
  analysisDim: null,
  customShader: undefined,
  useEditor: false,

  setAnalysisMode: (analysisMode) => set({ analysisMode }),
  setAxis: (axis) => set({ axis }),
  setOperation: (operation) => set({ operation }),
  setExecute: (execute) => set({ execute }),
  setUseTwo: (useTwo) => set({ useTwo}),
  setVariable2: (variable2) => set({ variable2 }), 
  setValueScalesOrig: (valueScalesOrig) => set({ valueScalesOrig }),
  setKernelSize: (kernelSize) => set({ kernelSize}),
  setKernelDepth: (kernelDepth) => set({ kernelDepth }),
  setKernelOperation: (kernelOperation) => set({ kernelOperation}),
  setAnalysisArray: (analysisArray) => set({ analysisArray }),
  setReverseDirection: (reverseDirection) => set( { reverseDirection} ),
  setAnalysisStore: (analysisStore) => set({ analysisStore }),
  setAnalysisDim: (analysisDim) => set({ analysisDim }),
  setCustomShader: (customShader) => set({ customShader }),
}));