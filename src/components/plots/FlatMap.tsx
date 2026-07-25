"use client";

import React, {useMemo, useEffect, useRef} from 'react'
import { invalidate } from '@react-three/fiber';
import * as THREE from 'three'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { vertShader } from '@/components/computation/shaders'
import { useShallow } from 'zustand/shallow'
import { ThreeEvent } from '@react-three/fiber';
import { coarsenFlatArray, GetCurrentArray, GetTimeSeries, parseUVCoords, deg2rad, getLogEps, parseColorToVec4 } from '@/utils/HelperFuncs';
import { sampleCRS } from '../textures/ProjectionTexture';
import { evaluateColorMap, colorScaleToId, exprToGLSL } from '@/components/textures';
import { flatFrag } from '../textures/shaders';
import { SquareMeshes } from './TransectMeshes';
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { useAxisIndices } from '@/hooks';
import { createCommonUniforms, updateCommonUniforms, useCommonPlotState } from '@/utils/plotUniforms';
import { DisplayDim } from './AnalysisInfo';

interface InfoSettersProps{
  setLoc: React.Dispatch<React.SetStateAction<number[]>>;
  setShowInfo: React.Dispatch<React.SetStateAction<boolean>>;
  val: React.RefObject<number>;
  coords: React.RefObject<number[]>;
  displayDims: React.RefObject<DisplayDim[]>;
}

const FlatMap = ({textures: propTextures, infoSetters} : {textures : THREE.DataTexture[] | THREE.Data3DTexture[], infoSetters : InfoSettersProps}) => {
    const textures = usePaddedTextures(propTextures);
    const {setLoc, setShowInfo, val, coords, displayDims} = infoSetters;
    const commonState = useCommonPlotState();
    const { colormap, isFlat, valueScales, flipY, dataShape, textureArrayDepths, remapTexture, shape,
            animProg, cOffset, cScale, nanColor, nanTransparency, fillValue, valueRange, maskTexture, maskValue,
            colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip, latBounds, lonBounds } = commonState;

    const { dimArrays, dimNames, dimUnits, strides, setPlotDim, updateDimCoords, updateTimeSeries } = useGlobalStore(useShallow(state => ({
      dimArrays: state.dimArrays, strides: state.strides, 
      dimNames: state.dimNames, dimUnits: state.dimUnits,
      setPlotDim: state.setPlotDim, 
      updateDimCoords: state.updateDimCoords,
      updateTimeSeries: state.updateTimeSeries
    })))

    const { zSlice, ySlice, xSlice, selectTS, coarsen,
      getColorIdx, incrementColorIdx } = usePlotStore(useShallow(state => ({
      resetAnim: state.resetAnim, animate: state.animate,
      zSlice: state.zSlice, ySlice: state.ySlice, xSlice: state.xSlice,
      selectTS: state.selectTS, coarsen: state.coarsen,
      getColorIdx: state.getColorIdx,
      incrementColorIdx: state.incrementColorIdx,
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
          ];
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
        eventRef.current = e;
        if (remapTexture){
          const [thisUV, isValid] = sampleCRS(remapTexture, uv.x, flipY ? 1-uv.y: uv.y) // Weird double flippiing of UVs with flipY. Has something to do with how projected data is done. 
          if (flipY) thisUV.y = 1-thisUV.y
          if (isValid) uv = thisUV;
          else{
            val.current = NaN;
            coords.current = [thisUV.y,thisUV.x]
            setLoc([e.clientX, e.clientY]);
            return;
          }
        }
      
        const { x, y } = uv;
        const zSliceIdx = dimSlices.length > 2 ? 2 : 1;
        const ySliceIdx = dimSlices.length > 2 ? 1 : 0;
        const xSize = isFlat ? (analysisMode ? analysisDims[1].length : dimSlices[1].length) : dimSlices[zSliceIdx].length;
        const ySize = isFlat ? (analysisMode ? analysisDims[0].length : dimSlices[0].length) : dimSlices[ySliceIdx].length;

        const xId = Math.round(x*xSize-.5);
        const yId = Math.round(y*ySize-.5);
        const zLen = (!isFlat && dimSlices.length > 2) ? (dimSlices[0]?.length ?? 1) : 1;
        const zStep = (!isFlat && zLen > 1) ? Math.min(zLen - 1, Math.round(animProg * (zLen - 1))) : 0;
        const dataIdx = zStep * xSize * ySize + yId * xSize + xId;
        const currentData = analysisMode ? analysisArray : GetCurrentArray();
        const dataVal = (currentData && dataIdx >= 0 && dataIdx < currentData.length) ? currentData[dataIdx] : 0;
        // Write refs BEFORE setLoc so the re-render triggered by setLoc always
        // reads up-to-date values (R3F can flush renders synchronously inside
        // pointer events in React 18 Concurrent Mode).
        val.current = dataVal;
        coords.current = [y, x];

        // Build the two display dimension arrays exactly as this frame uses them,
        // so AnalysisInfo doesn't have to re-derive them independently.
        const activeDimSlices = analysisMode ? analysisDims : dimSlices;
        const rowArr = isFlat ? activeDimSlices[0] : activeDimSlices[ySliceIdx];
        const colArr = isFlat ? activeDimSlices[1] : activeDimSlices[zSliceIdx];

        let rowName: string, colName: string, rowUnits: string | undefined, colUnits: string | undefined;
        if (analysisMode) {
          const axisOrder = [
            { name: dimNames[zIdx], units: dimUnits[zIdx] },
            { name: dimNames[yIdx], units: dimUnits[yIdx] },
            { name: dimNames[xIdx], units: dimUnits[xIdx] },
          ].filter((_, i) => i !== axis);
          rowName = axisOrder[0]?.name ?? '';
          rowUnits = axisOrder[0]?.units ?? undefined;
          colName = axisOrder[1]?.name ?? '';
          colUnits = axisOrder[1]?.units ?? undefined;
        } else if (isFlat) {
          rowName = dimNames[yIdx] ?? '';
          rowUnits = dimUnits[yIdx] ?? undefined;
          colName = dimNames[xIdx] ?? '';
          colUnits = dimUnits[xIdx] ?? undefined;
        } else {
          // 3D non-flat: dimSlices = [z, y, x]; row=y (idx 1), col=x (idx 2)
          rowName = dimNames[yIdx] ?? '';
          rowUnits = dimUnits[yIdx] ?? undefined;
          colName = dimNames[xIdx] ?? '';
          colUnits = dimUnits[xIdx] ?? undefined;
        }

        const extraDimsList: DisplayDim[] = [];

        // 1. Include the active Z dimension and its current value if non-flat / 3D
        if (!isFlat && dimSlices.length > 2) {
          const zArr = dimSlices[0];
          const zVal = zArr && zArr.length > 0 ? zArr[Math.min(zStep, zArr.length - 1)] : undefined;
          const zName = dimNames[zIdx] ?? 'Z';
          const zUnits = dimUnits[zIdx];
          if (zVal !== undefined) {
            extraDimsList.push({ name: zName, val: zVal, units: zUnits });
          }
        }

        // 2. Include collapsed dimensions from ndSlices
        const { ndSlices } = useZarrStore.getState();
        if (ndSlices && ndSlices.length > 0) {
          ndSlices.forEach((slice, dimIdx) => {
            if (typeof slice === 'number') {
              const name = dimNames[dimIdx];
              if (name && name !== rowName && name !== colName && !extraDimsList.some(d => d.name === name)) {
                const val = dimArrays[dimIdx]?.[slice];
                const units = dimUnits[dimIdx];
                if (val !== undefined) {
                  extraDimsList.push({ name, val, units });
                }
              }
            }
          });
        } else if (isFlat && zIdx >= 0 && dimNames[zIdx]) {
          const name = dimNames[zIdx];
          if (name !== rowName && name !== colName && !extraDimsList.some(d => d.name === name)) {
            const zSliceStart = zSlice ? zSlice[0] : 0;
            const val = dimArrays[zIdx]?.[zSliceStart];
            const units = dimUnits[zIdx];
            if (val !== undefined) {
              extraDimsList.push({ name, val, units });
            }
          }
        }

        displayDims.current = [
          { arr: rowArr, name: rowName, units: rowUnits as string | undefined },
          { arr: colArr, name: colName, units: colUnits as string | undefined },
          ...extraDimsList,
        ];
        setLoc([e.clientX, e.clientY]);
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
          const [thisUV, isValid] = sampleCRS(remapTexture, uv.x, flipY ? 1-uv.y: uv.y) 
          if (flipY) thisUV.y = 1-thisUV.y
          if (isValid) newUV = thisUV;
          else{
            return;
          }
        }
      
      const tempTS = GetTimeSeries({data:analysisMode ? analysisArray : GetCurrentArray(), shape:dataShape, stride:strides},{uv:newUV ?? tsUV,normal})
      setPlotDim(0) 
        
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
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms:{
              ...createCommonUniforms(commonState),
              map : {value: textures},
              remapTexture: { value: remapTexture},
              textureDepths: {value:  new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
            },
            defines:{
              ...(isFlat ? { IS_FLAT: true } : {}),
              ...(remapTexture ? { REPROJECT: true } : {}),
              'CUSTOM_EXPR(val)': colorScaleToId(colorScale) === 6 ? exprToGLSL(colorScale) : '(val)',
            },
            vertexShader: vertShader,
            fragmentShader: flatFrag,
            side: THREE.DoubleSide,
        }),[isFlat, remapTexture, textures, commonState])
    
    useEffect(()=>{
      if(shaderMaterial){
        updateCommonUniforms(shaderMaterial, commonState);
        // Re-assign textures uniform on fetch state updates so shader binds latest 2D data textures
        shaderMaterial.uniforms.map.value = textures;
        invalidate();
      }
    },[cScale, cOffset, colormap, animProg, nanColor, nanTransparency, latBounds, lonBounds, fillValue, maskValue, valueRange, colorScale, logConstant, valueScales, lowclip, highclip, useLowclip, useHighclip])
    useEffect(()=>{
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
