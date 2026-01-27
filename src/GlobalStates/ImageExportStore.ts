import { create } from "zustand";
import * as THREE from "three";

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
  orbitDeg: number;
  orbitDir: boolean;
  pingpong: boolean;
  useTime: boolean;
  timeRate: number;
  loopTime: boolean;
  keyFrameEditor: boolean;
  keyFrames: Map<number, any> | undefined;
  previewKeyFrames: boolean; // This previews the keyframes in the main view
  preview: boolean; // This exports the animation as a preview/low quality
  cameraRef: React.RefObject<THREE.Camera | null> | null
  currentFrame: number;
  previewExtent: boolean;

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
  setOrbitDeg: (orbitDeg: number) => void;
  flipOrbitDir: () => void;
  setPingpong: (pingpong: boolean) => void;
  setUseTime: (useTime: boolean) => void;
  setTimeRate: (timeRate: number) => void;
  setLoopTime: (loopTime: boolean) => void;
  setKeyFrameEditor: (keyFrameEditor: boolean) => void;
  addKeyFrame: (frame:number, keyFrame: Record<number, any>) => void;
  removeKeyFrame: (frame:number) => void;
  setPreview: (preview : boolean) => void;
  PreviewKeyFrames: () => void;
  setCameraRef: (ref: React.RefObject<THREE.Camera | null>) => void
  setCurrentFrame: (currentFrame: number) => void;
  setPreviewExtent: (previewExtent: boolean) => void;
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
  orbitDeg: 360,
  orbitDir: false,
  pingpong: false,
  useTime: false,
  timeRate: 12,
  loopTime: false,
  keyFrameEditor: false,
  keyFrames: undefined,
  previewKeyFrames: false,
  preview: true,
  currentFrame: 1,
  cameraRef: null,
  previewExtent: false,
  
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
  setOrbitDeg: (orbitDeg) => set({ orbitDeg }),
  flipOrbitDir: () => set({ orbitDir: !get().orbitDir }),
  setPingpong: (pingpong) => set({ pingpong }),
  setUseTime: (useTime) => set({ useTime }),
  setTimeRate: (timeRate) => set({ timeRate }),
  setLoopTime: (loopTime) => set({ loopTime }),
  setKeyFrameEditor: (keyFrameEditor) => set({ keyFrameEditor }),
  addKeyFrame: (frame: number, value: Record<string, any>) => {
    const currentKeyFrames = get().keyFrames || new Map();
    const newKeyFrames = new Map(currentKeyFrames);
    newKeyFrames.set(frame, value);
    set({ keyFrames: newKeyFrames });
  },
  removeKeyFrame: (frame: number) => {
    const currentKeyFrames = get().keyFrames || new Map();
    const newKeyFrames = new Map(currentKeyFrames);
    newKeyFrames.delete(frame);
    set({ keyFrames: newKeyFrames });
  },
  setPreview: (preview) => set({ preview }), // Setter for export preview
  PreviewKeyFrames: () => set({ previewKeyFrames: !get().previewKeyFrames }), // Changes state to preview keyframes in main view
  setCurrentFrame: (currentFrame) => set({ currentFrame}),
  setPreviewExtent: (previewExtent) => set({ previewExtent })
}));