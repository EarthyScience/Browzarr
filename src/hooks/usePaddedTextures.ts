import { useMemo } from 'react';
import * as THREE from 'three';

type TextureArray = THREE.Data3DTexture[] | THREE.DataTexture[] | null | undefined;

export const usePaddedTextures = (textures: TextureArray, length: number = 12) => {
  return useMemo(() => {
    return Array.from({ length }, (_, idx) => textures?.[idx] ?? textures?.[0]);
  }, [textures, length]);
};
