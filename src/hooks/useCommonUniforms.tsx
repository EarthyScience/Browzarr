// useCommonUniforms.ts
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useShallow } from 'zustand/shallow'
import { useCoordBounds } from './useCoordBounds'
import { deg2rad } from '@/utils/HelperFuncs'

export function useCommonUniforms() {
	const {cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskTexture, maskValue, valueRange, 
		useBorderTexture, borderColor, borderWidth, borderTexture, is360Deg} = usePlotStore(useShallow(s=>s))
	const { textureArrayDepths, colormap, remapBorders, remapTexture} = useGlobalStore(useShallow(s => s))
	const {lonBounds, latBounds} = useCoordBounds()

	const uniforms = useMemo(() => ({
		cScale: {value: cScale},
		cOffset: {value: cOffset},
		maskTexture: {value: maskTexture},
		maskValue: {value: maskValue},
		useBorderTexture: {value: useBorderTexture},
		borderTexture: {value: borderTexture},
		borderWidth: {value: borderWidth},
		borderColor: {value: new THREE.Color(borderColor)},
		remapBorders : {value: Boolean(remapBorders) && !Boolean(remapTexture)},
		is360: {value: is360Deg},
		threshold: {value: new THREE.Vector2(valueRange[0],valueRange[1])},
		latBounds: {value: new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))},
		lonBounds: {value: new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))},
		textureDepths: {value:  new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
		cmap : { value : colormap},
		animateProg: {value: animProg},
		nanColor: {value : new THREE.Color(nanColor)},
		nanAlpha: {value: 1 - nanTransparency},
		fillValue: {value: fillValue?? NaN},
	}), [
		cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskTexture, maskValue, valueRange,
		textureArrayDepths, colormap, lonBounds, latBounds, useBorderTexture, borderTexture, borderWidth, 
		borderColor, remapBorders, remapTexture, is360Deg
	])
	return uniforms

}

export function updateCommonUniforms(material: THREE.ShaderMaterial){
	const {cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskTexture, maskValue, valueRange,
		useBorderTexture, borderColor, borderWidth, is360Deg} = usePlotStore(useShallow(s=>s))
	const {textureArrayDepths, colormap} = useGlobalStore(useShallow(s => s))
	const {lonBounds, latBounds} = useCoordBounds()

	useEffect(()=>{
		if (!material) return;
		const uniforms = material.uniforms;
		uniforms.cOffset.value = cOffset;
		uniforms.cmap. value = colormap;
		uniforms.animateProg.value = animProg;
		uniforms.nanColor.value = new THREE.Color(nanColor);
		uniforms.nanAlpha.value = 1 - nanTransparency;
		uniforms.cScale.value = cScale;
		uniforms.threshold.value.set(valueRange[0], valueRange[1]);
		uniforms.latBounds.value = new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]));
		uniforms.lonBounds.value = new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]));
		uniforms.maskValue.value = maskValue;
		uniforms.fillValue.value = fillValue?? NaN;
		uniforms.useBorderTexture.value = useBorderTexture;
		uniforms.borderColor.value = new THREE.Color(borderColor);
		uniforms.borderWidth.value = borderWidth;
		uniforms.is360.value = is360Deg;
	},[[
		cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskTexture, maskValue, valueRange,
		textureArrayDepths, colormap, lonBounds, latBounds, useBorderTexture, borderColor, borderWidth, is360Deg
	]])
	
	return;
}