import * as THREE from 'three'
import { useMemo, useState, useEffect, useRef } from 'react';
import { parseUVCoords, getUnitAxis, GetTimeSeries, GetCurrentArray } from '@/utils/HelperFuncs';
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { evaluate_cmap } from 'js-colormaps-es';

function normalizeUV(uv:number, scale:number, pos:number){
  return (uv*scale) + (pos-0.5*scale+0.5)
}

function updateFace(
  startID:number, 
  xData:{pos:number, scale:number},
  yData:{pos:number, scale:number}, 
  uvs:THREE.BufferAttribute | THREE.InterleavedBufferAttribute){
  for (let i=startID; i < startID+4; i++){
    const thisX = uvs.getX(i)
    const thisY = uvs.getY(i)
    const newX = normalizeUV(thisX, xData.scale, xData.pos)
    const newY = normalizeUV(thisY, yData.scale, yData.pos)
    uvs.setX(i,newX)
    uvs.setY(i,newY)
  }
}


const UpdateUVs = (
  geometry: THREE.BoxGeometry, 
  xData:{
    xPos: number,
    xScale: number
  }, 
  yData:{ 
    yPos: number,
    yScale: number
  },
  zData:{
    zPos: number,
    zScale: number
  }) => {
  const uvs = geometry.attributes.uv;
  const {xPos, xScale} = xData;
  const {yPos, yScale} = yData;
  const {zPos, zScale} = zData;
  //X+
  updateFace(0, {pos:zPos, scale:zScale}, {pos:yPos, scale:yScale}, uvs)
  //X-
  updateFace(4, {pos:zPos, scale:zScale}, {pos:yPos, scale:yScale}, uvs)
  //Y+
  updateFace(8, {pos:xPos, scale:xScale}, {pos:zPos, scale:zScale}, uvs)
  //Y-
  updateFace(12, {pos:xPos, scale:xScale}, {pos:zPos, scale:zScale}, uvs)
  //Z+
  updateFace(16, {pos:xPos, scale:xScale}, {pos:yPos, scale:yScale}, uvs)
  //Z-
  updateFace(20, {pos:xPos, scale:xScale}, {pos:yPos, scale:yScale}, uvs)

  }


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
    const xScale = (xRange[1] - xRange[0])/2
    const yScale = (yRange[1] - yRange[0])/2
    const zScale = (zRange[1] - zRange[0])/2

    const aspect = shape.y/shape.x;
    const depth = shape.z/shape.x;

    const xPos = (xRange[1] + xRange[0]) / 2
    const yPos = (yRange[1] + yRange[0]) / 2
    const zPos = (zRange[1] + zRange[0]) / 2

    const geometry = new THREE.BoxGeometry(xScale, yScale, zScale)
    UpdateUVs(
      geometry,
      {xPos:xPos/2,xScale},
      {yPos:yPos/2,yScale},
      {zPos:-zPos/2, zScale}
    )
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
          colorWrite={false}
          depthWrite={false}
          transparent 
        />
      </mesh>
  )
}

