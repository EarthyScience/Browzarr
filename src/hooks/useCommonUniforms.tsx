// useCommonUniforms.ts
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useColormapStore } from '@/GlobalStates/ColormapStore'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useShallow } from 'zustand/shallow'
import { useCoordBounds } from './useCoordBounds'
import { invalidate } from '@react-three/fiber'
import * as u from '@/components/textures/TSL/utils/commonUniforms'

export function uniformUpdater(){
	const {cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskValue, valueRange, 
		useBorderTexture, borderColor, borderWidth, is360Deg, showBorders, interpPixels} = usePlotStore(useShallow(s=>({
			cScale: s.cScale, cOffset: s.cOffset, animProg: s.animProg, nanTransparency: s.nanTransparency, nanColor: s.nanColor,
			fillValue: s.fillValue, maskTexture: s.maskTexture, maskValue: s.maskValue, valueRange: s.valueRange,
			useBorderTexture: s.useBorderTexture, borderColor: s.borderColor, borderWidth: s.borderWidth,
			is360Deg: s.is360Deg, showBorders: s.showBorders, interpPixels: s.interpPixels
		})))
	const { valueScales, useF16Textures, bivariate, textureArrayDepths, remapTexture} = useGlobalStore(useShallow(s => ({
		valueScales: s.valueScales, useF16Textures: s.useF16Textures, bivariate: s.bivariate, 
		mainTextures: s.mainTextures, textureArrayDepths: s.textureArrayDepths, remapTexture: s.remapTexture, flipY: s.flipY,
	})))
	const {lonBounds, latBounds} = useCoordBounds()
    const {colormap, bottomLeft, bottomRight, topLeft, resolution, mixMode, bivariateSelection} = useColormapStore(useShallow(s => ({
		colormap: s.colormap, bottomLeft: s.bottomLeft, bottomRight: s.bottomRight, 
		topLeft: s.topLeft, resolution: s.resolution, mixMode: s.mixMode, bivariateSelection: s.bivariateSelection
	})))
	// --- COLORS --- //
	useEffect(() => {
		u.nanColor.value = new THREE.Color(nanColor).convertLinearToSRGB();
		u.borderColor.value = new THREE.Color(borderColor).convertLinearToSRGB();
	}, [nanColor, borderColor])
	// --- COLORMAP --- //
	useEffect(()=>{
		u.cmap.value = colormap;
		u.cmap.value.colorSpace = THREE.NoColorSpace;
		u.cmap.value.needsUpdate = true;
		u.bottomLeft.value = new THREE.Color(bottomLeft).convertLinearToSRGB();
		u.bottomRight.value = new THREE.Color(bottomRight).convertLinearToSRGB();
		u.topLeft.value = new THREE.Color(topLeft).convertLinearToSRGB();
		u.resolution.value = resolution;
		u.mixMode.value = mixMode;
	}, [colormap, bottomLeft, bottomRight, topLeft, resolution, mixMode])
	// ---ANIMATION --- //
	useEffect(()=>{
		u.animateProg.value = animProg;
	}, [animProg])
	useEffect(()=>{
		u.cOffset.value = cOffset;
		u.nanAlpha.value = 1 - nanTransparency;
		u.cScale.value = cScale;
		u.threshold.value.set(valueRange[0], valueRange[1]);
		u.latBounds.value = new THREE.Vector2(latBounds[0], latBounds[1]);
		u.lonBounds.value = new THREE.Vector2(lonBounds[0], lonBounds[1]);
		u.maskValue.value = maskValue;
		u.fillValue.value = fillValue?? NaN;
		u.useBorderTexture.value = useBorderTexture && showBorders;
		u.borderWidth.value = borderWidth;
		u.is360.value = is360Deg;
		u.textureDepths.value = new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0]);
		u.valueRange.value = new THREE.Vector2(valueScales[bivariateSelection].minVal, valueScales[bivariateSelection].maxVal);
		u.useF16.value = useF16Textures;
		u.bivariateSelection.value = bivariateSelection;
		u.bivariate.value = bivariate;
		u.remapTexture.value = remapTexture?? new THREE.DataTexture();
	},[
		cScale, cOffset, nanTransparency, fillValue, maskValue, valueRange,
		lonBounds, latBounds, useBorderTexture, borderWidth, is360Deg, showBorders,
		valueScales, useF16Textures, bivariateSelection, 
		bivariate, textureArrayDepths, remapTexture
	])
	// --- INTERP PIXELS --- //
	useEffect(()=>{
		const nodes = u.map
		const filter = interpPixels ? THREE.LinearFilter : THREE.NearestFilter
		for (let i = 0; i < nodes.length; i++){
			const tex = nodes[i].value.clone()
			nodes[i].value.dispose();
			tex.minFilter = filter;
			tex.magFilter = filter;
			tex.needsUpdate = true;
			u.map[i].value = tex;
		}
	},[interpPixels])
	let prev: any = null;
	useGlobalStore.subscribe((state) => {
		const textures = (state as any).mainTextures;
		if (textures === prev) return;
		prev = textures;
		u.setMapTextures(textures);
	});

}