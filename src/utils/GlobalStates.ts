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
  status: string | null;
  progress: number;
  DPR: number,

  is4D: boolean;
  idx4D: number | null;
  titleDescription: { title: string | null; description: string | null };
  textureArrayDepths: number[];
  textureData: Uint8Array;
  
  // setters
  setDataShape: (dataShape: number[]) => void;
  setShape: (shape: THREE.Vector3) => void;
  setValueScales: (valueScales: { maxVal: number; minVal: number }) => void;
  setColormap: (colormap: THREE.DataTexture) => void;
  setTimeSeries: (timeSeries: Record<string, Record<string, any>>) => void;
  updateTimeSeries: (newEntries: Record<string, Record<string, any>>) => void;
  setStrides: (strides: number[]) => void;
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
  setStatus: (status: string | null) => void;
  setIs4D: (is4D: boolean) => void;
  setIdx4D: (idx4D: number | null) => void;
  setTitleDescription: (titleDescription: { title: string | null; description: string | null }) => void;
  setTextureArrayDepths: (textureArrayResolution: number[] ) => void;
  setTextureData: (textureData: Uint8Array ) => void;
  setDPR: (DPR: number) => void;
};

export const useGlobalStore = create<StoreState>((set, get) => ({
  dataShape: [1, 1, 1],
  shape: new THREE.Vector3(2, 2, 2),
  valueScales: { maxVal: 1, minVal: -1 },
  colormap: GetColorMapTexture(),
  timeSeries: {},
  strides: [10368,144,1],
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
  status: null,
  is4D: false,
  idx4D: null,
  titleDescription: {title:null, description: null},
  textureArrayDepths: [1,1,1], 
  textureData: new Uint8Array(1),
  DPR: 1,

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
  setStatus: (status) => set({ status }),
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
  setIs4D: (is4D) => set({ is4D }),
  setIdx4D: (idx4D) => set({ idx4D }),
  setTitleDescription: (titleDescription) => set({ titleDescription }),
  setTextureArrayDepths: (textureArrayDepths) => set({ textureArrayDepths }),
  setTextureData: (textureData) => set({ textureData }),
  setDPR: (DPR) => set({ DPR }),
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
  sphereResolution: number;
  displacement: number;
  displaceSurface: boolean;
  offsetNegatives: boolean;
  zSlice: [number  , number | null],
  ySlice: [number  , number | null],
  xSlice: [number  , number | null],
  interpPixels: boolean;
  useOrtho: boolean;
  rotateFlat: boolean;

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
  setSphereResolution: (sphereResolution: number) => void;
  setDisplacement: (displacement: number) => void;
  setDisplaceSurface: (displaceSurface: boolean) => void;
  setOffsetNegatives: (offsetNegatives: boolean) => void;
  setZSlice: (zSlice: [number , number | null]) => void;
  setYSlice: (ySlice: [number , number | null]) => void;
  setXSlice: (xSlice: [number , number | null]) => void;
  setInterpPixels: (interpPixels: boolean) => void;
  setUseOrtho: (useOrtho: boolean) => void;
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
  sphereResolution: 10,
  displacement: 0,
  displaceSurface: true,
  offsetNegatives: true,
  zSlice: [0, null], // Need these so changing the slices for zarr fetch doesn't update plot
  ySlice: [0, null],
  xSlice: [0, null],
  interpPixels: false,
  useOrtho: false,
  rotateFlat: false,

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
  setSphereResolution: (sphereResolution) => set({ sphereResolution }),
  setDisplacement: (displacement) => set({ displacement }),
  setDisplaceSurface: (displaceSurface) => set({ displaceSurface }),
  setOffsetNegatives: (offsetNegatives) => set({ offsetNegatives  }),
  setZSlice: (zSlice) => set({ zSlice }),
  setYSlice: (ySlice) => set({ ySlice }),
  setXSlice: (xSlice) => set({ xSlice }),
  setInterpPixels: (interpPixels) => set({ interpPixels }),
  setUseOrtho: (useOrtho) => set({ useOrtho })
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
  zSlice: [number  , number | null],
  ySlice: [number  , number | null],
  xSlice: [number  , number | null],
  compress: boolean,
  currentStore: any;
  reFetch: boolean;
  currentChunks: {x:number[], y:number[], z:number[]};
  arraySize: number,

  setZSlice: (zSlice: [number , number | null]) => void;
  setYSlice: (ySlice: [number , number | null]) => void;
  setXSlice: (xSlice: [number , number | null]) => void;
  setCompress: (compress: boolean) => void;
  setCurrentStore: (currentStore: any) => void;
  setReFetch: (reFetch: boolean) => void;
  ReFetch: () => void;
  setCurrentChunks: (currentChunks: {x:number[], y:number[], z:number[]}) => void;
  setArraySize: (arraySize: number) => void;
}

export const useZarrStore = create<ZarrState>((set, get) => ({
  zSlice: [0, null],
  ySlice: [0, null],
  xSlice: [0, null],
  compress: false,
  currentStore: GetStore(ESDC),
  reFetch: false,
  currentChunks: {x:[], y:[], z:[]},
  arraySize: 0,

  setZSlice: (zSlice) => set({ zSlice }),
  setYSlice: (ySlice) => set({ ySlice }),
  setXSlice: (xSlice) => set({ xSlice }),
  setCompress: (compress) => set({ compress }),
  setCurrentStore: (currentStore) => set({ currentStore }),
  setReFetch: (reFetch) => set({ reFetch }),
  ReFetch: () => set({ reFetch: !get().reFetch }),
  setCurrentChunks: (currentChunks) => set({ currentChunks }),
  setArraySize: (arraySize) => set({ arraySize })
}))

type CacheState = {
  cache: MemoryLRU<string, any>;
  maxSize: number;
  clearCache: () => void;
  setMaxSize: (maxSize: number) => void;
}

const memoryModule = new MemoryLRU({ maxSize: 200 * 1024 * 1024 }) // 200 MB // Maybe moving it outside will allow Garbe Collector to correctly remove the cached data

export const useCacheStore = create<CacheState>((set, get) => ({
  cache: memoryModule as MemoryLRU<string, any>,  // 200 MB
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
  mainTitle: string | undefined;
  cbarLabel: string | undefined;
  cbarUnits: string | undefined;
  animate: boolean;
  frames: number;
  frameRate: number;
  orbit: boolean;
  pingpong: boolean;
  useTime: boolean;
  timeRate: number;
  loopTime: boolean;
  animViz: boolean;
  keyFrames: Map<number, any> | undefined;
  previewKeyFrames: boolean; // This previews the keyframes in the main view
  preview: boolean; // This exports the animation as a preview/low quality
  cameraRef: React.RefObject<THREE.Camera | null> | null
  currentFrame: number;

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
  setMainTitle: (mainTitle: string | undefined) => void;
  setCbarLabel: (cbarLabel: string | undefined) => void;
  setCbarUnits: (cbarUnits: string | undefined) => void;
  setAnimate: (animate: boolean) => void;
  setFrames: (frames: number) => void;
  setFrameRate: (frameRate: number) => void;
  setOrbit: (orbit: boolean) => void;
  setPingpong: (pingpong: boolean) => void;
  setUseTime: (useTime: boolean) => void;
  setTimeRate: (timeRate: number) => void;
  setLoopTime: (loopTime: boolean) => void;
  setAnimViz: (animViz: boolean) => void;
  addKeyFrame: (frame:number, keyFrame: Record<number, any>) => void;
  setPreview: (preview : boolean) => void;
  PreviewKeyFrames: () => void;
  setCameraRef: (ref: React.RefObject<THREE.Camera | null>) => void
  setCurrentFrame: (currentFrame: number) => void;
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
  mainTitle: undefined,
  cbarLabel: undefined,
  cbarUnits: undefined,
  animate: false,
  frames: 60,
  frameRate: 12,
  orbit: false,
  pingpong: false,
  useTime: false,
  timeRate: 12,
  loopTime: false,
  animViz: false,
  keyFrames: undefined,
  previewKeyFrames: false,
  preview: true,
  currentFrame: 1,
  cameraRef: null,
  setCameraRef: (ref) => set({ cameraRef: ref }),

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
  setMainTitle: (mainTitle) => set({ mainTitle }),
  setCbarLabel: (cbarLabel) => set({ cbarLabel }),
  setCbarUnits: (cbarUnits) => set({ cbarUnits }),
  setAnimate: (animate) => set({ animate }),
  setFrames: (frames) => set({ frames }),
  setFrameRate: (frameRate) => set({ frameRate }),
  setOrbit: (orbit) => set({ orbit }),
  setPingpong: (pingpong) => set({ pingpong }),
  setUseTime: (useTime) => set({ useTime }),
  setTimeRate: (timeRate) => set({ timeRate }),
  setLoopTime: (loopTime) => set({ loopTime }),
  setAnimViz: (animViz) => set({ animViz }),
  addKeyFrame: (frame: number, value: Record<string, any>) => {
    const currentKeyFrames = get().keyFrames || new Map();
    const newKeyFrames = new Map(currentKeyFrames);
    newKeyFrames.set(frame, value);
    set({ keyFrames: newKeyFrames });
  },
  setPreview: (preview) => set({ preview }), // Setter for export preview
  PreviewKeyFrames: () => set({ previewKeyFrames: !get().previewKeyFrames }), // Changes state to preview keyframes in main view
  setCurrentFrame: (currentFrame) => set({ currentFrame})
}));