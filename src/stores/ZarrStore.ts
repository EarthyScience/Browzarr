import { create } from "zustand";
import { FetchStoreOptions, IcechunkStoreOptions } from "@/types/Interfaces";

type ZarrState = {
  zSlice: [number  , number | null],
  ySlice: [number  , number | null],
  xSlice: [number  , number | null],
  compress: boolean,
  currentStore: any;
  reFetch: boolean;
  currentChunks: {x:number[], y:number[], z:number[]};
  arraySize: number,
  useNC: boolean, // This one is more static and so toggling switch doesn't break all other logic
  ncModule: any,
  coarsen: boolean,
  kernelSize: number,
  kernelDepth: number,
  icechunkOptions: IcechunkStoreOptions | null;
  fetchOptions: FetchStoreOptions | null;
  ndSlices: [number, number][];
  axisMapping: { x: number, y: number, z: number };
  useGT: boolean;
  gtSource: Blob | string | undefined; //Geotiff file reference

  setZSlice: (zSlice: [number , number | null]) => void;
  setYSlice: (ySlice: [number , number | null]) => void;
  setXSlice: (xSlice: [number , number | null]) => void;
  setCompress: (compress: boolean) => void;
  setCurrentStore: (currentStore: any) => void;
  ReFetch: () => void;
  setCurrentChunks: (currentChunks: {x:number[], y:number[], z:number[]}) => void;
  setArraySize: (arraySize: number) => void;
  setUseNC: (useNC: boolean) => void;
  setCoarsen: (coarsen: boolean) => void;
  setKernelSize: (kernelSize: number) => void;
  setKernelDepth: (kernelDepth: number) => void;
}

export const useZarrStore = create<ZarrState>((set, get) => ({
  zSlice: [0, null],
  ySlice: [0, null],
  xSlice: [0, null],
  ndSlices: [],
  axisMapping: { x: -1, y: -1, z: -1 },
  compress: false,
  currentStore: Promise.resolve(undefined),
  reFetch: false,
  currentChunks: {x:[], y:[], z:[]},
  arraySize: 0,
  useNC: false,
  ncModule: null,
  coarsen: false,
  kernelSize: 2,
  kernelDepth: 2,
  icechunkOptions: null,
  fetchOptions: null,
  useGT: false,
  gtSource: undefined,

  setZSlice: (zSlice) => set({ zSlice }),
  setYSlice: (ySlice) => set({ ySlice }),
  setXSlice: (xSlice) => set({ xSlice }),
  setCompress: (compress) => set({ compress }),
  setCurrentStore: (currentStore) => set({ currentStore }),
  ReFetch: () => set({ reFetch: !get().reFetch }),
  setCurrentChunks: (currentChunks) => set({ currentChunks }),
  setArraySize: (arraySize) => set({ arraySize }),
  setUseNC: (useNC) => set({ useNC }),
  setCoarsen: (coarsen) => set({ coarsen }),
  setKernelSize: (kernelSize) => set({ kernelSize }),
  setKernelDepth: (kernelDepth) => set({ kernelDepth }),
}))