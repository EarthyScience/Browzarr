import { create } from "zustand";

type PlotTransformState = {
  rotateZ: number;
  rotateX: number;
  mirrorVertical: boolean;
  mirrorHorizontal: boolean;  

  setRotateZ: (rotateZ: number) => void;
  setRotateX: (rotateX: number) => void;
  setMirrorVertical: (mirrorVertical: boolean) => void;
  setMirrorHorizontal: (mirrorHorizontal: boolean) => void;
}

export const usePlotTransformStore = create<PlotTransformState>((set) => ({
  rotateZ: 0,
  rotateX: 0,
  mirrorVertical: false,
  mirrorHorizontal: false,

  setRotateZ: (rotateZ) => set({ rotateZ }),
  setRotateX: (rotateX) => set({ rotateX }),
  setMirrorVertical: (mirrorVertical) => set({ mirrorVertical }),
  setMirrorHorizontal: (mirrorHorizontal) => set({ mirrorHorizontal }),
}));