"use client";

import { useAnalysisStore, useGlobalStore, useImageExportStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates'
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

const CubeAxis = ({flipX, flipY, flipDown}: {flipX: boolean, flipY: boolean, flipDown: boolean}) =>{
  const {dimArrays, dimNames, dimUnits, dataShape, revY} = useGlobalStore(useShallow(state => ({
    dimArrays: state.dimArrays,
    dimNames: state.dimNames,
    dimUnits: state.dimUnits,
    dataShape: state.dataShape,
    revY: state.flipY
  })))
  const {zSlice, ySlice, xSlice} = useZarrStore(useShallow(state => ({
    zSlice: state.zSlice,
    ySlice: state.ySlice,
    xSlice: state.xSlice
  })))
  const {xRange, yRange, zRange, plotType, timeScale, animProg} = usePlotStore(useShallow(state => ({
    xRange: state.xRange,
    yRange: state.yRange,
    zRange: state.zRange,
    plotType: state.plotType,
    timeScale: state.timeScale,
    animProg: state.animProg
  })))

  const {hideAxis, hideAxisControls} = useImageExportStore(useShallow( state => ({
    hideAxis: state.hideAxis,
    hideAxisControls: state.hideAxisControls
  })))

  const dimLengths = [
    (zSlice[1] ? zSlice[1] : dimArrays[0].length) - zSlice[0],
    (ySlice[1] ? ySlice[1] : dimArrays[1].length) - ySlice[0],
    (xSlice[1] ? xSlice[1] : dimArrays[2].length) - xSlice[0],
  ]
  const dimSlices = [
    dimArrays[0].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
    revY ? dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined).reverse() : dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
    dimArrays[2].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined),
  ]

  const [xResolution, setXResolution] = useState<number>(7)
  const [yResolution, setYResolution] = useState<number>(7)
  const [zResolution, setZResolution] = useState<number>(7)

  const isPC = useMemo(()=>plotType == 'point-cloud',[plotType])
  const globalScale = isPC ? dataShape[2]/500 : 1

  const depthRatio = useMemo(()=>dataShape[0]/dataShape[2]*timeScale,[dataShape, timeScale]);
  const shapeRatio = useMemo(()=>dataShape[1]/dataShape[2], [dataShape])

  const secondaryColor = useCSSVariable('--text-plot') //replace with needed variable
  const colorHex = useMemo(()=>{
    if (!secondaryColor){return}
    const col = new THREE.Color(secondaryColor) 
    return col.getHex()
  },[secondaryColor])

  const lineMat = useMemo(()=>new LineMaterial({color: colorHex ? colorHex : 0, linewidth: 2.0}),[colorHex])
  const tickLength = 0.05*globalScale;

  const xLine = useMemo(()=> {
    const geom = new LineSegmentsGeometry().setPositions([xRange[0]*globalScale-tickLength/2, 0, 0, xRange[1]*globalScale+tickLength/2, 0, 0]);
    return new LineSegments2(geom, lineMat)},[xRange, lineMat, globalScale])

  const yLine = useMemo(() =>{
    const geom = new LineSegmentsGeometry().setPositions([0, yRange[0]*shapeRatio*globalScale, 0, 0, yRange[1]*shapeRatio*globalScale+tickLength/2, 0]);
    return new LineSegments2(geom, lineMat)},[yRange, shapeRatio, lineMat, globalScale])

  const zLine = useMemo(()=> {
    const geom = new LineSegmentsGeometry().setPositions([0, 0, isPC ? zRange[0]*globalScale*depthRatio-tickLength/2 : zRange[0]-tickLength/2, 0, 0, isPC ? zRange[1]*globalScale*depthRatio+tickLength/2 : zRange[1]+tickLength/2]);
    return new LineSegments2(geom, lineMat)},[zRange, depthRatio, isPC, lineMat, globalScale])

  const tickLine = useMemo(()=> {
    const geom = new LineSegmentsGeometry().setPositions([0, 0, 0, 0, 0, tickLength]);
    return new LineSegments2(geom, lineMat)},[lineMat, globalScale])
  
  const xDimScale = xResolution/(xResolution-1)
  const xValDelta = 1/(xResolution-1)
  const yDimScale = yResolution/(yResolution-1)
  const yValDelta = 1/(yResolution-1)
  const zDimScale = zResolution/(zResolution-1)
  const zValDelta = 1/(zResolution-1)
  return (
    <group visible={plotType != 'sphere' && plotType != 'flat' && !hideAxis}>
    {/* Horizontal Group */}
    <group position={[0, isPC ? shapeRatio*globalScale*yRange[0] : shapeRatio*yRange[0], 0]}  >
      {/* X Group */}
      <group position={[0, 0, flipX ? isPC ? zRange[0]*depthRatio*(globalScale)-tickLength/2 : zRange[0]-tickLength/2 : isPC ? zRange[1] * (globalScale) * depthRatio +tickLength/2 : zRange[1]+tickLength/2]} rotation={[flipDown ? flipX ? -Math.PI/2 : Math.PI/2 : 0, 0, 0]}> 
        <primitive key={'xLine'} object={xLine} />
        {Array(xResolution).fill(null).map((_val,idx)=>(
          (((xRange[0] + 1)/2) <= (idx*xDimScale)/xResolution &&
           ((xRange[1] + 1)/2) >= (idx*xDimScale)/xResolution)
           &&          
          <group key={`xGroup_${idx}`} position={[isPC ? -globalScale + idx*xDimScale/(xResolution/2)*globalScale : -1 + idx*xDimScale/(xResolution/2), 0, 0]}>
            <primitive key={idx} object={tickLine.clone()}  rotation={[0, flipX ? Math.PI : 0, 0]} />
            <Text 
              key={`textX_${idx}`}
              anchorX={idx == 0 ? (flipX ? 'right' : 'left') : idx == xResolution-1 ? (flipX ? 'left' : 'right') : 'center'}
              anchorY={'top'} 
              fontSize={0.05*globalScale} 
              color={colorHex}
              material-depthTest={false}
              rotation={[-Math.PI/2, 0, flipX ? Math.PI : 0]}
              position={[0, 0, flipX ? -0.05*globalScale :.05*globalScale]}
            >{parseLoc(dimSlices[2][Math.floor((dimLengths[2]-1)*idx*xValDelta)],dimUnits[2])}</Text>
          </group>
        ))}
        <group rotation={[-Math.PI/2, 0, flipX ? Math.PI : 0]} position={[(xRange[0]+xRange[1])/2*globalScale/2, 0, flipX ? -0.15*globalScale : 0.15*globalScale]}>
          <Text 
            key={'xTitle'}
            anchorX={'center'}
            anchorY={'top'} 
            fontSize={0.08*globalScale} 
            color={colorHex}
            material-depthTest={false}
          >{dimNames[2]}</Text>
          <group visible={!hideAxisControls}>
            {xResolution < 20 &&
            <Text 
              key={'xAdd'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.15*globalScale} 
              color={colorHex}
              material-depthTest={false}
              position={[0.3*globalScale, -0.2*globalScale/4, 0]}
              onClick={e=>setXResolution(x=> Math.min(x+1,20))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              +
            </Text>}
            { xResolution > 1 &&
            <Text 
              key={'xSub'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.15*globalScale} 
              color={colorHex}
              material-depthTest={false}
              position={[-0.3*globalScale, -0.2*globalScale/4, 0]}
              onClick={e=>setXResolution(x=> Math.max(x-1,1))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              -
            </Text>}
          </group>
        </group>
      </group>
      {/* Z Group */}
      <group position={[flipY ? xRange[1]*globalScale + tickLength/2: xRange[0]*globalScale - tickLength/2, 0, 0]} rotation={[0, 0, flipDown ? flipY ? -Math.PI/2 : Math.PI/2 : 0]}>
        <primitive key={'zLine'} object={zLine} />
        {Array(zResolution).fill(null).map((_val,idx)=>(
          (((zRange[0] + 1)/2) <= (idx*zDimScale)/zResolution  &&
          ((zRange[1] + 1)/2) >= (idx*zDimScale)/zResolution )
          && 
          <group key={`zGroup_${idx}`} position={[0, 0, isPC ? -depthRatio*globalScale + idx*zDimScale/(zResolution/2)*depthRatio*(globalScale) : -1 + idx*zDimScale/(zResolution/2)]}>
            <primitive key={idx} object={tickLine.clone()}  rotation={[0, flipY ? Math.PI/2 : -Math.PI/2 , 0]} />
            <Text 
              key={`textY_${idx}`}
              anchorX={idx == 0 ? (flipY ? 'right' : 'left') : idx == zResolution-1 ? (flipY ? 'left' : 'right') : 'center'}
              anchorY={'top'} 
              fontSize={0.04*globalScale} 
              color={colorHex}
              material-depthTest={false}
              rotation={[-Math.PI/2, 0, flipY ? Math.PI/2 : -Math.PI/2]}
              position={[flipY ? 0.05*globalScale :-0.05*globalScale, 0, 0]}
            >{parseLoc(dimSlices[0][(Math.floor((dimLengths[0]-1)*idx*zValDelta)+Math.floor(dimLengths[0]*animProg))%dimLengths[0]],dimUnits[0])}</Text>
          </group>
        ))}
        <group rotation={[-Math.PI/2, 0, flipY ? Math.PI/2 : -Math.PI/2]} position={[flipY ? 0.15*globalScale : -0.15*globalScale, 0, isPC ? (zRange[0]+zRange[1])/2*depthRatio*(globalScale) : (zRange[0]+zRange[1])/2]}>
          <Text 
            key={'zTitle'}
            anchorX={'center'}
            anchorY={'top'} 
            fontSize={0.08*globalScale} 
            color={colorHex}
            material-depthTest={false}
          >{dimNames[0]}</Text>
          
          <group visible={!hideAxisControls}>
            {zResolution < 20 &&
            <Text 
              key={'zAdd'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.15*globalScale} 
              color={colorHex}
              material-depthTest={false}
              position={[0.2*globalScale, -0.2*globalScale/4, 0]}
              onClick={e=>setZResolution(x=> Math.min(x+1,20))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              +
            </Text>}
            {zResolution > 1 &&
            <Text 
              key={'zSub'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.15*globalScale} 
              color={colorHex}
              material-depthTest={false}
              position={[-0.2*globalScale, -0.2*globalScale/4, 0]}
              onClick={e=>setZResolution(x=> Math.max(x-1,1))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              -
            </Text>}
          </group>
        </group>
      </group>
    </group>
    {/* Vertical Group */}
    <group position={[flipY ? xRange[0]*globalScale - tickLength/2 : xRange[1]*globalScale + tickLength/2, 0, flipX ? isPC ? zRange[0]*depthRatio*(globalScale) - tickLength/2 : zRange[0] - tickLength/2 : isPC ? zRange[1]*depthRatio*(globalScale) + tickLength/2 : zRange[1] +tickLength/2]}> 
      <primitive key={'yLine'} object={yLine} />
      {Array(yResolution).fill(null).map((_val,idx)=>(
           (((yRange[0] + 1)/2) <= (idx*yDimScale)/yResolution &&
           ((yRange[1] + 1)/2) >= (idx*yDimScale)/yResolution)
           &&       
          <group key={`yGroup_${idx}`} position={[0, isPC ?  (-shapeRatio*globalScale + idx*yDimScale/(yResolution/2)*shapeRatio*globalScale) : -shapeRatio + idx*yDimScale/(yResolution/2)*shapeRatio, 0]}>
            <primitive key={idx} object={tickLine.clone()}  rotation={[0, flipY ? -Math.PI/2 :Math.PI/2 , 0]} />
            <Text 
              key={`text_${idx}`}
              anchorX={flipY ? flipX ? 'left' : 'right' : flipX ? 'right' : 'left'}
              anchorY={'middle'} 
              fontSize={0.05*globalScale} 
              color={colorHex}
              material-depthTest={false}
              rotation={[0, flipX ? Math.PI : 0, 0]}
              position={[flipY ? -0.07*globalScale : 0.07*globalScale, 0, 0]}
            >{parseLoc(dimSlices[1][Math.floor((dimLengths[1]-1)*idx*yValDelta)],dimUnits[1])}</Text>
          </group>
        ))}
        <group rotation={[0, flipX ? Math.PI : 0 , 0]} position={[flipY ? -0.32*globalScale : 0.32*globalScale, (yRange[0]+yRange[1])/2*shapeRatio*globalScale, 0]}>
          <Text 
            key={'yTitle'}
            anchorX={'center'}
            anchorY={'middle'} 
            fontSize={0.08*globalScale} 
            color={colorHex}
            material-depthTest={false}
            rotation={[0, 0, Math.PI / 2]}
          >
            {dimNames[1]}
          </Text>

          <group visible={!hideAxisControls}>
            {yResolution < 20 &&
            <Text 
              key={'zAdd'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.15*globalScale} 
              color={colorHex}
              material-depthTest={false}
              position={[ flipY == flipX ? 0.01*globalScale : -0.01*globalScale, 0.3*globalScale, 0]}
              onClick={e=>setYResolution(x=> Math.min(x+1,20))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              +
            </Text>
          }
          {yResolution > 1 &&
            <Text 
              key={'zSub'}
              anchorX={'center'}
              anchorY={'middle'}
              rotation={[0, 0, Math.PI / 2]}
              fontSize={0.15*globalScale} 
              color={colorHex}
              material-depthTest={false}
              position={[flipY == flipX ? 0.0*globalScale : -0.0*globalScale, -0.3*globalScale, 0]}
              onClick={e=>setYResolution(x=> Math.max(x-1,1))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              -
            </Text>
          }
        </group>
      </group>
    </group>

  </group>
  )
}


const FlatAxis = () =>{
  const {dimArrays, dimNames, dimUnits, flipY, isFlat} = useGlobalStore(useShallow(state => ({
    dimArrays: state.dimArrays,
    dimNames: state.dimNames,
    dimUnits: state.dimUnits,
    flipY: state.flipY,
    isFlat: state.isFlat
  })))

  const {plotType} = usePlotStore(useShallow(state=>({
    plotType: state.plotType
  })))
  const {zSlice, ySlice, xSlice} = useZarrStore(useShallow(state => ({
    zSlice: state.zSlice,
    ySlice: state.ySlice,
    xSlice: state.xSlice
  })))
  const {hideAxis, hideAxisControls} = useImageExportStore(useShallow( state => ({
    hideAxis: state.hideAxis,
    hideAxisControls: state.hideAxisControls
  })))

  const {analysisMode, axis} = useAnalysisStore(useShallow(state => ({
    analysisMode: state.analysisMode,
    axis: state.axis
  })))
  const originallyFlat = dimArrays.length == 2;
  const slices = [zSlice, ySlice, xSlice]
  const dimLengths = useMemo(()=>{
    if (analysisMode && !originallyFlat){
      return dimArrays.map((val, idx) => (slices[idx][1] ? slices[idx][1] : val.length) - slices[idx][0])
        .filter((_val, idx )=> idx != axis)
    }else{
      return dimArrays.map((val, idx) => (slices[idx][1] ? slices[idx][1] : val.length) - slices[idx][0])
    }
  },[axis, dimArrays, analysisMode])

  const dimSlices = useMemo(()=>originallyFlat ? 
    [
      flipY ? dimArrays[0].slice().reverse() : dimArrays[0], // Need the slice because inside useMemo it doesn't mutate the original properly
      dimArrays[1]
    ] 
    :
    [
      dimArrays[0].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
      flipY ? dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined).reverse() : dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
      dimArrays[2].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined),
    ],[dimArrays, flipY])
  
  const swap = useMemo(() => (analysisMode && axis == 2 && !originallyFlat),[axis, analysisMode]) // This is for the horrible case when users plot along the horizontal dimension i.e; Longitude. Everything swaps
  const widthIdx = swap ? dimLengths.length-2 : dimLengths.length-1
  const heightIdx = swap ? dimLengths.length-1 : dimLengths.length-2

  const [xResolution, setXResolution] = useState<number>(7)
  const [yResolution, setYResolution] = useState<number>(7)

  const { axisArrays, axisUnits, axisNames } = useMemo(() => {

    if (analysisMode && !originallyFlat) {
      return {
        axisArrays: dimSlices.filter((_val, idx) => idx != axis),
        axisUnits: dimUnits.filter((_val, idx) => idx != axis),
        axisNames: dimNames.filter((_val, idx) => idx != axis),
      };
    } else {
      return {
        axisArrays: dimSlices,
        axisUnits: dimUnits,
        axisNames: dimNames,
      };
    }
  }, [analysisMode, dimArrays, dimUnits, dimNames, dimSlices]);


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

  const lineMat = useMemo(()=>new LineMaterial({color: colorHex ? colorHex : 0, linewidth: 2.0}),[colorHex])
  const tickLength = 0.05;
  const xLine = useMemo(()=> {
    const geom = new LineSegmentsGeometry().setPositions( [(-1/(swap ? shapeRatio : 1)-tickLength/2), 0, 0, (1/((swap ? shapeRatio : 1))+tickLength/2), 0, 0]);
    return new LineSegments2(geom, lineMat)},[lineMat, swap, shapeRatio])

  const yLine = useMemo(() =>{
    const geom = new LineSegmentsGeometry().setPositions([0, -(swap ? 1 : shapeRatio)-tickLength/2, 0, 0, (swap ? 1 : shapeRatio)+tickLength/2, 0]);
    return new LineSegments2(geom, lineMat)},[shapeRatio, lineMat, swap, shapeRatio])
  
  const tickLine = useMemo(()=> {
    const geom = new LineSegmentsGeometry().setPositions([0, 0, 0, 0, 0, .05]);
    return new LineSegments2(geom, lineMat)},[lineMat, swap])
  const xDimScale = xResolution/(xResolution-1)
  const xValDelta = 1/(xResolution-1)
  const yDimScale = yResolution/(yResolution-1)
  const yValDelta = 1/(yResolution-1)
  return (
    <group visible={plotType == 'flat' && !hideAxis}>
      {/* X Group */}
      <group position={[0, -(swap ? 1 :  shapeRatio)-tickLength/2, 0]} rotation={[ Math.PI/2, 0, 0]}> 
        <primitive key={'xLine'} object={xLine} />
        {Array(xResolution).fill(null).map((_val,idx)=>(   
          xResolution > 1 &&              
          <group key={`xGroup_${idx}`} position={[-(swap ? 1/shapeRatio : 1) + idx*xDimScale/(xResolution/2)*(swap ? 1/shapeRatio : 1), 0, 0]}>
            <primitive key={idx} object={tickLine.clone()}  rotation={[0, 0, 0]} />
            <Text 
              key={`textX_${idx}`}
              anchorX={'center'}
              anchorY={'top'} 
              fontSize={0.05} 
              color={colorHex}
              material-depthTest={false}
              rotation={[-Math.PI/2, 0, 0]}
              position={[0, 0, .05]}
            >{parseLoc(axisArrays[widthIdx][Math.floor((dimLengths[widthIdx]-1)*idx*xValDelta)],axisUnits[widthIdx])}</Text>
          </group>
        ))}
        <group rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0.15]}>
          <Text 
            key={'xTitle'}
            anchorX={'center'}
            anchorY={'top'} 
            fontSize={0.08} 
            color={colorHex}
            material-depthTest={false}
          >{axisNames[widthIdx]}</Text>
          <group visible={!hideAxisControls}>
            {xResolution < 20 &&
            <Text 
              key={'xAdd'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.125} 
              color={colorHex}
              material-depthTest={false}
              position={[0.35, -0.05, 0]}
              onClick={e=>setXResolution(x=> Math.min(x+1,20))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              +
            </Text>}
            { xResolution > 1 &&
            <Text 
              key={'xSub'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.125} 
              color={colorHex}
              material-depthTest={false}
              position={[-0.35, -0.05, 0]}
              onClick={e=>setXResolution(x=> Math.max(x-1,1))}
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
        yResolution > 1 &&     
          <group key={`yGroup_${idx}`} position={[0, -(swap ? 1 : shapeRatio )+ idx*yDimScale/(yResolution/2)*(swap ? 1 : shapeRatio), 0]} rotation={[0, 0, Math.PI]}>
            <primitive key={idx} object={tickLine.clone()}  rotation={[0, Math.PI/2 , 0]} />
            <Text 
              key={`text_${idx}`}
              anchorX={'right'}
              anchorY={'middle'} 
              fontSize={0.05} 
              color={colorHex}
              material-depthTest={false}
              rotation={[0,  0, -Math.PI]}
              position={[0.07, 0, 0]}
            >{parseLoc(axisArrays[heightIdx][Math.floor((dimLengths[heightIdx]-1)*idx*yValDelta)],axisUnits[heightIdx])}</Text>
          </group>
        ))}
        <group rotation={[0, 0 , 0]} position={[-0.325, 0, 0]}>
          <Text 
            key={'yTitle'}
            anchorX={'center'}
            anchorY={'middle'} 
            rotation={[0, 0, Math.PI/2]}
            fontSize={0.08}
            color={colorHex}
            material-depthTest={false}
          >{axisNames[heightIdx]}</Text>
          <group visible={!hideAxisControls}>
            {yResolution < 20 &&
            <Text 
              key={'zAdd'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.125} 
              color={colorHex}
              material-depthTest={false}
              position={[ 0.0, 0.3, 0]}
              onClick={e=>setYResolution(x=> Math.min(x+1,20))}
              onPointerEnter={e=>document.body.style.cursor = 'pointer'}
              onPointerLeave={e=>document.body.style.cursor = 'default'}
            >
              +
            </Text>}
            {yResolution > 1 &&
            <Text 
              key={'zSub'}
              anchorX={'center'}
              anchorY={'middle'} 
              fontSize={0.125} 
              color={colorHex}
              material-depthTest={false}
              position={[0.015, -0.3, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              onClick={e=>setYResolution(x=> Math.max(x-1,1))}
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

  return (
    <>
    {!isFlat && <CubeAxis flipX={flipX} flipY={flipY} flipDown={flipDown}/>}
    <FlatAxis />
    </>
  )
}
