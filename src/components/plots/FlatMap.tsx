"use client";

import React, {useMemo, useEffect, useRef} from 'react'
import * as THREE from 'three'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { vertShader } from '@/components/computation/shaders'
import { useShallow } from 'zustand/shallow'
import { ThreeEvent } from '@react-three/fiber';
import { coarsenFlatArray, GetCurrentArray, GetTimeSeries, parseUVCoords, deg2rad, getLogEps } from '@/utils/HelperFuncs';
import { sampleCRS } from '../textures/ProjectionTexture';
import { evaluateColorMap, colorScaleToId } from '@/components/textures';
import { useCoordBounds } from '@/hooks/useCoordBounds';
import { flatFrag } from '../textures/shaders';
import { SquareMeshes } from './TransectMeshes';
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { useAxisIndices } from '@/hooks';

function parseColorToVec4(hex: string, alpha = 1.0): THREE.Vector4 {
  if (!hex) return new THREE.Vector4(0, 0, 0, alpha);
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  if (isNaN(bigint)) return new THREE.Vector4(0, 0, 0, alpha);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return new THREE.Vector4(r, g, b, alpha);
}

interface InfoSettersProps{
  setLoc: React.Dispatch<React.SetStateAction<number[]>>;
  setShowInfo: React.Dispatch<React.SetStateAction<boolean>>;
  val: React.RefObject<number>;
  coords: React.RefObject<number[]>;
}

const FlatMap = ({textures: propTextures, infoSetters} : {textures : THREE.DataTexture[] | THREE.Data3DTexture[], infoSetters : InfoSettersProps}) => {
    const textures = usePaddedTextures(propTextures);
    const {setLoc, setShowInfo, val, coords} = infoSetters;
    const {flipY, colormap, dimArrays, dimNames, dimUnits, 
      isFlat, dataShape, textureArrayDepths, strides, remapTexture, shape, valueScales,
      setPlotDim,updateDimCoords, updateTimeSeries} = useGlobalStore(useShallow(state => ({
      flipY: state.flipY, colormap: state.colormap, 
      dimArrays: state.dimArrays, strides: state.strides, 
      dimNames:state.dimNames, dimUnits: state.dimUnits,
      isFlat: state.isFlat, dataShape: state.dataShape,
      textureArrayDepths: state.textureArrayDepths,
      remapTexture:state.remapTexture, shape: state.shape,
      valueScales: state.valueScales,
      setPlotDim:state.setPlotDim, 
      updateDimCoords:state.updateDimCoords,
      updateTimeSeries: state.updateTimeSeries
    })))

    const {cScale, cOffset, animProg, nanTransparency, nanColor, 
      zSlice, ySlice, xSlice, selectTS, fillValue, coarsen, maskTexture, maskValue, valueRange,
      getColorIdx, incrementColorIdx, colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip} = usePlotStore(useShallow(state => ({
      cOffset: state.cOffset, cScale: state.cScale,
      resetAnim: state.resetAnim, animate: state.animate,
      animProg: state.animProg, nanTransparency: state.nanTransparency,
      nanColor: state.nanColor, zSlice: state.zSlice,
      ySlice: state.ySlice, xSlice: state.xSlice, valueRange:state.valueRange,
      selectTS: state.selectTS, coarsen: state.coarsen,
      maskTexture:state.maskTexture, maskValue:state.maskValue, fillValue: state.fillValue,
      getColorIdx: state.getColorIdx,
      incrementColorIdx: state.incrementColorIdx,
      colorScale: state.colorScale,
      logConstant: state.logConstant,
      lowclip: state.lowclip,
      highclip: state.highclip,
      useLowclip: state.useLowclip,
      useHighclip: state.useHighclip,
    })))
    const {axis, analysisMode, analysisArray} = useAnalysisStore(useShallow(state=> ({
      axis: state.axis,
      analysisMode: state.analysisMode,
      analysisArray: state.analysisArray
    })))
    const {kernelSize, kernelDepth} = useZarrStore(useShallow(state => ({
      kernelSize: state.kernelSize,
      kernelDepth: state.kernelDepth,
    })))

    const {xIdx, yIdx, zIdx} = useAxisIndices()

    const dimSlices = useMemo (() => {
      let slices = isFlat
        ? [
          dimArrays[yIdx]?.slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined) ?? [],
          dimArrays[xIdx]?.slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined) ?? [],
        ]
        : [
          dimArrays[zIdx]?.slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined) ?? [],
          dimArrays[yIdx]?.slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined) ?? [],
          dimArrays[xIdx]?.slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined ) ?? [],
        ]
      if (coarsen) slices = slices.map((val, idx) => coarsenFlatArray(val, (idx === 0 && slices.length > 2 ? kernelDepth : kernelSize)))
      return slices
    } ,[dimArrays, zSlice, ySlice, xSlice, coarsen, kernelDepth, kernelSize, xIdx, yIdx, zIdx])
    const shapeRatio = useMemo(()=> {
      if (dataShape.length == 2){
        return shape.y/shape.x
      } else if (analysisMode){
        const thisShape = dataShape.filter((_val, idx) => idx != axis)
        return thisShape[0]/thisShape[1]
      } else {
        return shape.y/shape.x
      }
    }, [axis, shape, dataShape, analysisMode] )
    
    const geometry = useMemo(()=>new THREE.PlaneGeometry(2,2*shapeRatio),[shapeRatio])
    const infoRef = useRef<boolean>(false)
    const rotateMap = analysisMode && axis == 2;
    const sampleArray = useMemo(()=> analysisMode ? analysisArray : GetCurrentArray(),[analysisMode, analysisArray, textures])
    const analysisDims = useMemo(() => {
      if (!analysisMode) return dimSlices;
      const fullSlices = [
        dimArrays[zIdx]?.slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined) ?? [],
        dimArrays[yIdx]?.slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined) ?? [],
        dimArrays[xIdx]?.slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined) ?? [],
      ];
      let slices = fullSlices.filter((_, idx) => idx !== axis);
      if (coarsen) slices = slices.map((val, idx) => coarsenFlatArray(val, (idx === 0 && slices.length > 2 ? kernelDepth : kernelSize)))
      return slices;
    }, [analysisMode, dimSlices, dimArrays, zSlice, ySlice, xSlice, axis, coarsen, kernelDepth, kernelSize, xIdx, yIdx, zIdx])

    useEffect(()=>{
      return () => {
        geometry.dispose()
      }
    },[geometry])

    // ----- MOUSE MOVE ----- //
    const eventRef = useRef<ThreeEvent<PointerEvent> | null>(null);
    const handleMove = (e: ThreeEvent<PointerEvent>) => {
      if (infoRef.current && e.uv) {
        let {uv} = e;
        if (!uv) return;
        setLoc([e.clientX, e.clientY]);
        eventRef.current = e;
        if (remapTexture){
          const [thisUV, isValid] = sampleCRS(remapTexture, uv.x, flipY ? 1-uv.y: uv.y) // Weird double flippiing of UVs with flipY. Has something to do with how projected data is done. 
          if (flipY) thisUV.y = 1-thisUV.y
          if (isValid) uv = thisUV;
          else{
            val.current = NaN;
            coords.current = [thisUV.y,thisUV.x]
            return;
          }
        }
      
        const { x, y } = uv;
        const zSliceIdx = dimSlices.length > 2 ? 2 : 1;
        const ySliceIdx = dimSlices.length > 2 ? 1 : 0;
        const xSize = isFlat ? (analysisMode ? analysisDims[1].length : dimSlices[1].length) : dimSlices[zSliceIdx].length;
        const ySize = isFlat ? (analysisMode ? analysisDims[0].length : dimSlices[0].length) : dimSlices[ySliceIdx].length;

        const xId = Math.round(x*xSize-.5)
        const yId = Math.round(y*ySize-.5)
        let dataIdx = xSize * yId + xId;
        dataIdx += isFlat ? 0 : Math.floor((dimSlices[zIdx].length-1) * animProg) * xSize*ySize
        const dataVal = sampleArray ? sampleArray[dataIdx] : 0;
        val.current = dataVal;
        coords.current = [y,x]
      }
    }

    // ----- TIMESERIES ----- //
    function HandleTimeSeries(event: THREE.Intersection){
      const uv = event.uv;
      if (!uv) return;
      const tsUV = flipY ? new THREE.Vector2(uv.x, 1-uv.y) : uv
      let newUV: THREE.Vector2 | undefined;
      const normal = new THREE.Vector3(0,0,1)
      if (remapTexture){
          const [thisUV, isValid] = sampleCRS(remapTexture, uv.x, flipY ? 1-uv.y: uv.y) // Weird double flippiing of UVs with flipY. Has something to do with how projected data is done. 
          if (flipY) thisUV.y = 1-thisUV.y
          if (isValid) newUV = thisUV;
          else{
            return;
          }
        }
      
      const tempTS = GetTimeSeries({data:analysisMode ? analysisArray : GetCurrentArray(), shape:dataShape, stride:strides},{uv:newUV ?? tsUV,normal})
      setPlotDim(0) //I think this 2 is only if there are 3-dims. Need to rework the logic
        
      const coordUV = parseUVCoords({normal:normal,uv:uv})
      let dimCoords = coordUV.map((val,idx)=>val ? dimSlices[idx][Math.round(val*dimSlices[idx].length)] : null)
      const thisDimNames = dimNames.filter((_,idx)=> dimCoords[idx] !== null)
      const thisDimUnits = dimUnits.filter((_,idx)=> dimCoords[idx] !== null)
      dimCoords = dimCoords.filter(val => val !== null)
      const tsID = `${dimCoords[0]}_${dimCoords[1]}`
      const tsObj = {
        color: evaluateColorMap(getColorIdx() / 10, 'Paired'),
        data: tempTS,
        normal,
        uv: tsUV,
      }
      incrementColorIdx();
      updateTimeSeries({ [tsID] : tsObj})
      const dimObj = {
        first:{
          name:thisDimNames[0],
          loc:dimCoords[0] ?? 0,
          units:thisDimUnits[0]
        },
        second:{
          name:thisDimNames[1],
          loc:dimCoords[1] ?? 0,
          units:thisDimUnits[1]
        },
        plot:{
          units:dimUnits[0]
        }
      }
      updateDimCoords({[tsID] : dimObj})
    }
    // ----- SHADER MATERIAL ----- //
    const {lonBounds, latBounds} = useCoordBounds()
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms:{
              cScale: {value: cScale},
              cOffset: {value: cOffset},
              map : {value: textures},
              remapTexture: { value: remapTexture},
              maskTexture: {value: maskTexture},
              maskValue: {value: maskValue},
              threshold: {value: new THREE.Vector2(valueRange[0],valueRange[1])},
              latBounds: {value: new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))},
              lonBounds: {value: new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))},
              textureDepths: {value:  new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
              cmap : { value : colormap},
              animateProg: {value:animProg},
              nanColor: {value : new THREE.Color(nanColor)},
              nanAlpha: {value: 1 - nanTransparency},
              fillValue: {value: fillValue?? NaN},
              colorScale: {value: colorScaleToId(colorScale)},
              logConstant: {value: logConstant},
              logEps: {value: getLogEps(valueScales.minVal, valueScales.maxVal, (valueScales as any).minPosVal)},
              dataRange: {value: Math.max(valueScales.maxVal - valueScales.minVal, 1.0)},
              lowclip: {value: parseColorToVec4(lowclip)},
              highclip: {value: parseColorToVec4(highclip)},
              useLowclip: {value: useLowclip},
              useHighclip: {value: useHighclip},
            },
            defines:{
              ...(isFlat ? { IS_FLAT: true } : {}),
              ...(remapTexture ? { REPROJECT: true } : {})
            },
            vertexShader: vertShader,
            fragmentShader: flatFrag,
            side: THREE.DoubleSide,
        }),[isFlat, remapTexture, textures])
    
    useEffect(()=>{
      if(shaderMaterial){
        const uniforms = shaderMaterial.uniforms
        uniforms.cOffset.value = cOffset;
        uniforms.cmap. value = colormap;
        uniforms.animateProg.value = animProg;
        uniforms.nanColor.value = new THREE.Color(nanColor);
        uniforms.nanAlpha.value = 1 - nanTransparency;
        uniforms.cScale.value = cScale;
        uniforms.threshold.value.set(valueRange[0], valueRange[1]);
        uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
        uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
        uniforms.maskValue.value = maskValue;
        uniforms.fillValue.value = fillValue?? NaN;
        uniforms.colorScale.value = colorScaleToId(colorScale);
        uniforms.logConstant.value = logConstant;
        uniforms.logEps.value = getLogEps(valueScales.minVal, valueScales.maxVal, (valueScales as any).minPosVal);
        uniforms.dataRange.value = Math.max(valueScales.maxVal - valueScales.minVal, 1.0);
        uniforms.lowclip.value = parseColorToVec4(lowclip);
        uniforms.highclip.value = parseColorToVec4(highclip);
        uniforms.useLowclip.value = useLowclip;
        uniforms.useHighclip.value = useHighclip;
      }
    },[cScale, cOffset, colormap, animProg, nanColor, nanTransparency, latBounds, lonBounds, fillValue, maskValue, valueRange, colorScale, logConstant, valueScales, lowclip, highclip, useLowclip, useHighclip])
    useEffect(()=>{
      // This is duplicated. Probably shoud just move it to Plot.tsx
      useGlobalStore.setState({timeSeries:{}, dimCoords:{}})
    },[remapTexture])
  return (
    <>
    <SquareMeshes />
    <mesh 
      material={shaderMaterial} 
      geometry={geometry} 
      scale={[((analysisMode && axis == 2) && flipY) ? -1:  1, flipY ? -1 : ((analysisMode && axis == 2) ? -1 : 1) , 1]}
      rotation={[0,0,rotateMap ? Math.PI/2 : 0]}
      onPointerEnter={()=>{setShowInfo(true); infoRef.current = true }}
      onPointerLeave={()=>{setShowInfo(false); infoRef.current = false }}
      onPointerMove={handleMove}
      onClick={selectTS && HandleTimeSeries}
    />
    </>
  )
}

export {FlatMap}
