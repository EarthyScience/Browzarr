import { create } from "zustand";
import { GetStore } from "@/components/zarr/ZarrLoaderLRU";

const ESDC = 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr'

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
  fetchNC: boolean,
  ncModule: any,
  coarsen: boolean,
  kernelSize: number,
  kernelDepth: number,

  setZSlice: (zSlice: [number , number | null]) => void;
  setYSlice: (ySlice: [number , number | null]) => void;
  setXSlice: (xSlice: [number , number | null]) => void;
  setCompress: (compress: boolean) => void;
  setCurrentStore: (currentStore: any) => void;
  setReFetch: (reFetch: boolean) => void;
  ReFetch: () => void;
  setCurrentChunks: (currentChunks: {x:number[], y:number[], z:number[]}) => void;
  setArraySize: (arraySize: number) => void;
  setUseNC: (useNC: boolean) => void;
  setFetchNC: (fetchNC: boolean) => void;
  setCoarsen: (coarsen: boolean) => void;
  setKernelSize: (kernelSize: number) => void;
  setKernelDepth: (kernelDepth: number) => void;
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
  useNC: false,
  fetchNC: false,
  ncModule: null,
  coarsen: false,
  kernelSize: 2,
  kernelDepth: 2,

  setZSlice: (zSlice) => set({ zSlice }),
  setYSlice: (ySlice) => set({ ySlice }),
  setXSlice: (xSlice) => set({ xSlice }),
  setCompress: (compress) => set({ compress }),
  setCurrentStore: (currentStore) => set({ currentStore }),
  setReFetch: (reFetch) => set({ reFetch }),
  ReFetch: () => set({ reFetch: !get().reFetch }),
  setCurrentChunks: (currentChunks) => set({ currentChunks }),
  setArraySize: (arraySize) => set({ arraySize }),
  setUseNC: (useNC) => set({ useNC }),
  setFetchNC: (fetchNC) => set({ fetchNC }),
  setCoarsen: (coarsen) => set({ coarsen }),
  setKernelSize: (kernelSize) => set({ kernelSize }),
  setKernelDepth: (kernelDepth) => set({ kernelDepth }),
}))