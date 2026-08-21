import { create } from "zustand";
import * as THREE from "three";

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
  animate: boolean;
  resetAnim: boolean;
  animProg: number;
  cOffset: number;
  cScale: number;
  useRayMarch: boolean;
  resetCamera: boolean;
  transparency: number;
  revTransparency: boolean;
  nanTransparency: number;
  nanColor: string;
  showBorders:boolean;
  borderColor: string;
  lonExtent: [number, number];
  latExtent: [number, number];
  originalExtent: [number, number, number, number];
  lonResolution: number;
  latResolution: number;
  colorIdx: number;
  maxTextureSize: number;
  max3DTextureSize: number;
  vTransferRange: boolean;
  vTransferScale: number;
  sphereResolution: number;
  displacement: number;
  displaceFaces: boolean;
  offsetNegatives: boolean;
  zSlice: [number  , number | null],
  ySlice: [number  , number | null],
  xSlice: [number  , number | null],
  interpPixels: boolean;
  useOrtho: boolean;
  rotateFlat: boolean;
  fillValue: number | undefined,
  coarsen: boolean, //Seperate from zarr store so dependencies don't update when changing coarsen in a menu
  kernel:{kernelSize:number, kernelDepth:number}
  is360Deg:boolean,
  maskTexture: THREE.Texture | undefined;
  borderTexture: THREE.Texture | undefined;
  useBorderTexture: boolean;
  borderWidth:number;
  maskValue: number;
  cameraPosition: THREE.Vector3;
  disablePointScale: boolean;
  camera: THREE.Camera | undefined;
  nativeCRS: string | undefined;
  destCRS: string | undefined;
  overRideCamera: boolean; // Prevent Camera from resetting until initial position is set. 
  preProject: boolean;
  colorScale: string | undefined;

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
  setAnimate: (animate: boolean) => void;
  setResetAnim: (resetAnim: boolean) => void;
  setAnimProg: (animProg: number) => void; 
  setCOffset: (cOffset: number) => void;
  setCScale: (cScale: number) => void;
  setUseRayMarch: (useRayMarch: boolean) => void;
  setResetCamera: (resetCamera: boolean) => void;
  setTransparency: (transparency: number) => void;
  setRevTransparency: (revTransparency: boolean) => void;
  setNanTransparency: (nanTraparency: number) => void;
  setNanColor: (nanColor: string) => void;
  setShowBorders: (showBorders: boolean) => void;
  setBorderColor: (borderColor: string) => void;
  setLonExtent: (lonExtent: [number, number]) => void;
  setLatExtent: (latExtent: [number, number]) => void;
  setOriginalExtent: (originalExtent: [number, number, number, number]) => void;
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
  setDisplaceFaces: (displaceFaces: boolean) => void;
  setOffsetNegatives: (offsetNegatives: boolean) => void;
  setZSlice: (zSlice: [number , number | null]) => void;
  setYSlice: (ySlice: [number , number | null]) => void;
  setXSlice: (xSlice: [number , number | null]) => void;
  setInterpPixels: (interpPixels: boolean) => void;
  setUseOrtho: (useOrtho: boolean) => void;
  setFillValue: (fillValue: number | undefined) => void;
  setCameraPosition: (cameraPosition: THREE.Vector3) => void;
  setColorScale: (colorScale: string | undefined) => void;
  
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
  animate: false,
  resetAnim: false,
  animProg: 0,
  cOffset: 0,
  cScale: 1,
  useRayMarch: false,
  resetCamera: false,
  transparency: 0,
  revTransparency: false,
  nanTransparency: 1,
  nanColor: "#000000",
  showBorders: false,
  borderColor: "#000000",
  lonExtent: [-180, 180],
  latExtent: [-90, 90],
  originalExtent: [-180, 180, -90, 90],
  lonResolution: 1,
  latResolution: 1,
  colorIdx: 0,
  maxTextureSize: 2048,
  max3DTextureSize: 2048,
  vTransferRange: false,
  vTransferScale: 1,
  sphereResolution: 10,
  displacement: 0,
  displaceFaces: false,
  offsetNegatives: true,
  zSlice: [0, null], // Need these so changing the slices for zarr fetch doesn't update plot
  ySlice: [0, null],
  xSlice: [0, null],
  interpPixels: false,
  useOrtho: false,
  rotateFlat: false,
  fillValue: undefined, // This is the value for masking out. 
  coarsen: false,
  kernel:{kernelDepth:1, kernelSize:1},
  is360Deg:false,
  maskTexture:undefined,
  borderTexture: undefined,
  useBorderTexture: false,
  maskValue: 0, // This value is for which feature to mask. Not what value to mask out. 
  borderWidth: 0.05,
  cameraPosition: new THREE.Vector3(0, 0, 5),
  disablePointScale: false,
  camera: undefined,
  nativeCRS: undefined,
  destCRS: undefined,
  overRideCamera: false,
  preProject : false, // reproject data on dataloader before 'show' is true;
  colorScale: undefined,

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
  setAnimate: (animate) => set({ animate }),
  setResetAnim: (resetAnim) => set({ resetAnim }),
  setAnimProg: (animProg) => set({ animProg }),
  setCOffset: (cOffset) => set({ cOffset }),
  setCScale: (cScale) => set({ cScale }),
  setUseRayMarch: (useRayMarch) => set({ useRayMarch }),
  setResetCamera: (resetCamera) => set({ resetCamera }),
  setTransparency: (transparency) => set({ transparency}),
  setRevTransparency: (revTransparency) => set({ revTransparency }),
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
  setDisplaceFaces: (displaceFaces) => set({ displaceFaces }),
  setOffsetNegatives: (offsetNegatives) => set({ offsetNegatives  }),
  setZSlice: (zSlice) => set({ zSlice }),
  setYSlice: (ySlice) => set({ ySlice }),
  setXSlice: (xSlice) => set({ xSlice }),
  setInterpPixels: (interpPixels) => set({ interpPixels }),
  setUseOrtho: (useOrtho) => set({ useOrtho }),
  setFillValue: (fillValue) => set({ fillValue }),
  setCameraPosition: (cameraPosition) => set({ cameraPosition }),
  setColorScale: (colorScale) => set({ colorScale })
}))