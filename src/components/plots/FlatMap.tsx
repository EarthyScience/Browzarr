"use client";

import React, {useMemo, useEffect, useRef, useState} from 'react'
import * as THREE from 'three'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { vertShader } from '@/components/computation/shaders'
import { useShallow } from 'zustand/shallow'
import { ThreeEvent } from '@react-three/fiber';
import { coarsenFlatArray, GetCurrentArray, GetCurrentArrayWorkers, GetTimeSeries, parseUVCoords, deg2rad } from '@/utils/HelperFuncs';
import { evaluate_cmap } from 'js-colormaps-es';
import { useCoordBounds } from '@/hooks/useCoordBounds';
import { GetFrag } from '../textures';

interface InfoSettersProps{
  setLoc: React.Dispatch<React.SetStateAction<number[]>>;
  setShowInfo: React.Dispatch<React.SetStateAction<boolean>>;
  val: React.RefObject<number>;
  coords: React.RefObject<number[]>;
}

const FlatMap = ({textures, infoSetters} : {textures : THREE.DataTexture[] | THREE.Data3DTexture[], infoSetters : InfoSettersProps}) => {
    const {setLoc, setShowInfo, val, coords} = infoSetters;
    const {flipY, colormap, dimArrays, dimNames, dimUnits, 
      isFlat, dataShape, textureArrayDepths, strides,
      setPlotDim,updateDimCoords, updateTimeSeries} = useGlobalStore(useShallow(state => ({
      flipY: state.flipY, colormap: state.colormap, 
      dimArrays: state.dimArrays, strides: state.strides, 
      dimNames:state.dimNames, dimUnits: state.dimUnits,
      isFlat: state.isFlat, dataShape: state.dataShape,
      textureArrayDepths: state.textureArrayDepths,
      setPlotDim:state.setPlotDim, 
      updateDimCoords:state.updateDimCoords,
      updateTimeSeries: state.updateTimeSeries
    })))

    const {cScale, cOffset, animProg, nanTransparency, nanColor, 
      zSlice, ySlice, xSlice, selectTS, fillValue, coarsen, maskTexture, maskValue, valueRange,
      getColorIdx, incrementColorIdx} = usePlotStore(useShallow(state => ({
      cOffset: state.cOffset, cScale: state.cScale,
      resetAnim: state.resetAnim, animate: state.animate,
      animProg: state.animProg, nanTransparency: state.nanTransparency,
      nanColor: state.nanColor, zSlice: state.zSlice,
      ySlice: state.ySlice, xSlice: state.xSlice, valueRange:state.valueRange,
      selectTS: state.selectTS, coarsen: state.coarsen,
      maskTexture:state.maskTexture, maskValue:state.maskValue, fillValue: state.fillValue,
      getColorIdx: state.getColorIdx,
      incrementColorIdx: state.incrementColorIdx
    })))
    const {axis, analysisMode, analysisArray} = useAnalysisStore(useShallow(state=> ({
      axis: state.axis,
      analysisMode: state.analysisMode,
      analysisArray: state.analysisArray
    })))
    const {kernelSize, kernelDepth} = useZarrStore(useShallow(state => ({
      kernelSize: state.kernelSize,
      kernelDepth: state.kernelDepth
    })))

    const shapeLength = dimArrays.length

    const dimSlices = useMemo (() => {
      let slices = dimArrays.length === 2
        ? [
          dimArrays[0].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
          dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
        ]
        : [
          dimArrays[shapeLength - 3].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
          dimArrays[shapeLength - 2].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
          dimArrays[shapeLength - 1].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined )
        ]
      if (coarsen) slices = slices.map((val, idx) => coarsenFlatArray(val, (idx === 0 ? kernelDepth : kernelSize)))
      return slices
    } ,[dimArrays, zSlice, ySlice, xSlice, coarsen])

    const shapeRatio = useMemo(()=> {
      if (dataShape.length == 2){
        return dataShape[0]/dataShape[1]
      } else if (analysisMode){
        const thisShape = dataShape.filter((_val, idx) => idx != axis)
        return thisShape[0]/thisShape[1]
      } else {
        return dataShape[1]/dataShape[2]
      }
    }, [axis, analysisMode] )
    const geometry = useMemo(()=>new THREE.PlaneGeometry(2,2*shapeRatio),[shapeRatio])
    const infoRef = useRef<boolean>(false)
    const lastUV = useRef<THREE.Vector2>(new THREE.Vector2(0,0))
    const rotateMap = analysisMode && axis == 2;
    // const sampleArray = useMemo(()=> analysisMode ? analysisArray : GetCurrentArray(),[analysisMode, analysisArray, textures])
    const analysisDims = useMemo(()=>dimArrays.length > 2 ? dimSlices.filter((_e,idx)=> idx != axis) : dimSlices,[dimSlices,axis])
    const [sampleArray, setSampleArray] = useState<any | undefined>(undefined) // Moved this to a state as async functions cannot be used in useMemo
    useEffect(()=>{
      if (analysisMode){
        setSampleArray(analysisArray)
        return
      } 
      else {
        GetCurrentArrayWorkers().then(e=> setSampleArray(e))
        return
      }      
    },[analysisMode, analysisArray, textures])

    const {lonBounds, latBounds} = useCoordBounds()

    useEffect(()=>{
        geometry.dispose()
    },[geometry])

    // ----- MOUSE MOVE ----- //
    const eventRef = useRef<ThreeEvent<PointerEvent> | null>(null);
    const handleMove = (e: ThreeEvent<PointerEvent>) => {
      if (infoRef.current && e.uv) {
        eventRef.current = e;
        setLoc([e.clientX, e.clientY]);
        lastUV.current = e.uv;
        const { x, y } = e.uv;
        const xSize = isFlat ? (analysisMode ? analysisDims[1].length : dimSlices[1].length) : dimSlices[2].length;
        const ySize = isFlat ? (analysisMode ? analysisDims[0].length : dimSlices[0].length) : dimSlices[1].length;

        const xIdx = Math.round(x*xSize-.5)
        const yIdx = Math.round(y*ySize-.5)
        let dataIdx = xSize * yIdx + xIdx;
        dataIdx += isFlat ? 0 : Math.floor((dimSlices[0].length-1) * animProg) * xSize*ySize
        const dataVal = sampleArray ? sampleArray[dataIdx] : 0;
        val.current = dataVal;
        coords.current = isFlat ? analysisMode ? [analysisDims[0][yIdx], analysisDims[1][xIdx]] : [dimSlices[0][yIdx], dimSlices[1][xIdx]] : [dimSlices[1][yIdx], dimSlices[2][xIdx]]
      }
    }


    // ----- TIMESERIES ----- //
    async function HandleTimeSeries(event: THREE.Intersection){
      const uv = event.uv;
      const normal = new THREE.Vector3(0,0,1)
      if(uv){
        const tsUV = flipY ? new THREE.Vector2(uv.x, 1-uv.y) : uv
        const tempTS = GetTimeSeries({data:analysisMode ? analysisArray : await GetCurrentArrayWorkers(), shape:dataShape, stride:strides},{uv:tsUV,normal})
        setPlotDim(0) //I think this 2 is only if there are 3-dims. Need to rework the logic
          
        const coordUV = parseUVCoords({normal:normal,uv:uv})
        let dimCoords = coordUV.map((val,idx)=>val ? dimSlices[idx][Math.round(val*dimSlices[idx].length)] : null)
        const thisDimNames = dimNames.filter((_,idx)=> dimCoords[idx] !== null)
        const thisDimUnits = dimUnits.filter((_,idx)=> dimCoords[idx] !== null)
        dimCoords = dimCoords.filter(val => val !== null)
        const tsID = `${dimCoords[0]}_${dimCoords[1]}`
        const tsObj = {
          color:evaluate_cmap(getColorIdx()/10,"Paired"),
          data:tempTS
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
    }
    // ----- SHADER MATERIAL ----- //
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms:{
              cScale: {value: cScale},
              cOffset: {value: cOffset},
              map : {value: Array.from({ length: 14 }, (_, idx) => textures?.[idx])},
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
            },
            vertexShader: vertShader,
            fragmentShader: GetFrag("flatFrag", isFlat),
            side: THREE.DoubleSide,
        }),[isFlat, textures])
    
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
        uniforms.fillValue.value = fillValue?? NaN
      }
    },[cScale, cOffset, colormap, animProg, nanColor, nanTransparency, latBounds, lonBounds, fillValue, maskValue, valueRange])

  return (
    <>
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
