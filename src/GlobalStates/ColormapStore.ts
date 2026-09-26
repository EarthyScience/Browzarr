import { create } from 'zustand'
import * as THREE from 'three';
import { GetColorMapTexture } from "@/components/textures";

type StoreState = {
    colormapName: string;
    colormap: THREE.DataTexture;
    flipColormap: boolean;
    bottomLeft: string;
    topLeft: string;
    bottomRight: string;
    resolution: number;
    mixMode: number;
    bivariateSelection: number; // This is which variable to send to colormap when bivariate and wanna see just one value

    setColormap: (colormap: THREE.DataTexture) => void;
    setColormapName: (colormapName: string) => void;
    setFlipColormap: (flipColormap: boolean) => void;
    setBottomLeft: (color: string) => void;
    setTopLeft: (color: string) => void;
    setBottomRight: (color: string) => void;
    setResolution: (resolution: number) => void;
    setMixMode: (mixMode: number) => void;
    setBivariateSelection: (selection: number) => void;
}

export const useColormapStore = create<StoreState>((set, get) => ({
    colormapName: "Spectral",
    colormap: GetColorMapTexture(),
    flipColormap: false,
    bottomLeft: "#ffffff",
    topLeft: "#2a9d8f",
    bottomRight: "#e63946",
    resolution: 10,
    mixMode: 2,
    bivariateSelection: 0,

    setColormap: (colormap) => set({ colormap }),
    setColormapName: (colormapName) => {
        const prev = get().colormap;
        const palette = (colormapName === 'Default') ? 'Spectral' : colormapName;
        const tex = GetColorMapTexture(prev, palette, 1, '#000000', 0, get().flipColormap);
        set({ colormapName, colormap: tex });
    },
    setFlipColormap: (flipColormap) => {
        const palette = (get().colormapName === 'Default') ? 'Spectral' : get().colormapName;
        const prev = get().colormap;
        const tex = GetColorMapTexture(prev, palette, 1, '#000000', 0, flipColormap);
        set({ flipColormap, colormap: tex });
    },
    setBottomLeft: (bottomLeft) => set({ bottomLeft }),
    setTopLeft: (topLeft) => set({ topLeft }),
    setBottomRight: (bottomRight) => set({ bottomRight }),
    setResolution: (resolution) => set({ resolution }),
    setMixMode: (mixMode) => set({ mixMode }),
    setBivariateSelection: (bivariateSelection) => set({ bivariateSelection }),
}))