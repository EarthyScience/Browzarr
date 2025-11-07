"use client";

import React, {useMemo, useEffect, useRef, useCallback, useState} from 'react'
import * as THREE from 'three'
import { useAnalysisStore, useGlobalStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates'
import { vertShader } from '@/components/computation/shaders'
import { flatFrag3D, fragmentFlat } from '../textures/shaders';
import { useShallow } from 'zustand/shallow'
import { ThreeEvent } from '@react-three/fiber';
import { GetCurrentArray, GetTimeSeries, parseUVCoords } from '@/utils/HelperFuncs';
import { ZarrDataset } from '../zarr/ZarrLoaderLRU';
import { evaluate_cmap } from 'js-colormaps-es';

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

const FlatMap = ({textures, infoSetters, ZarrDS} : {textures : THREE.DataTexture | THREE.Data3DTexture[], infoSetters : InfoSettersProps, ZarrDS: ZarrDataset}) => {
    const {setLoc, setShowInfo, val, coords} = infoSetters;
    const {flipY, colormap, valueScales, dimArrays, dimNames, dimUnits, 
      isFlat, dataShape, textureArrayDepths, strides, timeSeries,
      setPlotDim,updateDimCoords, updateTimeSeries} = useGlobalStore(useShallow(state => ({
      flipY: state.flipY, colormap: state.colormap, 
      valueScales: state.valueScales, dimArrays: state.dimArrays,
      dimNames:state.dimNames, dimUnits: state.dimUnits,
      isFlat: state.isFlat, dataShape: state.dataShape,
      textureArrayDepths: state.textureArrayDepths,
      strides: state.strides, timeSeries: state.timeSeries,
      setPlotDim:state.setPlotDim, 
      updateDimCoords:state.updateDimCoords,
      updateTimeSeries: state.updateTimeSeries
    })))

    const {cScale, cOffset, animProg, nanTransparency, nanColor, 
      zSlice, ySlice, xSlice, lonExtent, latExtent, 
      lonResolution, latResolution, selectTS,
      getColorIdx, incrementColorIdx} = usePlotStore(useShallow(state => ({
      cOffset: state.cOffset, cScale: state.cScale,
      resetAnim: state.resetAnim, animate: state.animate,
      animProg: state.animProg, nanTransparency: state.nanTransparency,
      nanColor: state.nanColor, zSlice: state.zSlice,
      ySlice: state.ySlice, xSlice: state.xSlice,
      lonExtent: state.lonExtent, latExtent: state.latExtent,
      lonResolution: state.lonResolution, latResolution: state.latResolution,
      selectTS: state.selectTS,
      getColorIdx: state.getColorIdx,
      incrementColorIdx: state.incrementColorIdx
    })))
    const {axis, analysisMode, analysisArray} = useAnalysisStore(useShallow(state=> ({
      axis: state.axis,
      analysisMode: state.analysisMode,
      analysisArray: state.analysisArray
    })))
    const {reFetch} = useZarrStore(useShallow(state => ({reFetch: state.reFetch})))

    const dimSlices = [
      dimArrays[0].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
      dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
      dimArrays.length > 2 ? dimArrays[2].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined) : [],
    ]
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
    const sampleArray = useMemo(()=> analysisMode ? analysisArray : GetCurrentArray(),[analysisMode, analysisArray, reFetch])
    const analysisDims = useMemo(()=>dimArrays.length > 2 ? dimSlices.filter((_e,idx)=> idx != axis) : dimSlices,[dimSlices,axis])
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
    const [boundsObj, setBoundsObj] = useState<Record<string, THREE.Vector4>>({})
    const [bounds, setBounds] = useState<THREE.Vector4[]>(new Array(10).fill(new THREE.Vector4(-1 , -1, -1, -1)))
    const [height, width] = [dataShape[dataShape.length-2], dataShape[dataShape.length-1]]

    useEffect(()=>{ //This goes through the list of highlighted squares and removes those that aren't included in the timeseries object.
          let boundIDs = Object.keys(boundsObj)
          const tsIDs = Object.keys(timeSeries)
          boundIDs = boundIDs.filter((val) => tsIDs.includes(val))
          const pointValues = boundIDs.map(id => boundsObj[id]);
          const paddedArray = [
            ...pointValues,
            ...Array(Math.max(0, 10 - pointValues.length)).fill(new THREE.Vector4(-1 , -1, -1, -1))
          ];
          setBounds(paddedArray)
        },[boundsObj, timeSeries])

    function addBounds(uv : THREE.Vector2, tsID: string){ //This adds the bounds in UV space of a selected square on the sphere. 
          const widthID = Math.floor(uv.x*(width))+.5;
          const heightID = Math.ceil(uv.y*height)-.5 ;
          const delX = 1/width;
          const delY = 1/height;
          const xBounds = [widthID/width-delX/2,widthID/width+delX/2]
          const yBounds = [heightID/height-delY/2,heightID/height+delY/2]
          const bounds = new THREE.Vector4(...xBounds, ...yBounds)
          const newBoundObj = {[tsID] : bounds}
          setBoundsObj(prev=>{ return {...newBoundObj, ...prev}})
        }
    function HandleTimeSeries(event: THREE.Intersection){
            const uv = event.uv;
            const normal = new THREE.Vector3(0,0,1)
            if(ZarrDS && uv){
              const tsUV = flipY ? new THREE.Vector2(uv.x, 1-uv.y) : uv
              const tempTS = GetTimeSeries({data:analysisMode ? analysisArray : GetCurrentArray(), shape:dataShape, stride:strides},{uv:tsUV,normal})
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
              addBounds(uv, tsID);
            }
          }
    // ----- SHADER MATERIAL ----- //
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms:{
              cScale: {value: cScale},
              cOffset: {value: cOffset},
              selectTS: {value: selectTS},
              selectBounds: {value: bounds},
              map : {value: textures},
              textureDepths: {value:  new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
              cmap : { value : colormap},
              animateProg: {value:animProg},
              nanColor: {value : new THREE.Color(nanColor)},
              nanAlpha: {value: 1 - nanTransparency},
            },
            vertexShader: vertShader,
            fragmentShader: isFlat ? fragmentFlat : flatFrag3D,
            side: THREE.DoubleSide,
        }),[isFlat, textures])
    
    useEffect(()=>{
      if(shaderMaterial){
        const uniforms = shaderMaterial.uniforms
        uniforms.cOffset.value = cOffset;
        uniforms.map.value = textures;
        uniforms.cmap. value = colormap;
        uniforms.animateProg.value =animProg;
        uniforms.nanColor.value = new THREE.Color(nanColor);
        uniforms.nanAlpha.value = 1 - nanTransparency;
        uniforms.cScale.value = cScale;
        uniforms.selectBounds.value = bounds;
        uniforms.selectTS.value = selectTS
      }
    },[cScale, cOffset, textures, colormap, animProg, nanColor, nanTransparency, bounds, selectTS])


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
