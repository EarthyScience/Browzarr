import { UVCube } from '@/components/plots';
import * as vu from '@/components/textures/TSL/utils/volumeUniforms';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { uniformUpdater } from '@/hooks/useCommonUniforms';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createDDAMaterial, createRayMarchingMaterial } from '../textures/TSL';
import { buildTransferLUT } from '../textures/TSL/utils/volumeHelpers';
import { ColumnMeshes } from './TransectMeshes';
import { cmap } from '../textures/TSL/utils/commonUniforms';
import { sampleColormap } from '../textures/colormap';
export const DataCube = ( ) => {
    const {shape, flipY, remapTexture, dataShape} = useGlobalStore(useShallow(s => s)) //We have to useShallow when returning an object instead of a state. I don't fully know the logic yet
    const {xRange, yRange, zRange, quality, useOrtho, valueRange, useRayMarch, transparency, 
		vTransferScale, revTransparency} = usePlotStore(useShallow(s => s))
  	const shaderMaterial = useMemo(() => useRayMarch ? createRayMarchingMaterial(useOrtho) : createDDAMaterial(useOrtho), [useRayMarch, remapTexture, useOrtho]);
  	const geometry = useMemo(() => new THREE.BoxGeometry(shape.x, shape.y, shape.z), [shape]);
  	const aspectRatio = shape.y/shape.x
	const timeRatio = shape.z/shape.x;
	const cmapFunc = (val: number) => sampleColormap(val, cmap.value as THREE.DataTexture)

	// --- UPDATE VOLUME UNIFORMS ---//
	useEffect(()=>{
		vu.scale.value = shape;
		vu.flatBounds.value = new THREE.Vector4(-xRange[1],-xRange[0],zRange[0] * timeRatio, zRange[1] * timeRatio);
		vu.vertBounds.value = flipY 
					? new THREE.Vector2(yRange[0]*aspectRatio,yRange[1]*aspectRatio)
					: new THREE.Vector2(yRange[0]*aspectRatio,yRange[1]*aspectRatio);
		vu.dataShape.value = remapTexture 
			? new THREE.Vector3(remapTexture.image.width, remapTexture.image.height, dataShape[0])
			: new THREE.Vector3(dataShape[2], dataShape[1], dataShape[0])
		vu.steps.value = quality;
	},[shape, xRange, yRange, zRange, dataShape, quality, flipY, remapTexture])
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
		vu.tfLUT.value = newLUT;
	},[valueRange, revTransparency, transparency, vTransferScale, cmap.value])
	uniformUpdater();
	return (
		<group >
		<ColumnMeshes />
		<UVCube />  
		<mesh scale={[1,flipY ? -1 : 1,1]} geometry={geometry} material={shaderMaterial} />
		</group>
	)
}