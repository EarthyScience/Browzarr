import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { UVCube } from '@/components/plots';
import { uniformUpdater } from '@/components/textures/TSL/utils/uniformUpdater';
import * as u from '@/components/textures/TSL/utils/uniforms';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createDDAMaterial, createRayMarchingMaterial } from '../textures/TSL';
import { cmap } from '../textures/TSL/utils/uniforms';
import { buildTransferLUT } from '../textures/TSL/utils/volumeHelpers';
import { sampleColormap } from '../textures/colormap';
import { ColumnMeshes } from './TransectMeshes';
export const DataCube = ( ) => {
    const {shape, flipY, remapTexture} = useGlobalStore(useShallow(s => ({
		shape:s.shape, flipY:s.flipY, remapTexture:s.remapTexture
	}))) //We have to useShallow when returning an object instead of a state. I don't fully know the logic yet
    const { useOrtho, valueRange, useRayMarch, transparency, 
		vTransferScale, revTransparency, interpPixels, colorScale} = usePlotStore(useShallow(s => ({
			useOrtho:s.useOrtho, valueRange:s.valueRange, useRayMarch:s.useRayMarch,
			transparency:s.transparency, vTransferScale:s.vTransferScale, revTransparency:s.revTransparency, interpPixels:s.interpPixels, colorScale: s.colorScale
		})))
  	const shaderMaterial = useMemo(() => useRayMarch 
		? createRayMarchingMaterial(useOrtho) 
		: createDDAMaterial(useOrtho)
	, [useRayMarch, remapTexture, useOrtho, interpPixels, colorScale]);
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