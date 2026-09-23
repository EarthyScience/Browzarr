// useCommonUniforms.ts
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useColormapStore } from '@/GlobalStates/ColormapStore'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useShallow } from 'zustand/shallow'
import { useCoordBounds } from './useCoordBounds'
import { invalidate } from '@react-three/fiber'

export function useCommonUniforms() {
	const {cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskTexture, maskValue, valueRange, 
		useBorderTexture, borderColor, borderWidth, borderTexture, is360Deg, showBorders} = usePlotStore(useShallow(s=>({
			cScale: s.cScale, cOffset: s.cOffset, animProg: s.animProg, nanTransparency: s.nanTransparency, nanColor: s.nanColor,
			fillValue: s.fillValue, maskTexture: s.maskTexture, maskValue: s.maskValue, valueRange: s.valueRange,
			useBorderTexture: s.useBorderTexture, borderColor: s.borderColor, borderWidth: s.borderWidth, borderTexture: s.borderTexture,
			is360Deg: s.is360Deg, showBorders: s.showBorders
		})))
	const { textureArrayDepths, remapBorders, remapTexture, valueScales, useF16Textures, bivariate} = useGlobalStore(useShallow(s => ({
		textureArrayDepths: s.textureArrayDepths, remapBorders: s.remapBorders, remapTexture: s.remapTexture,
		valueScales: s.valueScales, useF16Textures: s.useF16Textures, bivariate: s.bivariate
	})))
	const {lonBounds, latBounds} = useCoordBounds()
    const {colormap, bottomLeft, bottomRight, topLeft, resolution, mixMode, bivariateSelection} = useColormapStore(useShallow(s => ({
		colormap: s.colormap, bottomLeft: s.bottomLeft, bottomRight: s.bottomRight, 
		topLeft: s.topLeft, resolution: s.resolution, mixMode: s.mixMode, bivariateSelection: s.bivariateSelection
	})))
	const uniforms = useMemo(() => ({
		cScale: {value: cScale},
		cOffset: {value: cOffset},
		maskTexture: {value: maskTexture},
		maskValue: {value: maskValue},
		useBorderTexture: {value: useBorderTexture && showBorders},
		borderTexture: {value: borderTexture},
		borderWidth: {value: borderWidth},
		borderColor: {value: new THREE.Color(borderColor).convertLinearToSRGB()},
		remapBorders : {value: Boolean(remapBorders) && !Boolean(remapTexture)},
		is360: {value: is360Deg},
		useF16: {value: useF16Textures},
		threshold: {value: new THREE.Vector2(valueRange[0],valueRange[1])},
		latBounds: {value: new THREE.Vector2(latBounds[0], latBounds[1])},
		lonBounds: {value: new THREE.Vector2(lonBounds[0], lonBounds[1])},
		textureDepths: {value:  new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
		cmap : { value : colormap},
		animateProg: {value: animProg},
		nanColor: {value : new THREE.Color(nanColor).convertLinearToSRGB()},
		nanAlpha: {value: 1 - nanTransparency},
		fillValue: {value: fillValue?? NaN},
		valueRange: {value: new THREE.Vector2(valueScales.minVal, valueScales.maxVal)},
		bottomLeft: {value: new THREE.Color(bottomLeft).convertLinearToSRGB()},
		bottomRight: {value: new THREE.Color(bottomRight).convertLinearToSRGB()},
		topLeft: {value: new THREE.Color(topLeft).convertLinearToSRGB()},
		resolution: {value: resolution},
		bivariate: {value: bivariate},
		mixMode: {value: mixMode},
		bivariateSelection: {value: bivariateSelection}
	}), [
		cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskTexture, maskValue, valueRange,
		textureArrayDepths, colormap, lonBounds, latBounds, useBorderTexture, borderTexture, borderWidth, 
		borderColor, remapBorders, remapTexture, is360Deg, showBorders, valueScales, useF16Textures,
		bottomLeft, bottomRight, topLeft, resolution, bivariate, mixMode, bivariateSelection
	])
	return uniforms
}

export function updateCommonUniforms(material: THREE.ShaderMaterial){
	const {cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskTexture, maskValue, valueRange, 
		useBorderTexture, borderColor, borderWidth, is360Deg, showBorders} = usePlotStore(useShallow(s=>({
			cScale: s.cScale, cOffset: s.cOffset, animProg: s.animProg, nanTransparency: s.nanTransparency, nanColor: s.nanColor,
			fillValue: s.fillValue, maskTexture: s.maskTexture, maskValue: s.maskValue, valueRange: s.valueRange,
			useBorderTexture: s.useBorderTexture, borderColor: s.borderColor, borderWidth: s.borderWidth,
			is360Deg: s.is360Deg, showBorders: s.showBorders
		})))
	const { valueScales, useF16Textures} = useGlobalStore(useShallow(s => ({
		valueScales: s.valueScales, useF16Textures: s.useF16Textures, 
	})))
	const {lonBounds, latBounds} = useCoordBounds()
    const {colormap, bottomLeft, bottomRight, topLeft, resolution, mixMode, bivariateSelection} = useColormapStore(useShallow(s => ({
		colormap: s.colormap, bottomLeft: s.bottomLeft, bottomRight: s.bottomRight, 
		topLeft: s.topLeft, resolution: s.resolution, mixMode: s.mixMode, bivariateSelection: s.bivariateSelection
	})))
	useEffect(()=>{
		// Cleanup function to dispose materials when they are remade in parent component
		if (material){
			material.dispose()
		}
	},[material])

	useEffect(()=>{
		if (!material) return;
		const uniforms = material.uniforms;
		uniforms.cOffset.value = cOffset;
		uniforms.cmap. value = colormap;
		uniforms.animateProg.value = animProg;
		uniforms.nanColor.value = new THREE.Color(nanColor).convertLinearToSRGB();
		uniforms.nanAlpha.value = 1 - nanTransparency;
		uniforms.cScale.value = cScale;
		uniforms.threshold.value.set(valueRange[0], valueRange[1]);
		uniforms.latBounds.value = new THREE.Vector2(latBounds[0], latBounds[1]);
		uniforms.lonBounds.value = new THREE.Vector2(lonBounds[0], lonBounds[1]);
		uniforms.maskValue.value = maskValue;
		uniforms.fillValue.value = fillValue?? NaN;
		uniforms.useBorderTexture.value = useBorderTexture && showBorders;
		uniforms.borderColor.value = new THREE.Color(borderColor).convertLinearToSRGB();
		uniforms.borderWidth.value = borderWidth;
		uniforms.is360.value = is360Deg;
		uniforms.valueRange.value = new THREE.Vector2(valueScales.minVal, valueScales.maxVal);
		uniforms.useF16.value = useF16Textures;
		uniforms.bottomLeft.value = new THREE.Color(bottomLeft).convertLinearToSRGB();
		uniforms.bottomRight.value = new THREE.Color(bottomRight).convertLinearToSRGB();
		uniforms.topLeft.value = new THREE.Color(topLeft).convertLinearToSRGB();
		uniforms.resolution.value = resolution;
		uniforms.mixMode.value = mixMode;
		uniforms.bivariateSelection.value = bivariateSelection;
		invalidate();
	},[
		cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskTexture, maskValue, valueRange,
		colormap, lonBounds, latBounds, useBorderTexture, borderColor, borderWidth, is360Deg, showBorders,
		valueScales, useF16Textures, bottomLeft, bottomRight, topLeft, resolution, mixMode, bivariateSelection
	])
	
	return;
}