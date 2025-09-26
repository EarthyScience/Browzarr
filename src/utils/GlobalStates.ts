import { create } from "zustand";
import * as THREE from 'three';
import { GetColorMapTexture } from "@/components/textures";
import { GetStore } from "@/components/zarr/ZarrLoaderLRU";
import MemoryLRU from "./MemoryLRU";


const ESDC = 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr'

interface Coord {
    name: string; 
    loc: number;  
    units: string;
  }
  export interface DimCoords {
    first: Coord;
    second: Coord;
    plot: Pick<Coord, "units">; // Only units
  }

type StoreState = {
  dataShape: number[];
  shape: THREE.Vector3;
  valueScales: { maxVal: number; minVal: number };
  colormap: THREE.DataTexture;
  timeSeries: Record<string, Record<string, any>>;
  strides: number[];
  showLoading: boolean;
  metadata: Record<string, any> | null;
  zMeta: object[];
  dimArrays: number[][];
  dimNames: string[];
  dimUnits: string[];
  dimCoords: Record<string, DimCoords>;
  plotDim: number;
  flipY:boolean;
  initStore:string;
  variable: string;
  variables: string[];
  plotOn: boolean;
  isFlat: boolean;
  progress: number;
  downloading: boolean;
  decompressing: boolean;
  is4D: boolean;
  idx4D: number | null;
  titleDescription: { title: string | null; description: string | null };
  
  // setters
  setDataShape: (dataShape: number[]) => void;
  setShape: (shape: THREE.Vector3) => void;
  setValueScales: (valueScales: { maxVal: number; minVal: number }) => void;
  setColormap: (colormap: THREE.DataTexture) => void;
  setTimeSeries: (timeSeries: Record<string, Record<string, any>>) => void;
  updateTimeSeries: (newEntries: Record<string, Record<string, any>>) => void;
  setStrides: (strides: number[]) => void;
  setShowLoading: (showLoading: boolean) => void;
  setMetadata: (metadata: object | null) => void;
  setZMeta: (zMeta: object[]) => void;
  setDimArrays: (dimArrays: number[][]) => void;
  setDimNames: (dimNames: string[]) => void;
  setDimUnits: (dimUnits: string[]) => void;
  setDimCoords: (dimCoords?: Record<string, DimCoords>) => void;
  updateDimCoords: (newDims: Record<string, DimCoords>) => void;
  setPlotDim: (plotDim: number) => void;
  setFlipY: (flipY:boolean) => void;
  setInitStore: (initStore:string ) => void;
  setVariable: (variable: string) => void;
  setVariables: (variables: string[]) => void;
  setPlotOn: (plotOn: boolean) => void;
  setIsFlat: (isFlat: boolean) => void;
  setProgress: (progress: number) => void;
  setDownloading: (downloading: boolean) => void;
  setDecompressing: (decompressing: boolean) => void;
  setIs4D: (is4D: boolean) => void;
  setIdx4D: (idx4D: number | null) => void;
  setTitleDescription: (titleDescription: { title: string | null; description: string | null }) => void;
};

export const useGlobalStore = create<StoreState>((set, get) => ({
  dataShape: [1, 1, 1],
  shape: new THREE.Vector3(2, 2, 2),
  valueScales: { maxVal: 1, minVal: -1 },
  colormap: GetColorMapTexture(),
  timeSeries: {},
  strides: [10368,144,1],
  showLoading: false,
  metadata: null,
  zMeta: [{}],
  dimArrays: [[0], [0], [0]],
  dimNames: ["Default"],
  dimUnits: ["Default"],
  dimCoords: {},
  plotDim: 0,
  flipY: false,
  initStore: ESDC,
  variable: 'Default',
  variables: [],
  plotOn: false,
  isFlat:false,
  progress: 0,
  downloading: false,
  is4D: false,
  idx4D: null,
  titleDescription: {title:null, description: null},
  decompressing: false,

  setDataShape: (dataShape) => set({ dataShape }),
  setShape: (shape) => set({ shape }),
  setValueScales: (valueScales) => set({ valueScales }),
  setColormap: (colormap) => set({ colormap }),
  setTimeSeries: (timeSeries) => set({ timeSeries }),
  updateTimeSeries: (newEntries) => {
    const merged = { ...newEntries, ...get().timeSeries  };

    // Slice to retain only the last 10 entries
    const limitedEntries = Object.entries(merged).slice(0, 10);

    const limitedTimeSeries = Object.fromEntries(limitedEntries);

    set({ timeSeries: limitedTimeSeries });
  },
  setStrides: (strides) => set({ strides }),
  setShowLoading: (showLoading) => set({ showLoading }),
  setMetadata: (metadata) => set({ metadata }),
  setZMeta: (zMeta) => set({ zMeta }),
  setDimArrays: (dimArrays) => set({ dimArrays }),
  setDimNames: (dimNames) => set({ dimNames }),
  setDimUnits: (dimUnits) => set({ dimUnits }),
  setDimCoords: (dimCoords) => set({ dimCoords }),
  updateDimCoords: (newDims) => {
    const merged = { ...newDims,...get().dimCoords  };

    // Convert to array of [key, value] pairs and slice to last 10
    const limitedEntries = Object.entries(merged)
      .slice(0, 10); // keep most recent 10 keys

    const limitedDimCoords = Object.fromEntries(limitedEntries);

    set({ dimCoords: limitedDimCoords });
  },
  setPlotDim: (plotDim) => set({ plotDim }),
  setFlipY: (flipY) => set({ flipY }),
  setInitStore: (initStore) => set({ initStore }),
  setVariable: (variable) => set({ variable }),
  setVariables: (variables) => set({ variables }),
  setPlotOn: (plotOn) => set({ plotOn }),
  setIsFlat: (isFlat) => set({ isFlat }),
  setProgress: (progress) => set({ progress }),
  setDownloading: (downloading) => set({ downloading }),
  setDecompressing: (decompressing) => set({ decompressing }),
  setIs4D: (is4D) => set({ is4D }),
  setIdx4D: (idx4D) => set({ idx4D }),

  setTitleDescription: (titleDescription) => set({ titleDescription }),
}));

type PlotState ={
  plotType: string;
  pointSize: number;
  scalePoints: boolean;
  scaleIntensity: number;
  timeScale: number;
  valueRange: number[];
  xRange: number[];
  yRange: number[];
  zRange: number[];
  quality: number;
  selectTS: boolean;
  showPoints: boolean;
  linePointSize: number;
  lineWidth: number;
  lineColor: string;
  pointColor: string;
  useLineColor: boolean;
  lineResolution: number;
  animate: boolean;
  resetAnim: boolean;
  animProg: number;
  cOffset: number;
  cScale: number;
  useFragOpt: boolean;
  resetCamera: boolean;
  useCustomColor: boolean;
  useCustomPointColor: boolean;
  transparency: number;
  nanTransparency: number;
  nanColor: string;
  showBorders:boolean;
  borderColor: string;
  lonExtent: [number, number];
  latExtent: [number, number];
  originalExtent: THREE.Vector4;
  lonResolution: number;
  latResolution: number;
  colorIdx: number;
  maxTextureSize: number;
  max3DTextureSize: number;
  vTransferRange: boolean;
  vTransferScale: number;


  setQuality: (quality: number) => void;
  setTimeScale: (timeScale : number) =>void;
  setValueRange: (valueRange: number[]) => void;
  setXRange: (xRange: number[]) => void;
  setYRange: (yRange: number[]) => void;
  setZRange: (zRange: number[]) => void;
  setPointSize: (pointSize: number) => void;
  setScalePoints: (scalePoints: boolean) => void;
  setScaleIntensity: (scaleIntensity: number) => void;
  setPlotType: (plotType: string) => void;
  setSelectTS: (selectTS: boolean) => void;
  setShowPoints: (showPoints: boolean) => void;
  setLinePointSize: (linePointSize: number) => void;
  setLineWidth: (lineWidth: number) => void;
  setLineColor: (lineColor: string) => void;
  setPointColor: (pointColor: string) => void;
  setUseLineColor: (lineColor: boolean) => void;
  setLineResolution: (lineResolution: number) => void;
  setAnimate: (animate: boolean) => void;
  setResetAnim: (resetAnim: boolean) => void;
  setAnimProg: (animProg: number) => void; 
  setCOffset: (cOffset: number) => void;
  setCScale: (cScale: number) => void;
  setUseFragOpt: (useFragOpt: boolean) => void;
  setResetCamera: (resetCamera: boolean) => void;
  setUseCustomColor: (useCustomColor: boolean) => void;
  setUseCustomPointColor: (useCustomPointColor: boolean) => void;
  setTransparency: (transparency: number) => void;
  setNanTransparency: (nanTraparency: number) => void;
  setNanColor: (nanColor: string) => void;
  setShowBorders: (showBorders: boolean) => void;
  setBorderColor: (borderColor: string) => void;
  setLonExtent: (lonExtent: [number, number]) => void;
  setLatExtent: (latExtent: [number, number]) => void;
  setOriginalExtent: (originalExtent: THREE.Vector4) => void;
  setLonResolution: (lonResolution: number) => void;
  setLatResolution: (latResolution: number) => void;
  incrementColorIdx: () => void;
  getColorIdx: () => number;
  setMaxTextureSize: (maxTextureSize: number) => void;
  setMax3DTextureSize: (max3DTextureSize: number) => void;
  setVTransferRange: (vTransferRange: boolean) => void;
  setVTransferScale: (vTransferScale: number) => void;
}

export const usePlotStore = create<PlotState>((set, get) => ({
  plotType: "volume", 
  pointSize: 5,
  scalePoints: false,
  scaleIntensity: 1,
  quality: 200,
  timeScale: 1,
  valueRange: [0, 1],
  xRange: [-1, 1],
  yRange: [-1, 1],
  zRange: [-1, 1],
  selectTS: false,
  showPoints: false,
  linePointSize: 2,
  lineWidth: 1.25,
  lineColor: "#111111",
  pointColor: "#EA8686",
  useLineColor: false,
  lineResolution: 3,
  animate: false,
  resetAnim: false,
  animProg: 0,
  cOffset: 0,
  cScale: 1,
  useFragOpt: false,
  resetCamera: false,
  useCustomColor: false,
  useCustomPointColor: false,
  transparency: 0,
  nanTransparency: 1,
  nanColor: "#000000",
  showBorders: false,
  borderColor: "#000000",
  lonExtent: [-180, 180],
  latExtent: [-90, 90],
  originalExtent: new THREE.Vector4(-180, 180, -90, 90),
  lonResolution: 1,
  latResolution: 1,
  colorIdx: 0,
  maxTextureSize: 2048,
  max3DTextureSize: 2048,
  vTransferRange: false,
  vTransferScale: 1,

  setVTransferRange: (vTransferRange) => set({ vTransferRange }),
  setVTransferScale: (vTransferScale) => set({ vTransferScale }),
  setQuality: (quality) => set({ quality }),
  setTimeScale: (timeScale) => set({ timeScale }),
  setValueRange: (valueRange) => set({ valueRange }),
  setXRange: (xRange) => set({ xRange }),
  setYRange: (yRange) => set({ yRange }),
  setZRange: (zRange) => set({ zRange }),
  setPointSize: (pointSize) => set({ pointSize }),
  setScalePoints: (scalePoints) => set({ scalePoints }),
  setScaleIntensity: (scaleIntensity) => set({ scaleIntensity }),
  setPlotType: (plotType) => set({ plotType }),
  setSelectTS: (selectTS) => set({ selectTS }),
  setShowPoints: (showPoints) => set({ showPoints }),
  setLinePointSize: (linePointSize) => set({ linePointSize }),
  setLineWidth: (lineWidth) => set({ lineWidth }),
  setLineColor: (lineColor) => set({ lineColor }),
  setPointColor: (pointColor) => set({ pointColor }),
  setUseLineColor: (useLineColor) => set({ useLineColor }),
  setLineResolution: (lineResolution) => set({ lineResolution }),
  setAnimate: (animate) => set({ animate }),
  setResetAnim: (resetAnim) => set({ resetAnim }),
  setAnimProg: (animProg) => set({ animProg }),
  setCOffset: (cOffset) => set({ cOffset }),
  setCScale: (cScale) => set({ cScale }),
  setUseFragOpt: (useFragOpt) => set({ useFragOpt }),
  setResetCamera: (resetCamera) => set({ resetCamera }),
  setUseCustomColor: (useCustomColor) => set({ useCustomColor }),
  setUseCustomPointColor: (useCustomPointColor) => set({ useCustomPointColor}),
  setTransparency: (transparency) => set({ transparency}),
  setNanTransparency: (nanTransparency) => set({ nanTransparency }),
  setNanColor: (nanColor) => set({ nanColor }),
  setShowBorders: (showBorders) => set({ showBorders }),
  setBorderColor: (borderColor) => set({ borderColor }),
  setLonExtent: (lonExtent) => set({ lonExtent }),
  setLatExtent: (latExtent) => set({ latExtent }),
  setOriginalExtent: (originalExtent) => set({ originalExtent }),
  setLonResolution: (lonResolution) => set({ lonResolution }),
  setLatResolution: (latResolution) => set({ latResolution }),
  incrementColorIdx: () => set(state => ({ 
    colorIdx: (state.colorIdx + 1) % 10 
  })),
  getColorIdx: () => get().colorIdx,
  setMaxTextureSize: (maxTextureSize) => set({ maxTextureSize }),
  setMax3DTextureSize: (max3DTextureSize) => set({ max3DTextureSize }),
}))


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
}));

type ZarrState = {
  slice: [number  , number | null],
  compress: boolean,
  currentStore: any;
  reFetch: boolean;
  currentChunks: number[];
  arraySize: number,

  setSlice: (slice: [number , number | null]) => void;
  setCompress: (compress: boolean) => void;
  setCurrentStore: (currentStore: any) => void;
  setReFetch: (reFetch: boolean) => void;
  setCurrentChunks: (currentChunks: number[]) => void;
  setArraySize: (arraySize: number) => void;
}

export const useZarrStore = create<ZarrState>((set, get) => ({
  slice: [0, null],
  compress: false,
  currentStore: GetStore(ESDC),
  reFetch: false,
  currentChunks: [],
  arraySize: 0,

  setSlice: (slice) => set({ slice }),
  setCompress: (compress) => set({ compress }),
  setCurrentStore: (currentStore) => set({ currentStore }),
  setReFetch: (reFetch) => set({ reFetch }),
  setCurrentChunks: (currentChunks) => set({ currentChunks }),
  setArraySize: (arraySize) => set({ arraySize })
}))

type CacheState = {
  cache: MemoryLRU<string, any>;
  maxSize: number;
  clearCache: () => void;
  setMaxSize: (maxSize: number) => void;
}


export const useCacheStore = create<CacheState>((set, get) => ({
  cache: new MemoryLRU({ maxSize: 200 * 1024 * 1024 }), // 200 MB
  maxSize: 200 * 1024 * 1024,
  // Cache operations
  clearCache: () => {
    const { cache } = get()
    cache.clear()
  },
  setMaxSize: (maxSize) => {
    const { cache } = get()
    cache.resize(maxSize)
    set({ maxSize })
  }
}))


type ErrorState = {
  error : string | null;

  setError: (error: string | null) => void;
}

export const useErrorStore = create<ErrorState>((set) =>({
  error: null,
  setError: (error) => set({ error })
}))


type ImageExportState = {
  exportImg: boolean;
  enableExport: boolean;
  includeBackground: boolean;
  includeColorbar: boolean;
  includeAxis: boolean;
  doubleSize: boolean;
  cbarLoc: string;
  cbarNum: number;
  useCustomRes: boolean;
  customRes: [number, number];
  hideAxisControls: boolean;
  hideAxis: boolean;

  ExportImg: () => void;
  EnableExport: () => void;
  setIncludeBackground: (includeBackground: boolean) => void;
  setIncludeColorbar: (includeColorbar: boolean) => void;
  setIncludeAxis: (includeAxis: boolean) => void;
  getIncludeAxis: () => boolean;
  setDoubleSize: (doubleSize: boolean) => void;
  setCbarLoc: (cbarLoc: string) => void;
  getCbarLoc: () => string;
  setCbarNum: (cbarNum: number) => void;
  getCbarNum: () => number;
  setUseCustomRes: (useCustomRes: boolean) => void;
  setCustomRes: (customRes: [number, number]) => void;
  getCustomRes: () => [number, number];
  setHideAxisControls: (hideAxisControls: boolean) => void;
  getHideAxisControls: () => boolean;
  setHideAxis: (hideAxis: boolean) => void;
}

export const useImageExportStore = create<ImageExportState>((set, get) => ({
  exportImg: false,
  enableExport: false,
  includeBackground: false,
  includeColorbar: true,
  doubleSize: false,
  cbarLoc: "bottom",
  cbarNum: 5,
  useCustomRes: false,
  customRes: [1920, 1080],
  includeAxis: true,
  hideAxisControls: false,
  hideAxis: false,

  ExportImg: () => set({ exportImg: !get().exportImg }),
  EnableExport: () => set({ enableExport: true }),
  setIncludeBackground: (includeBackground) => set({ includeBackground }),
  setIncludeColorbar: (includeColorbar) => set({ includeColorbar }),
  setDoubleSize: (doubleSize) => set({ doubleSize }),
  setCbarLoc: (cbarLoc) => set({ cbarLoc }),
  getCbarLoc: () => get().cbarLoc,
  setCbarNum: (cbarNum) => set({ cbarNum }),
  getCbarNum: () => get().cbarNum,
  setUseCustomRes: (useCustomRes) => set({ useCustomRes }),
  setCustomRes: (customRes) => set({ customRes }),
  getCustomRes: () => get().customRes,
  setIncludeAxis: (includeAxis) => set({ includeAxis }),
  getIncludeAxis: () => get().includeAxis,
  setHideAxisControls: (hideAxisControls) => set({ hideAxisControls }),
  getHideAxisControls: () => get().hideAxisControls,
  setHideAxis: (hideAxis) => set({ hideAxis }),

}));