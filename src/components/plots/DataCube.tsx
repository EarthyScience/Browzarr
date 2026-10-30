import { useGlobalStore } from '@/stores/GlobalStore';
import { usePlotStore } from '@/stores/PlotStore';
import { UVCube } from '@/components/plots';
import { uniformUpdater } from '@/gpu/tsl/utils/uniformUpdater';
import * as u from '@/gpu/tsl/utils/uniforms';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createVolumeMaterial } from '@/gpu/tsl';
import { cmap } from '@/gpu/tsl/utils/uniforms';
import { buildTransferLUT } from '@/gpu/tsl/utils/volumeHelpers';
import { sampleColormap } from '@/gpu/textures/colormap';
import { ColumnMeshes } from './TransectMeshes';
export const DataCube = ( ) => {
    const {shape, flipY, remapTexture} = useGlobalStore(useShallow(s => ({
		shape:s.shape, flipY:s.flipY, remapTexture:s.remapTexture
	}))) //We have to useShallow when returning an object instead of a state. I don't fully know the logic yet
    const { useOrtho, valueRange, useRayMarch, volumeMode, transparency, 
		vTransferScale, revTransparency, interpPixels, colorScale} = usePlotStore(useShallow(s => ({
			useOrtho:s.useOrtho, valueRange:s.valueRange, useRayMarch:s.useRayMarch, volumeMode:s.volumeMode,
			transparency:s.transparency, vTransferScale:s.vTransferScale, revTransparency:s.revTransparency, interpPixels:s.interpPixels, colorScale: s.colorScale
		})))
  	const shaderMaterial = useMemo(() => createVolumeMaterial(useRayMarch ? 'raymarch' : 'dda', volumeMode, useOrtho)
	, [useRayMarch, volumeMode, remapTexture, useOrtho, interpPixels, colorScale]);
  	const geometry = useMemo(() => new THREE.BoxGeometry(shape.x, shape.y, shape.z), [shape]);
	const cmapFunc = (val: number) => sampleColormap(val, cmap.value as THREE.DataTexture)
	// --- GENERATE LUT --- //
	useEffect(()=>{
		const newLUT = buildTransferLUT({ 
			cmap:cmapFunc,
			threshold:valueRange as [number, number], 
			revTransparency, 
			transparency, 
			opacityMag:vTransferScale, 
			useClipScale:false
		})
		u.tfLUT.value = newLUT;
	},[valueRange, revTransparency, transparency, vTransferScale, cmap.value])
	uniformUpdater();
	// --- CLEANUP --- //
    useEffect(()=>()=>{ shaderMaterial.dispose() },[shaderMaterial])
    useEffect(()=>()=>{ geometry.dispose() },[geometry])
	return (
		<group >
		<ColumnMeshes />
		<UVCube />  
		<mesh scale={[1,flipY ? -1 : 1,1]} geometry={geometry} material={shaderMaterial} />
		</group>
	)
}