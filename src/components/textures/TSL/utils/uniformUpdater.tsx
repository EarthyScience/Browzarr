import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useColormapStore } from '@/GlobalStates/ColormapStore'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useShallow } from 'zustand/shallow'
import { useCoordBounds } from '@/hooks/useCoordBounds'
import * as u from '@/components/textures/TSL/utils/uniforms'
import { useValueScales } from '@/hooks'

export function uniformUpdater(){
    const {cScale, cOffset, animProg, nanTransparency, nanColor, fillValue, maskValue, valueRange, 
        useBorderTexture, borderColor, borderWidth, is360Deg, showBorders, interpPixels, colorScale,
        xRange, yRange, zRange, quality, displacement, offsetNegatives, scalePoints,
        pointSize, scaleIntensity, timeScale, plotType} = usePlotStore(useShallow(s => ({
            cScale: s.cScale, cOffset: s.cOffset, animProg: s.animProg, nanTransparency: s.nanTransparency, nanColor: s.nanColor, fillValue: s.fillValue, maskValue: s.maskValue, valueRange: s.valueRange,
            useBorderTexture: s.useBorderTexture, borderColor: s.borderColor, borderWidth: s.borderWidth, is360Deg: s.is360Deg, showBorders: s.showBorders, interpPixels: s.interpPixels, colorScale: s.colorScale,
            xRange: s.xRange, yRange: s.yRange, zRange: s.zRange, quality: s.quality, displacement: s.displacement, offsetNegatives: s.offsetNegatives, scalePoints: s.scalePoints,
            pointSize: s.pointSize, scaleIntensity: s.scaleIntensity, timeScale: s.timeScale, plotType: s.plotType
        })))
    const { useF16Textures, bivariate, textureArrayDepths, remapTexture, isWebGPU, 
        flipY, remapBorders, isFlat, shape, dataShape, mainTextures} = useGlobalStore(useShallow(s => ({
        useF16Textures: s.useF16Textures, bivariate: s.bivariate, textureArrayDepths: s.textureArrayDepths, remapTexture: s.remapTexture, isWebGPU: s.isWebGPU,
        flipY: s.flipY, remapBorders: s.remapBorders, isFlat: s.isFlat, shape: s.shape, dataShape: s.dataShape, mainTextures: s.mainTextures
        })))
    const {lonBounds, latBounds} = useCoordBounds()
    const {colormap, bottomLeft, bottomRight, topLeft, resolution, mixMode, bivariateSelection} = useColormapStore(useShallow(s => ({
        colormap: s.colormap, bottomLeft: s.bottomLeft, bottomRight: s.bottomRight, topLeft: s.topLeft, resolution: s.resolution, mixMode: s.mixMode, bivariateSelection: s.bivariateSelection
    })))
    const valueScales = useValueScales();
    // --- RENDERER ---//
    useEffect(()=>{
        u.isWebGPU.value = isWebGPU
    },[isWebGPU])
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
    // --- REPROJECTION --- //
    useEffect(()=>{
        u.remapTexture.value = remapTexture?? new THREE.DataTexture();
        u.reproject.value = Boolean(remapTexture);		
    },[remapTexture])
    useEffect(()=>{
        u.remapBorderTexture.value = remapBorders?? new THREE.DataTexture();
        u.remapBorders.value = Boolean(remapBorders)
    },[remapBorders])
    // --- BORDERS --- //
    useEffect(()=>{
        u.trim.value = plotType != 'sphere'
    },[plotType])
    // --- GENERAL --- //
    useEffect(()=>{
        u.cOffset.value = cOffset;
        u.nanAlpha.value = 1 - nanTransparency;
        u.cScale.value = cScale;
        u.threshold.value.set(valueRange[0], valueRange[1]);
        u.latBounds.value.set(latBounds[0], latBounds[1]);
        u.lonBounds.value.set(lonBounds[0], lonBounds[1]);
        u.maskValue.value = maskValue;
        u.fillValue.value = fillValue?? NaN;
        u.useBorderTexture.value = useBorderTexture && showBorders;
        u.borderWidth.value = borderWidth;
        u.is360.value = is360Deg;
        u.textureDepths.value.set(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0]);
        u.valueRange.value.set(valueScales.minVal, valueScales.maxVal);
        u.useF16.value = useF16Textures;
        u.bivariateSelection.value = bivariateSelection;
        u.bivariate.value = bivariate;
        u.isFlat.value = isFlat
        u.shape.value.set(shape.x, shape.y,shape.z)
    },[
        cScale, cOffset, nanTransparency, fillValue, maskValue, valueRange,
        lonBounds, latBounds, useBorderTexture, borderWidth, is360Deg, showBorders,
        valueScales, useF16Textures, bivariateSelection, 
        bivariate, textureArrayDepths, isFlat, shape
    ])
    // --- BLOCKS --- //
    useEffect(()=>{
        u.flipY.value = flipY;
    }, [flipY])
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
    // --- TEXTURES --- //
    const prev = useRef<THREE.Data3DTexture[] | THREE.DataTexture[] | undefined>(undefined)
    useEffect(()=>{
        if (mainTextures === prev.current) return;
        prev.current = mainTextures;
        mainTextures && u.setMapTextures(mainTextures);
    })
    // --- COLORSCALE --- //
    useEffect(()=>{
        u.rescaleValues.value = Boolean(colorScale)
    },[colorScale])

    // --- VOLUME UNIFORMS ---//
    useEffect(()=>{
        if (plotType == 'point-cloud') return;
        const aspectRatio = shape.y/shape.x
	    const timeRatio = shape.z/shape.x;
        u.volumeScale.value = shape;
        u.flatBounds.value.set(-xRange[1],-xRange[0],zRange[0] * timeRatio, zRange[1] * timeRatio);
        u.vertBounds.value.set(
            (flipY ? -yRange[1] : yRange[0]) * aspectRatio,
            (flipY ? -yRange[0] : yRange[1]) * aspectRatio,
        );
        u.dataShape.value = remapTexture 
            ? new THREE.Vector3(remapTexture.image.width, remapTexture.image.height, dataShape[0])
            : new THREE.Vector3(dataShape[2], dataShape[1], dataShape[0])
        u.steps.value = quality;
    },[shape, xRange, yRange, zRange, dataShape, quality, flipY, remapTexture])

    // --- DISPLACEMENT UNIFORMS ---//
     useEffect(()=>{
            u.displacement.value = displacement
            u.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
            u.widthFactor.value = Math.abs(lonBounds[1]-lonBounds[0])/(2.0*Math.PI)
            u.vertFactor.value =  Math.abs(latBounds[1]-latBounds[0])/(Math.PI)
    },[valueScales, displacement, offsetNegatives, lonBounds, latBounds])
    // --- POINT UNIFORMS ---//
    useEffect(()=>{
        u.pointSize.value = pointSize;
        u.scaleIntensity.value = scaleIntensity;
        u.timeScale.value = timeScale;
        u.scaleByVal.value = scalePoints
    },[pointSize, scaleIntensity, timeScale, scalePoints])
}