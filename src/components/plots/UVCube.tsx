import * as THREE from 'three'
import { useMemo, useState, useEffect, useRef } from 'react';
import { parseUVCoords, getUnitAxis, GetTimeSeries, GetCurrentArray, sample2D } from '@/utils/HelperFuncs';
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


export const UVCube = ( {scale} : {scale?:THREE.Vector3} )=>{

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

  const {shape, dataShape, strides, axisDimArrays,axisDimNames,axisDimUnits, remapTexture, flipY} = useGlobalStore(
    useShallow(state=>({
      shape:state.shape,
      dataShape: state.dataShape,
      strides: state.strides,
      axisDimArrays:state.axisDimArrays,
      axisDimNames:state.axisDimNames,
      axisDimUnits:state.axisDimUnits,
      remapTexture: state.remapTexture,
      flipY: state.flipY
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
    let newUV: THREE.Vector2 | undefined;
    if (remapTexture && Math.abs(normal.z) > 0.5){ // Get new UV if reprojected and along z Axis
      const [thisUV, isValid] = sample2D(remapTexture, uv.x, flipY ? 1-uv.y: uv.y) // Weird double flippiing of UVs with flipY. Has something to do with how projected data is done. 
      if (flipY) thisUV.y = 1-thisUV.y
      if (isValid) newUV = thisUV;
      else{
        return;
      }
    }
    const dimAxis = getUnitAxis(normal);
    if (dimAxis != lastNormal.current){
      setTimeSeries({}); //Clear timeseries if new axis
      setDimCoords({});
    }
    lastNormal.current = dimAxis;
    const tempTS = GetTimeSeries(
      { data: analysisMode ? analysisArray : GetCurrentArray(), shape: dataShape, stride: strides },
      { uv: newUV ?? uv, normal }
    )
    const plotDim = (normal.toArray()).map((val, idx) => {
      if (Math.abs(val) > 0) {
        return idx;
      }
      return null;}).filter(idx => idx !== null);
    setPlotDim(2-plotDim[0]) //I think this 2 is only if there are 3-dims. Need to rework the logic

    const coordUV = parseUVCoords({normal:normal,uv})
    let dimCoords = coordUV.map((val,idx)=>val ? axisDimArrays[idx][Math.round(val*axisDimArrays[idx].length)] : null)
    const thisDimNames = axisDimNames.filter((_,idx)=> dimCoords[idx] !== null)
    const thisDimUnits = axisDimUnits.filter((_,idx)=> dimCoords[idx] !== null)
    dimCoords = dimCoords.filter(val => val !== null)
    const tsID = `${dimCoords[0]}_${dimCoords[1]}`
    const tsObj = {
      color:evaluate_cmap(getColorIdx()/10,"Paired"),
      normal,
      uv,
      newUV, // Delete this if never solve moving between projections. ATM is redundant
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
        units:axisDimUnits[2-plotDim[0]]
      }
    }
    updateDimCoords({[tsID] : dimObj})
  }

  useEffect(()=>{
    // This effect gets the reprojected UVs for all points after reprojecting to move columns when switching to projection
    // I can't quite get it to work so I will just clear the timeSeries for now. 
    // if (remapTexture){
    //   const newTimeSeries: Record<string, Record<string, any>> = {}
    //   const {timeSeries} = useGlobalStore.getState()
    //   for (const [tsID, tsObj] of Object.entries(timeSeries)){
    //     const {uv} = tsObj
    //     const [thisUV, _isValid] = sample2D(remapTexture, uv.x, flipY ? 1-uv.y: uv.y) // Should always be valid as either was plotted from original CRS, or invalid are not added in new CRS
        
    //     if (flipY) thisUV.y = 1-thisUV.y
    //     const newTSObj = {...tsObj, newUV:thisUV}
    //     newTimeSeries[tsID] = newTSObj
    //   }
    //   useGlobalStore.setState({timeSeries:newTimeSeries})
    // }
    useGlobalStore.setState({timeSeries:{}, dimCoords:{}})
  },[remapTexture])

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
  }, [xRange, yRange, zRange, shape]);

  useEffect(() => {
    return () => {
      geometry.dispose(); // Dispose when unmounted
    };
  }, []);

  return (
      <mesh geometry={geometry} position={position} scale={scale??shape} onClick={(e) => {
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

