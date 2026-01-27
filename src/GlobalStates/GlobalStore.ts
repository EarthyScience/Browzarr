import { create } from "zustand";
import * as THREE from 'three';
import { GetColorMapTexture } from "@/components/textures";

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
  scalingFactor: number | null;
  is4D: boolean;
  idx4D: number | null;
  titleDescription: { title: string | null; description: string | null };
  textureArrayDepths: number[];
  textureData: Uint8Array;
  clampExtremes: boolean; // Values to reprocess the texture by trimming extremes
  
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
  setScalingFactor: (scalingFactor: number | null) => void;
  setClampExtremes: (clampExtremes: boolean) => void
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
  scalingFactor: null,
  clampExtremes: false,

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
  setScalingFactor: (scalingFactor) => set({ scalingFactor }),
  setClampExtremes: (clampExtremes) => set({ clampExtremes }),
}));





