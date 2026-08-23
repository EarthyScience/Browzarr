import { create } from "zustand";
import * as THREE from "three";

type TextureState ={
    textures: THREE.Data3DTexture[] | THREE.DataTexture[] | undefined;

    setTextures: (textures: THREE.Data3DTexture[] | THREE.DataTexture[] | undefined) => void;
}

export const useTextureStore = create<TextureState>((set, get) => ({
    textures : [],

    setTextures: (textures) => set({ textures })
}))