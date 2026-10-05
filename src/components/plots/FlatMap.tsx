"use client";

import React, {useMemo, useEffect, useState, useRef} from 'react'
import * as THREE from 'three/webgpu'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { vertShader } from '@/components/textures/shaders'
import { useShallow } from 'zustand/shallow'
import { ThreeEvent } from '@react-three/fiber';
import { GetCurrentArray, GetTimeSeries, parseUVCoords } from '@/utils/HelperFuncs';
import { sampleCRS } from '../textures/ProjectionUtils';
import { evaluateColorMap } from '@/components/textures';
import { flatFrag } from '../textures/shaders';
import { SquareMeshes } from './TransectMeshes';
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { useAxisIndices, useDimAxis } from '@/hooks';
import { updateCommonUniforms, useCommonUniforms } from '@/hooks/useCommonUniforms';
import { functionInjector } from '../ui/Elements/ColorAdjuster';
import {InfoViewer} from '../ui/Elements/InfoViewer';
import { createFlatMapMaterial } from '../textures/TSL/flatMap';
import { uniformUpdater } from '@/hooks/useCommonUniforms';
const FlatMap = ({textures: propTextures} : {textures : THREE.DataTexture[] | THREE.Data3DTexture[]}) => {
    // ---- Imports ---- //
    const textures = usePaddedTextures(propTextures);
    const {flipY, dimNames, dimUnits, isFlat, variable2,
      dataShape, strides, remapTexture, remapBorders, shape, 
      bivariate, setPlotDim,updateDimCoords, updateTimeSeries} = useGlobalStore(useShallow(s => ({
        flipY:s.flipY, dimNames:s.dimNames, dimUnits:s.dimUnits, 
        isFlat:s.isFlat, dataShape:s.dataShape, strides:s.strides, bivariate: s.bivariate,
        remapTexture:s.remapTexture, remapBorders:s.remapBorders, shape:s.shape, variable2: s.variable2,
        setPlotDim:s.setPlotDim, updateDimCoords:s.updateDimCoords, updateTimeSeries:s.updateTimeSeries
      })))
    const {animProg, selectTS, colorScale,
      getColorIdx, incrementColorIdx} = usePlotStore(useShallow(s => ({
        animProg:s.animProg, selectTS:s.selectTS, colorScale:s.colorScale,
        getColorIdx:s.getColorIdx, incrementColorIdx:s.incrementColorIdx
      })))
    const {analysisDim:axis, analysisMode, analysisArray} = useAnalysisStore(useShallow(s => s))
    // --- DIMENSIONS --- //
    const {xIdx, yIdx, zIdx} = useAxisIndices()
    const arrays = useDimAxis();
    const {xArray, yArray, zArray} = useMemo(()=>{
      if (analysisMode && axis){
        return{
          xArray: axis == 1 ? arrays.xArray : arrays.yArray,
          yArray: arrays.zArray,
          zArray: arrays.zArray
        }
      }
      return arrays
    },[arrays, analysisMode, axis])
    const dimSlices = [zArray, yArray, xArray]
    const shapeRatio = useMemo(()=> {
      if (dataShape.length == 2){
        return shape.y/shape.x
      } else if (analysisMode && axis){
        const thisShape = dataShape.filter((_val, idx) => idx != axis)
        return thisShape[0]/thisShape[1]
      } else {
        return shape.y/shape.x
      }
    }, [axis, shape, dataShape, analysisMode] )
    // --- Geometry --- //
    const geometry = useMemo(()=>new THREE.PlaneGeometry(2,2*shapeRatio),[shapeRatio])
    const rotateMap = analysisMode && axis == 2;
    useEffect(()=>{
        geometry.dispose()
    },[geometry])
    
    // ----- Info Viewer----- //
    const [loc, setLoc] = useState<[number, number]>([0,0]);
    const [showInfo, setShowInfo] = useState(false);
    const vals = useRef<number[]>([0]);
    const coords = useRef<number[]>([0,0]);
    const dimInfo = useMemo(()=>{
      if (analysisMode && axis){
        return{
          names: axis == 1 
            ? [dimNames[xIdx], dimNames[zIdx]]
            : [dimNames[zIdx] , dimNames[yIdx]],
          units: axis == 1 
            ? [dimUnits[xIdx], dimUnits[zIdx]]
            : [dimUnits[zIdx] , dimUnits[yIdx]],
        }
      }
      return {
        names: [dimNames[xIdx], dimNames[yIdx]],
        units: [dimUnits[xIdx], dimUnits[yIdx]]
      }
    },[analysisMode, axis, dimNames, dimUnits, xIdx, yIdx, zIdx])

    const sampleArrays = useMemo(()=> analysisMode 
        ? [analysisArray] 
        : 
        bivariate
            ? [GetCurrentArray(), GetCurrentArray(undefined, variable2)]
            : [GetCurrentArray()],
    [analysisMode, analysisArray, textures, bivariate, variable2])

    const handleMove = (e: ThreeEvent<PointerEvent>) => {
      if (e.uv) {
        let {uv} = e;
        if (!uv) return;
        setLoc([e.clientX, e.clientY]);
        if (remapTexture){
          const [thisUV, isValid] = sampleCRS(remapTexture, uv.x, uv.y)
          uv = thisUV;
          if (!isValid){
            vals.current = [NaN];
            coords.current = [thisUV.y,thisUV.x]
            return;
          }
        }
        const { x, y } = uv;
        const xSize = xArray.length;
        const ySize = yArray.length;
        const xId = Math.floor(x * xSize);
        const yId = Math.floor(y * ySize);
        let dataIdx = xSize * yId + xId;
        const zOffset = isFlat ? 0 : Math.floor((zArray.length-1) * animProg)
        dataIdx += (analysisMode ? 1 : zOffset) * xSize*ySize
        const dataVal = sampleArrays.map(val => val ? val[dataIdx] : 0);
        vals.current = dataVal;
        coords.current = (analysisMode && axis == 2) ? [yArray[yId], xArray[xId]] : [xArray[xId],yArray[yId]]
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

      const tempTS = GetTimeSeries({data:analysisMode ? analysisArray : GetCurrentArray(), shape:dataShape, stride:strides},{uv:newUV ?? uv,normal})
      setPlotDim(0) //I think this 2 is only if there are 3-dims. Need to rework the logic
      
      const coordUV = parseUVCoords({normal:normal,uv:tsUV})
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
    uniformUpdater();
    // const shaderMaterial = useMemo(()=> new THREE.MeshBasicNodeMaterial({color: "red"})
    // ,[isFlat, textures, remapTexture, colorScale])
    const shaderMaterial = createFlatMapMaterial();
    useEffect(()=>{
      // This is duplicated. Probably shoud just move it to Plot.tsx
      useGlobalStore.setState({timeSeries:{}, dimCoords:{}})
    },[remapTexture])
  return (
    <>
    <SquareMeshes />
    <InfoViewer loc={loc} vals={vals.current} show={showInfo} 
      dimfo={{
        locs:coords.current,
        ...dimInfo
      }}
    />
    <mesh 
      material={shaderMaterial} 
      geometry={geometry} 
      scale={[((analysisMode && axis == 2) && flipY) ? -1:  1, flipY ? -1 : ((analysisMode && axis == 2) ? -1 : 1) , 1]}
      rotation={[0,0,rotateMap ? Math.PI/2 : 0]}
      onPointerEnter={()=>{setShowInfo(true) }}
      onPointerLeave={()=>{setShowInfo(false) }}
      onPointerMove={handleMove}
      onClick={selectTS && HandleTimeSeries}
    />
    </>
  )
}

export {FlatMap}
