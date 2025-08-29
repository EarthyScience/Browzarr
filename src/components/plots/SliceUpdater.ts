import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { ArrayToTexture } from '@/components/textures';
import { ZarrDataset } from '@/components/zarr/ZarrLoaderLRU';
import { useGlobalStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';

interface UseSliceUpdaterProps {
  ZarrDS: ZarrDataset;
  onTextureUpdate: (texture: THREE.DataTexture | THREE.Data3DTexture) => void;
  onDataUpdate?: (data: Float32Array | Uint8Array) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export const useSliceUpdater = ({ 
  ZarrDS, 
  onTextureUpdate, 
  onDataUpdate,
  onLoadingChange 
}: UseSliceUpdaterProps) => {
  const isUpdating = useRef(false);
  
  const { variable, setValueScales, setDataArray } = useGlobalStore(
    useShallow(state => ({
      variable: state.variable,
      setValueScales: state.setValueScales,
      setDataArray: state.setDataArray
    }))
  );

  const updateSlice = useCallback(async (newSlice: [number, number | null]) => {
    if (isUpdating.current || variable === "Default") {
      return false; // Return false if update couldn't start
    }
    
    isUpdating.current = true;
    onLoadingChange?.(true);
    
    try {
      const result = await ZarrDS.GetArray(variable, newSlice);
      
      const [texture, scaling] = ArrayToTexture({
        data: result.data,
        shape: result.shape
      });

      if (texture instanceof THREE.DataTexture || texture instanceof THREE.Data3DTexture) {
        onTextureUpdate(texture);
      }

      if (scaling && 'maxVal' in scaling && 'minVal' in scaling) {
        setValueScales(scaling as { maxVal: number; minVal: number });
      }

      setDataArray(result.data);
      onDataUpdate?.(result.data);
      
      return true; // Success
      
    } catch (error) {
      console.error('Failed to update slice:', error);
      return false; // Failure
    } finally {
      isUpdating.current = false;
      onLoadingChange?.(false);
    }
  }, [ZarrDS, variable, onTextureUpdate, onDataUpdate, setValueScales, setDataArray, onLoadingChange]);

  return {
    updateSlice,
    isUpdating: () => isUpdating.current
  };
};