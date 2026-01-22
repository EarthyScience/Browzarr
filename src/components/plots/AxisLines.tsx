"use client";

import { useAnalysisStore, useGlobalStore, useImageExportStore, usePlotStore } from '@/utils/GlobalStates'
import React, {useState, useMemo} from 'react'
import { useShallow } from 'zustand/shallow'
import { Text } from '@react-three/drei'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three-stdlib';
import { useFrame } from '@react-three/fiber';
import { parseLoc } from '@/utils/HelperFuncs';
import { useCSSVariable } from '../ui';
import * as THREE from 'three'

const AXIS_CONSTANTS = {
  INITIAL_RESOLUTION: 7,
  MAX_RESOLUTION: 20,
  MIN_RESOLUTION: 1,
  PC_GLOBAL_SCALE_DIVISOR: 500,
  LINE_WIDTH: 2.0,
  TICK_LENGTH_FACTOR: 0.05,
  TICK_FONT_SIZE_FACTOR: 0.05,
  TITLE_FONT_SIZE_FACTOR: 0.08,
  CONTROL_FONT_SIZE_FACTOR: 0.15,
  X_TITLE_OFFSET_FACTOR: 0.15,
  Y_TITLE_OFFSET_FACTOR: 0.325,
  Z_TITLE_OFFSET_FACTOR: 0.15,
  CONTROL_DISTANCE: 0.2
};

interface AxisType {
  varName: string,
  resolution: number,
  axis: number, // This is [X, Y, Z] ==> [0, 1, 2]
  lineMat: LineMaterial,
  setResolution: React.Dispatch<React.SetStateAction<number>>,
  range: number[],
  scale: number,
  shapeRatio?: number,
  tickLength: number,
  tickRotations: [number, number]
  labels: number[],
  units: string,
  titleOffset: number,
  rotation: [number, number, number],
  position: [number, number, number],
  flip: boolean,
  mirrorFlip?: boolean,
  isVertical?: boolean,
  hideAxisControls:boolean,
  color: number | undefined,
  anchorX: "center" | "left" | "right",
  anchorY: "bottom" | "top" | "top-baseline" | "middle" | "bottom-baseline"
}

const Axis = ({
  resolution, setResolution, hideAxisControls, varName, range, scale, axis, lineMat, 
  tickLength, labels, color, rotation=[0, 0, 0], position=[0, 0, 0], titleOffset,
  anchorX, anchorY, units, flip, mirrorFlip, tickRotations, isVertical=false, shapeRatio=1
}: AxisType) => {

  const lineGeom = useMemo(() => {
    let positions = [0, 0, 0, 0, 0, 0]
    positions[axis] = range[0] *  shapeRatio - tickLength / 2
    positions[axis + 3] = range[1] *  shapeRatio + tickLength / 2
    const geom = new LineSegmentsGeometry().setPositions(positions);
    return new LineSegments2(geom, lineMat);
  }, [range, scale, color, tickLength])

  const tickLine = useMemo(()=> {
    const geom = new LineSegmentsGeometry().setPositions([0, 0, 0, 0, 0, tickLength]);
    return new LineSegments2(geom, lineMat)
  },[lineMat, tickLength])

  const dimScale = resolution/(resolution-1)
  const valDelta = (labels.length-1)/(resolution-1)

  let controlPosition = [0,0,0]
  controlPosition[axis] = (range[0]+range[1])/2*shapeRatio*scale
  const controlIdx = axis === 0 ? 2 : 0;
  if (isVertical){
    controlPosition[controlIdx] = flip 
                                  ? mirrorFlip ? -titleOffset : -titleOffset*1.5 
                                  :  mirrorFlip ? titleOffset*1.5 : titleOffset
  } else {
    controlPosition[controlIdx] = flip ? -titleOffset : titleOffset
  }

  return (
    <group position={position} rotation={rotation}>
      {/* Axis Lines */}
      <primitive object={lineGeom} />

      {/* Ticks and Labels */}
      {Array(resolution).fill(null).map((_, idx) => {
        let tickPosition = [0, 0, 0]
        tickPosition[axis] = ((idx * (2 * scale / (resolution - 1))) - scale) * shapeRatio;

        let labelOffset = [0, 0, 0]
        if (axis === 0)labelOffset[2] = flip ? -AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale : AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale
        else if (axis === 1) labelOffset[0] = flip ? -AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale : AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale
        else labelOffset[0] = flip ? AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale : -AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale
        return (
        (((range[0] + 1)/2) <= (idx*dimScale)/resolution  &&
        ((range[1] + 1)/2) >= (idx*dimScale)/resolution ) &&
        <group key={idx} position={tickPosition as [number, number, number]} >
          <primitive object={tickLine.clone()} rotation={[0, flip ? tickRotations[1] : tickRotations[0], 0]}/>
          <Text 
            fontSize={AXIS_CONSTANTS.TICK_FONT_SIZE_FACTOR * scale} 
            color={color}
            key={`text${axis}_${idx}`}
            anchorX={
              isVertical 
              ? anchorX
              : idx == 0 ? (flip ? 'right' : 'left') : idx == resolution-1 ? (flip ? 'left' : 'right') : 'center'

            }
            anchorY={anchorY}
            material-depthTest={false}
            rotation={[
              isVertical ? 0 : -Math.PI/2,
              isVertical ? 
                mirrorFlip ? Math.PI : 0
                : 0, 
              isVertical 
                ? 0
                : flip ? tickRotations[1] : tickRotations[0]
            ]}
            position={labelOffset as [number, number, number]}
          >
            {parseLoc(labels[Math.floor(idx*valDelta)], units)}
          </Text>
        </group>)
      })}

      {/* Label and Adjust */}
      <group position={controlPosition as [number, number, number]} 
        rotation={[
          isVertical ? 0 : -Math.PI/2,
          mirrorFlip ? Math.PI : 0,
          isVertical ? tickRotations[0] : (flip ? tickRotations[1] : tickRotations[0])
        ]}
      >
        <Text 
          key={`${axis}Title`}
          anchorX={'center'}
          anchorY={'top'} 
          fontSize={AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR*scale} 
          color={color}
          material-depthTest={false}
        >{varName}</Text>
        <group visible={!hideAxisControls}>
          {resolution < AXIS_CONSTANTS.MAX_RESOLUTION &&
          <Text 
            key={`${axis}Add`}
            anchorX={'center'}
            anchorY={'middle'} 
            fontSize={0.15*scale} 
            color={color}
            material-depthTest={false}
            position={[
              AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR * scale * varName.length,
              -AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR * scale / 2,
              0
            ]}
            onClick={e=>setResolution(x=> Math.min(x+1,AXIS_CONSTANTS.MAX_RESOLUTION))}
            onPointerEnter={e=>document.body.style.cursor = 'pointer'}
            onPointerLeave={e=>document.body.style.cursor = 'default'}
          >
            +
          </Text>}
          { resolution > AXIS_CONSTANTS.MIN_RESOLUTION &&
          <Text 
            key={`${axis}Sub`}
            anchorX={'center'}
            anchorY={'middle'} 
            fontSize={0.15*scale} 
            color={color}
            material-depthTest={false}
            position={[
              -AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR * scale * varName.length,
              -AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR * scale / 2,
              0
            ]}
            onClick={e=>setResolution(x=> Math.max(x-1,AXIS_CONSTANTS.MIN_RESOLUTION))}
            onPointerEnter={e=>document.body.style.cursor = 'pointer'}
            onPointerLeave={e=>document.body.style.cursor = 'default'}
          >
            -
          </Text>}
        </group>
      </group>
    </group>
  )
}


const CubeAxis = ({flipX, flipY, flipDown}: {flipX: boolean, flipY: boolean, flipDown: boolean}) =>{
  const {dimArrays, dimNames, dimUnits, revY, axisShape, dataShape} = useGlobalStore(useShallow(state => ({
    dimArrays: state.dimArrays,
    dimNames: state.dimNames,
    dimUnits: state.dimUnits,
    revY: state.flipY,
    axisShape: state.axisShape,
    dataShape: state.dataShape
  })))

  const {xRange, yRange, zRange, plotType, timeScale, zSlice, ySlice, xSlice} = usePlotStore(useShallow(state => ({
    xRange: state.xRange, yRange: state.yRange,
    zRange: state.zRange, plotType: state.plotType,
    timeScale: state.timeScale, 
    zSlice: state.zSlice, ySlice: state.ySlice,
    xSlice: state.xSlice, 
  })))

  const {hideAxis, hideAxisControls} = useImageExportStore(useShallow( state => ({
    hideAxis: state.hideAxis,
    hideAxisControls: state.hideAxisControls
  })))

  const shapeLength = dimArrays.length

  const dimSlices = useMemo(()=>[
    dimArrays[shapeLength-3].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
    revY ? dimArrays[shapeLength-2].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined).reverse() : dimArrays[shapeLength-2].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
    dimArrays[shapeLength-1].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined),
  ], [dimArrays, zSlice, ySlice, xSlice, shapeLength, revY])
  
  const [xResolution, setXResolution] = useState<number>(AXIS_CONSTANTS.INITIAL_RESOLUTION)
  const [yResolution, setYResolution] = useState<number>(AXIS_CONSTANTS.INITIAL_RESOLUTION)
  const [zResolution, setZResolution] = useState<number>(AXIS_CONSTANTS.INITIAL_RESOLUTION)

  const isPC = useMemo(()=>plotType == 'point-cloud',[plotType])
  const globalScale = isPC ? dataShape[2]/AXIS_CONSTANTS.PC_GLOBAL_SCALE_DIVISOR : 1

  const depthRatio = axisShape[0]*timeScale;
  const shapeRatio = axisShape[1]
  const timeRatio = Math.max(axisShape[0], 2);

  const secondaryColor = useCSSVariable('--text-plot') //replace with needed variable
  const colorHex = useMemo(()=>{
    if (!secondaryColor){return}
    const col = new THREE.Color(secondaryColor) 
    return col.getHex()
  },[secondaryColor])

  const lineMat = useMemo(()=>new LineMaterial({color: colorHex ? colorHex : 0, linewidth: AXIS_CONSTANTS.LINE_WIDTH}),[colorHex])
  const tickLength = AXIS_CONSTANTS.TICK_LENGTH_FACTOR*globalScale;

  const xTitleOffset = useMemo(() => (dimNames[shapeLength - 1].length * AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR / 2 + 0.1) * globalScale, [dimNames, globalScale, shapeLength]);
  const yTitleOffset = useMemo(() => (dimNames[shapeLength - 2].length * AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR / 2 + 0.1) * globalScale, [dimNames, globalScale, shapeLength]);
  const zTitleOffset = useMemo(() => (dimNames[shapeLength - 3].length * AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR / 2 + 0.1) * globalScale, [dimNames, globalScale, shapeLength]);

  const zScale = isPC ? (depthRatio ) : (timeRatio / 2);
  const timeFront = 
    isPC
    ? zRange[flipX ? 0 : 1] * axisShape[0] * globalScale +
      (flipX ? -tickLength : tickLength) / 2
    : (zRange[flipX ? 0 : 1] * timeRatio +
      (flipX ? -tickLength : tickLength)) / 2
  const xFront = 
      xRange[flipY ? 0 : 1] * globalScale +
          (flipY ? -tickLength : tickLength) / 2
  

  return (
    <group visible={plotType != 'sphere' && plotType != 'flat' && !hideAxis}>
      {/* Horizontal Group */}
      <group position={[0, isPC ? shapeRatio*globalScale*yRange[0] : shapeRatio*yRange[0], 0]}  >
        <Axis 
          resolution={xResolution}
          setResolution={setXResolution}
          varName={dimNames[2]}
          units={dimUnits[2]}
          flip={flipX}
          range={xRange}
          lineMat={lineMat}
          axis={0}
          labels={dimSlices[2]}
          position={[0, 0, timeFront]}
          rotation={[
            flipDown 
            ? flipX 
              ? -Math.PI/2 
              : Math.PI/2 
            : 0, 
            0, 
            0
          ]}
          isVertical={false}
          scale={globalScale}
          shapeRatio={axisShape[2]}
          color={colorHex}
          anchorX='center'
          anchorY='top'
          tickLength={tickLength}
          tickRotations={[0, Math.PI]}
          titleOffset={xTitleOffset}
          hideAxisControls={hideAxisControls}
        />
        {/* Z Group */}
        <Axis 
          resolution={zResolution}
          setResolution={setZResolution}
          varName={dimNames[0]}
          units={dimUnits[0]}
          flip={flipY}
          range={zRange}
          lineMat={lineMat}
          axis={2}
          labels={dimSlices[0]}
          position={[xRange[flipY ? 1 : 0]*globalScale + (flipY ? tickLength : -tickLength)/2, 0, 0]}
          rotation={[0, 0, flipDown ? flipY ? -Math.PI/2 : Math.PI/2 : 0]}
          isVertical={false}
          scale={globalScale}
          shapeRatio={zScale}
          color={colorHex}
          anchorX='center'
          anchorY='top'
          tickLength={tickLength}
          tickRotations={[-Math.PI/2, Math.PI/2]}
          titleOffset={-zTitleOffset}
          hideAxisControls={hideAxisControls}
        />
      </group>
    {/* Vertical Group */}
    <Axis 
        resolution={yResolution}
        setResolution={setYResolution}
        varName={dimNames[1]}
        units={dimUnits[1]}
        flip={flipY}
        mirrorFlip={flipX}
        range={yRange}
        lineMat={lineMat}
        axis={1}
        labels={dimSlices[1]}
        position={[
          xFront, 
          0, 
          timeFront
        ]}
        rotation={[0, 0, 0]}
        isVertical
        scale={globalScale}
        shapeRatio={axisShape[1]}
        color={colorHex}
        anchorX={flipY ? flipX ? 'left' : 'right' : flipX ? 'right' : 'left'}
        anchorY='middle'
        tickLength={tickLength}
        tickRotations={[Math.PI/2, -Math.PI/2]}
        titleOffset={yTitleOffset}
        hideAxisControls={hideAxisControls}
      />
  </group>
  )
}

const FLAT_AXIS_CONSTANTS = {
  INITIAL_RESOLUTION: 7,
  MAX_RESOLUTION: 20,
  MIN_RESOLUTION: 1,
  LINE_WIDTH: 2.0,
  TICK_LENGTH: 0.05,
  TICK_FONT_SIZE: 0.05,
  TITLE_FONT_SIZE: 0.08,
  CONTROL_FONT_SIZE: 0.125,
  X_TITLE_OFFSET: 0.15,
  Y_TITLE_OFFSET: 0.325,
};

const FlatAxis = () =>{
  const {dimArrays, dimNames, dimUnits, flipY} = useGlobalStore(useShallow(state => ({
    dimArrays: state.dimArrays,
    dimNames: state.dimNames,
    dimUnits: state.dimUnits,
    flipY: state.flipY,
  })))

  const {plotType,  zSlice, ySlice, xSlice, rotateFlat} = usePlotStore(useShallow(state=>({
    plotType: state.plotType, zSlice: state.zSlice,
    ySlice: state.ySlice, xSlice: state.xSlice,
    rotateFlat:state.rotateFlat
  })))

  const {hideAxis, hideAxisControls} = useImageExportStore(useShallow( state => ({
    hideAxis: state.hideAxis,
    hideAxisControls: state.hideAxisControls
  })))

  const {analysisMode, axis} = useAnalysisStore(useShallow(state => ({
    analysisMode: state.analysisMode,
    axis: state.axis
  })))
  const shapeLength = dimArrays.length;
  const is4D = dimArrays.length === 4;
  const originallyFlat = dimArrays.length == 2;
  const slices = originallyFlat ? [ySlice, xSlice] : [zSlice, ySlice, xSlice]
  
  const dimSlices = useMemo(()=>originallyFlat ? 
    [
      flipY ? dimArrays[0].slice().reverse() : dimArrays[0], // Need the slice because inside useMemo it doesn't mutate the original properly
      dimArrays[1]
    ] 
    :
    [
      dimArrays[shapeLength-3].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
      flipY ? dimArrays[shapeLength-2].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined).reverse() : dimArrays[shapeLength-2].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
      dimArrays[shapeLength-1].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined),
    ],[dimArrays, flipY])

  const dimLengths = useMemo(()=>{
    if (analysisMode && !originallyFlat){
      return dimSlices.map((val, idx) => (slices[idx][1] ? slices[idx][1] : val.length) - slices[idx][0])
        .filter((_val, idx )=> idx != axis)
    }else{
      return dimSlices.map((val, idx) => (slices[idx][1] ? slices[idx][1] : val.length) - slices[idx][0])
    }
  },[axis, dimSlices, analysisMode])

  const swap = useMemo(() => (analysisMode && axis == 2 && !originallyFlat),[axis, analysisMode]) // This is for the horrible case when users plot along the horizontal dimension i.e; Longitude. Everything swaps
  const widthIdx = swap ? dimLengths.length-2 : dimLengths.length-1
  const heightIdx = swap ? dimLengths.length-1 : dimLengths.length-2

  const [xResolution, setXResolution] = useState<number>(FLAT_AXIS_CONSTANTS.INITIAL_RESOLUTION)
  const [yResolution, setYResolution] = useState<number>(FLAT_AXIS_CONSTANTS.INITIAL_RESOLUTION)

  const { axisArrays, axisUnits, axisNames } = useMemo(() => {

    if (analysisMode && !originallyFlat) {
      return {
        axisArrays: dimSlices.filter((_val, idx) => idx != axis),
        axisUnits: is4D
          ? dimUnits.slice(1).filter((_val, idx) => idx != axis)
          : dimUnits.filter((_val, idx) => idx != axis),
        axisNames: is4D
          ? dimNames.slice(1).filter((_val, idx) => idx != axis)
          : dimNames.filter((_val, idx) => idx != axis)
      };
    } else if (!originallyFlat) {
      return {
        axisArrays: dimSlices,
        axisUnits: is4D 
          ? dimUnits.slice(1)
          : dimUnits,
        axisNames: is4D
          ? dimNames.slice(1)
          : dimNames
      };
    } else {
      return {
        axisArrays: dimSlices,
        axisUnits: dimUnits,
        axisNames: dimNames,
      };
    }
  }, [analysisMode, dimArrays, dimUnits, is4D, dimNames, dimSlices]);
  
  const shapeRatio = useMemo(()=>{
    if(analysisMode && axis == 2){
      return dimLengths[heightIdx]/dimLengths[widthIdx]
    }else{
      return dimLengths[heightIdx]/dimLengths[widthIdx]
    }
  }, [dimLengths, analysisMode, axis])

  const secondaryColor = useCSSVariable('--text-plot') //replace with needed variable
  const colorHex = useMemo(()=>{
    if (!secondaryColor){return}
    const col = new THREE.Color(secondaryColor) 
    return col.getHex()
  },[secondaryColor])

  const lineMat = useMemo(()=>new LineMaterial({color: colorHex ? colorHex : 0, linewidth: FLAT_AXIS_CONSTANTS.LINE_WIDTH}),[colorHex])
  const tickLength = FLAT_AXIS_CONSTANTS.TICK_LENGTH;
  const xLine = useMemo(()=> {
    const geom = new LineSegmentsGeometry().setPositions( [(-1/(swap ? shapeRatio : 1)-tickLength/2), 0, 0, (1/(swap ? shapeRatio : 1)+tickLength/2), 0, 0]);
    return new LineSegments2(geom, lineMat)},[lineMat, swap, shapeRatio])

  const yLine = useMemo(() =>{
    const geom = new LineSegmentsGeometry().setPositions([0, -(swap ? 1 : shapeRatio)-tickLength/2, 0, 0, (swap ? 1 : shapeRatio)+tickLength/2, 0]);
    return new LineSegments2(geom, lineMat)},[shapeRatio, lineMat, swap, shapeRatio])
  
  const tickLine = useMemo(()=> {
    const geom = new LineSegmentsGeometry().setPositions([0, 0, 0, 0, 0, FLAT_AXIS_CONSTANTS.TICK_LENGTH]);
    return new LineSegments2(geom, lineMat)},[lineMat, swap])
  const xDimScale = xResolution/(xResolution-1)
  const xValDelta = 1/(xResolution-1)
  const yDimScale = yResolution/(yResolution-1)
  const yValDelta = 1/(yResolution-1)

  const xTitleOffset = useMemo(() => (axisNames[widthIdx].length * FLAT_AXIS_CONSTANTS.TITLE_FONT_SIZE / 2 + 0.1), [axisNames, widthIdx]);
  const yTitleOffset = useMemo(() => (axisNames[heightIdx].length * FLAT_AXIS_CONSTANTS.TITLE_FONT_SIZE / 2 + 0.1), [axisNames, heightIdx]);

  return (
    <group 
      visible={plotType == 'flat' && !hideAxis} 
      rotation={[rotateFlat ? -Math.PI/2 : 0, 0, 0]}
    >
      {/* X Group */}
      <group position={[0, -(swap ? 1 :  shapeRatio)-tickLength/2, 0]} rotation={[ Math.PI/2, 0, 0]}> 
        <primitive key={'xLine'} object={xLine} />
        {Array(xResolution).fill(null).map((_val,idx)=>(   
          xResolution > FLAT_AXIS_CONSTANTS.MIN_RESOLUTION &&              
          <group key={`xGroup_${idx}`} position={[-(swap ? 1/shapeRatio : 1) + idx*xDimScale/(xResolution/2)*(swap ? 1/shapeRatio : 1), 0, 0]}>
            <primitive key={idx} object={tickLine.clone()}  rotation={[0, 0, 0]} />
            <Text 
              key={`textX_${idx}`}
              anchorX={'center'}
              anchorY={'top'} 
              fontSize={FLAT_AXIS_CONSTANTS.TICK_FONT_SIZE} 
              color={colorHex}
              material-depthTest={false}
              rotation={[-Math.PI/2, 0, 0]}
              position={[0, 0, FLAT_AXIS_CONSTANTS.TICK_LENGTH]}
            >{parseLoc(axisArrays[widthIdx][Math.floor((dimLengths[widthIdx]-1)*idx*xValDelta)],axisUnits[widthIdx])}</Text>
          </group>
        ))}
        <group rotation={[-Math.PI/2, 0, 0]} position={[0, 0, FLAT_AXIS_CONSTANTS.X_TITLE_OFFSET]}>
          <Text 
            key={'xTitle'}
            anchorX={'center'}
            anchorY={'top'} 
            fontSize={FLAT_AXIS_CONSTANTS.TITLE_FONT_SIZE} 
            color={colorHex}
            material-depthTest={false}
          >{axisNames[widthIdx]}</Text>
          <group visible={!hideAxisControls}>
            {xResolution < FLAT_AXIS_CONSTANTS.MAX_RESOLUTION &&
            <Text 
              key={'xAdd'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.125} 
              color={colorHex}
              material-depthTest={false}
              position={[xTitleOffset, -0.05, 0]}
              onClick={e=>setXResolution(x=> Math.min(x+1,FLAT_AXIS_CONSTANTS.MAX_RESOLUTION))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              +
            </Text>}
            { xResolution > FLAT_AXIS_CONSTANTS.MIN_RESOLUTION &&
            <Text 
              key={'xSub'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.125} 
              color={colorHex}
              material-depthTest={false}
              position={[-xTitleOffset, -0.05, 0]}
              onClick={e=>setXResolution(x=> Math.max(x-1,FLAT_AXIS_CONSTANTS.MIN_RESOLUTION))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              -
            </Text>}
          </group>
        </group>
      </group>
    {/* Vertical Group */}
    <group position={[-(swap ? 1/shapeRatio : 1 )- tickLength/2, 0, 0]}> 
      <primitive key={'yLine'} object={yLine} />
      {Array(yResolution).fill(null).map((_val,idx)=>(    
        yResolution > FLAT_AXIS_CONSTANTS.MIN_RESOLUTION &&     
          <group key={`yGroup_${idx}`} position={[0, -(swap ? 1 : shapeRatio )+ idx*yDimScale/(yResolution/2)*(swap ? 1 : shapeRatio), 0]} rotation={[0, 0, Math.PI]}>
            <primitive key={idx} object={tickLine.clone()}  rotation={[0, Math.PI/2 , 0]} />
            <Text 
              key={`text_${idx}`}
              anchorX={'right'}
              anchorY={'middle'} 
              fontSize={FLAT_AXIS_CONSTANTS.TICK_FONT_SIZE} 
              color={colorHex}
              material-depthTest={false}
              rotation={[0,  0, -Math.PI]}
              position={[FLAT_AXIS_CONSTANTS.TICK_LENGTH*1.4, 0, 0]}
            >{parseLoc(axisArrays[heightIdx][Math.floor((dimLengths[heightIdx]-1)*idx*yValDelta)],axisUnits[heightIdx])}</Text>
          </group>
        ))}
        <group rotation={[0, 0, 0]} position={[-FLAT_AXIS_CONSTANTS.Y_TITLE_OFFSET, 0, 0]}>
          <Text 
            key={'yTitle'}
            anchorX={'center'}
            anchorY={'middle'} 
            rotation={[0, 0, Math.PI/2]}
            fontSize={FLAT_AXIS_CONSTANTS.TITLE_FONT_SIZE}
            color={colorHex}
            material-depthTest={false}
          >{axisNames[heightIdx]}</Text>
          <group visible={!hideAxisControls}>
            {yResolution < FLAT_AXIS_CONSTANTS.MAX_RESOLUTION &&
            <Text 
              key={'zAdd'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.125} 
              color={colorHex}
              material-depthTest={false}
              position={[ 0.0, yTitleOffset, 0]}
              onClick={e=>setYResolution(x=> Math.min(x+1,FLAT_AXIS_CONSTANTS.MAX_RESOLUTION))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              +
            </Text>}
            {yResolution > FLAT_AXIS_CONSTANTS.MIN_RESOLUTION &&
            <Text 
              key={'zSub'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.125} 
              color={colorHex}
              material-depthTest={false}
              position={[0.0, -yTitleOffset, 0]}
              onClick={e=>setYResolution(x=> Math.max(x-1,FLAT_AXIS_CONSTANTS.MIN_RESOLUTION))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              -
            </Text>}
          </group>
        </group>
    </group>
    </group>
  )
}


export const AxisLines = () => {
  const [flipX, setFlipX] = useState<boolean>(false)
  const [flipY, setFlipY] = useState<boolean>(false)
  const [flipDown, setFlipDown] = useState<boolean>(false)

  const {isFlat} = useGlobalStore(useShallow(state => ({
    isFlat: state.isFlat
  })))
  const {plotType} = usePlotStore(useShallow(state=>({
    plotType:state.plotType
  })))
  useFrame(({camera})=>{
      const shouldFlipX = Math.abs(camera.rotation.z) > Math.PI / 2
      if (flipX !== shouldFlipX) {
        setFlipX(shouldFlipX);
      }

      const shouldFlipY =
        (camera.rotation.z > 0 && camera.rotation.x < 0) ||
        (camera.rotation.z <= 0 && camera.rotation.x > 0) 
      if (flipY !== shouldFlipY){
        setFlipY(shouldFlipY);
      } 
      const shouldFlipDown = camera.rotation.x > 0 || camera.position.y <= 0;
      if (flipDown !== shouldFlipDown){
        setFlipDown(shouldFlipDown)
      }
      
  })
  const cond = isFlat || plotType == "flat"
  return (
    <>
    {!cond && <CubeAxis flipX={flipX} flipY={flipY} flipDown={flipDown} />}
    {cond && <FlatAxis />}
    </>
  )
}
