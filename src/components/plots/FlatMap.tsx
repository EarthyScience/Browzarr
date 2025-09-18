"use client";

import React, {useMemo, useEffect, useRef, useCallback} from 'react'
import * as THREE from 'three'
import { useAnalysisStore, useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import { vertShader } from '@/components/computation/shaders'
import { flatFrag3D, fragmentFlat } from '../textures/shaders';
import { useShallow } from 'zustand/shallow'
import { ThreeEvent } from '@react-three/fiber';
import { GetCurrentArray } from '@/utils/HelperFuncs';

interface InfoSettersProps{
  setLoc: React.Dispatch<React.SetStateAction<number[]>>;
  setShowInfo: React.Dispatch<React.SetStateAction<boolean>>;
  val: React.RefObject<number>;
  coords: React.RefObject<number[]>;
}

function Rescale(value: number, scales: {minVal: number, maxVal: number}){
  const range = scales.maxVal-scales.minVal
  return value * range + scales.minVal
}


const FlatMap = ({texture, infoSetters} : {texture : THREE.DataTexture | THREE.Data3DTexture, infoSetters : InfoSettersProps}) => {
    const {setLoc, setShowInfo, val, coords} = infoSetters;
    const {flipY, colormap, valueScales, dimArrays, isFlat} = useGlobalStore(useShallow(state => ({
      flipY: state.flipY, 
      colormap: state.colormap, 
      valueScales: state.valueScales,
      dimArrays: state.dimArrays,
      isFlat: state.isFlat
    })))
    const {cScale, cOffset, animProg, nanTransparency, nanColor} = usePlotStore(useShallow(state => ({
      cOffset: state.cOffset,
      cScale: state.cScale,
      resetAnim: state.resetAnim,
      animate: state.animate,
      animProg: state.animProg,
      nanTransparency: state.nanTransparency,
      nanColor: state.nanColor
    })))
    const {axis, analysisMode, analysisArray} = useAnalysisStore(useShallow(state=> ({
      axis: state.axis,
      analysisMode: state.analysisMode,
      analysisArray: state.analysisArray
    })))
    
    const dataSource = texture.source.data
    const shapeRatio = useMemo(()=> dataSource.height/dataSource.width, [dataSource])
    const geometry = useMemo(()=>new THREE.PlaneGeometry(2,2*shapeRatio),[shapeRatio])
    const infoRef = useRef<boolean>(false)
    const lastUV = useRef<THREE.Vector2>(new THREE.Vector2(0,0))
    const rotateMap = analysisMode && axis == 2;
    const sampleArray = useMemo(()=> analysisMode ? analysisArray : GetCurrentArray(),[analysisMode, analysisArray])
    const analysisDims = useMemo(()=>dimArrays.length > 2 ? dimArrays.filter((_e,idx)=> idx != axis) : dimArrays,[dimArrays,axis])
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms:{
              cScale: {value: cScale},
              cOffset: {value: cOffset},
              data : {value: texture},
              cmap : { value : colormap},
              animateProg: {value:animProg},
              nanColor: {value : new THREE.Color(nanColor)},
              nanAlpha: {value: 1- nanTransparency}
            },
            vertexShader: vertShader,
            fragmentShader: isFlat ? fragmentFlat : flatFrag3D,
            side: THREE.DoubleSide,
        }),[isFlat])

    useEffect(()=>{
      if(shaderMaterial){
        const uniforms = shaderMaterial.uniforms
        uniforms.cOffset.value = cOffset;
        uniforms.data.value = texture;
        uniforms.cmap. value = colormap;
        uniforms.animateProg.value =animProg;
        uniforms.nanColor.value = new THREE.Color(nanColor);
        uniforms.nanAlpha.value = 1 - nanTransparency;
        uniforms.cScale.value = cScale;
      }
    },[cScale, cOffset, texture, colormap, animProg, nanColor, nanTransparency])

    useEffect(()=>{
        geometry.dispose()
    },[geometry])
    const eventRef = useRef<ThreeEvent<PointerEvent> | null>(null);
    const handleMove = useCallback((e: ThreeEvent<PointerEvent>) => {
      if (infoRef.current && e.uv) {
        eventRef.current = e;
        setLoc([e.clientX, e.clientY]);
        lastUV.current = e.uv;
        const { x, y } = e.uv;
        const xSize = isFlat ? (analysisMode ? analysisDims[1].length : dimArrays[1].length) : dimArrays[2].length;
        const ySize = isFlat ? (analysisMode ? analysisDims[0].length : dimArrays[0].length) : dimArrays[1].length;
        const xIdx = Math.round(x*xSize-.5)
        const yIdx = Math.round(y*ySize-.5)
        let dataIdx = xSize * yIdx + xIdx;
        dataIdx += isFlat ? 0 : Math.floor((dimArrays[0].length-1) * animProg) * xSize*ySize
        const dataVal = sampleArray ? sampleArray[dataIdx] : 0;
        val.current = isFlat && !analysisMode ? Rescale(dataVal, valueScales) : dataVal;
        coords.current = isFlat ? analysisMode ? [analysisDims[0][yIdx], analysisDims[1][xIdx]] : [dimArrays[0][yIdx], dimArrays[1][xIdx]] : [dimArrays[1][yIdx], dimArrays[2][xIdx]]
      }
    }, [sampleArray, dimArrays, animProg]);

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
    />
    </>
  )
}

export {FlatMap}
