import * as THREE from 'three'
import { useMemo, useState, useEffect, useRef } from 'react';
import { parseUVCoords, getUnitAxis, GetTimeSeries, GetCurrentArray } from '@/utils/HelperFuncs';
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { evaluate_cmap } from 'js-colormaps-es';

export const UVCube = ( )=>{

  const {setTimeSeries,setPlotDim,setDimCoords, updateTimeSeries, 
    updateDimCoords} = useGlobalStore(
    useShallow(state=>({
      setTimeSeries:state.setTimeSeries, 
      setPlotDim:state.setPlotDim, 
      setDimCoords:state.setDimCoords,
      updateTimeSeries: state.updateTimeSeries,
      updateDimCoords: state.updateDimCoords
    })))

  const {analysisMode, analysisArray} = useAnalysisStore(useShallow(state=>({
    analysisMode: state.analysisMode,
    analysisArray: state.analysisArray
  })))

  const {shape, dataShape, strides, dimArrays,dimNames,dimUnits} = useGlobalStore(
    useShallow(state=>({
      shape:state.shape,
      dataShape: state.dataShape,
      strides: state.strides,
      dimArrays:state.dimArrays,
      dimNames:state.dimNames,
      dimUnits:state.dimUnits
    })))
  
  const {selectTS, xRange, yRange, zRange,getColorIdx, incrementColorIdx} = usePlotStore(useShallow(state => ({
    xRange: state.xRange, yRange: state.yRange, zRange:state.zRange,
    selectTS: state.selectTS,
    getColorIdx: state.getColorIdx,
    incrementColorIdx: state.incrementColorIdx
  })))

  const lastNormal = useRef<number | null>( 0 )

  function HandleTimeSeries(event: THREE.Intersection){
    const uv = event.uv!;
    const normal = event.normal!;
    const dimAxis = getUnitAxis(normal);
    if (dimAxis != lastNormal.current){
      setTimeSeries({}); //Clear timeseries if new axis
      setDimCoords({});
    }
    lastNormal.current = dimAxis;
    const tempTS = GetTimeSeries({data: analysisMode ? analysisArray : GetCurrentArray(), shape: dataShape, stride: strides},{uv,normal})
    const plotDim = (normal.toArray()).map((val, idx) => {
      if (Math.abs(val) > 0) {
        return idx;
      }
      return null;}).filter(idx => idx !== null);
    setPlotDim(2-plotDim[0]) //I think this 2 is only if there are 3-dims. Need to rework the logic

    const coordUV = parseUVCoords({normal:normal,uv:uv})
    let dimCoords = coordUV.map((val,idx)=>val ? dimArrays[idx][Math.round(val*dimArrays[idx].length)] : null)
    const thisDimNames = dimNames.filter((_,idx)=> dimCoords[idx] !== null)
    const thisDimUnits = dimUnits.filter((_,idx)=> dimCoords[idx] !== null)
    dimCoords = dimCoords.filter(val => val !== null)
    const tsID = `${dimCoords[0]}_${dimCoords[1]}`
    const tsObj = {
      color:evaluate_cmap(getColorIdx()/10,"Paired"),
      data:tempTS
    }
    updateTimeSeries({ [tsID] : tsObj})
    incrementColorIdx();
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
        units:dimUnits[2-plotDim[0]]
      }
    }
    updateDimCoords({[tsID] : dimObj})
  }

  const {geometry, position} = useMemo(() => {
    const xScale = xRange[1] - xRange[0]
    const yScale = yRange[1] - yRange[0]
    const zScale = zRange[1] - zRange[0]

    const aspect = shape.y/shape.x;
    const depth = shape.z/shape.x;

    const xPos = (xRange[1] + xRange[0]) / 2
    const yPos = (yRange[1] + yRange[0]) / 2
    const zPos = (zRange[1] + zRange[0]) / 2

    const geometry = new THREE.BoxGeometry(xScale/2, yScale/2, zScale/2)
    const position = new THREE.Vector3(xPos, yPos * aspect, zPos * depth)
    return {geometry, position}
  
  }, [xRange, yRange, zRange]);

  useEffect(() => {
    return () => {
      geometry.dispose(); // Dispose when unmounted
    };
  }, []);

  return (
      <mesh geometry={geometry} position={position} scale={shape} onClick={(e) => {
        e.stopPropagation();
        if (e.intersections.length > 0 && selectTS) {
          HandleTimeSeries(e.intersections[0]);
        }
      }}>
        <meshBasicMaterial 
          // colorWrite={false}
          // depthWrite={false}
          transparent 
          opacity={1}
        />
      </mesh>
  )
}