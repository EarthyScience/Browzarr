import React, {useEffect, useMemo, useState} from 'react'
import { useGlobalStore, usePlotStore, useImageExportStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import {Axis, AXIS_CONSTANTS} from './Axis'
import { LineMaterial } from 'three-stdlib';
import { useCSSVariable } from '@/components/ui';
import * as THREE from 'three'

const VolumeAxis = ({flipX, flipY, flipDown}: {flipX: boolean, flipY: boolean, flipDown: boolean}) => {
    const {dimArrays, dimNames, dimUnits, revY, axisShape, axisOrder, axisFlipped} = useGlobalStore(useShallow(state => ({
        dimArrays: state.axisDimArrays,
        dimNames: state.axisDimNames,
        dimUnits: state.axisDimUnits,
        revY: state.flipY,
        axisShape: state.axisShape,
        axisOrder: state.axisOrder,
        axisFlipped: state.axisFlipped
    })))
    
    const {xRange, yRange, zRange, plotType, zSlice, ySlice, xSlice} = usePlotStore(useShallow(state => ({
        xRange: state.xRange, yRange: state.yRange,
        zRange: state.zRange, plotType: state.plotType,
        zSlice: state.zSlice, ySlice: state.ySlice,
        xSlice: state.xSlice, 
    })))
    const ranges = [zRange, yRange, xRange]
    const thisXRange = ranges[axisOrder[2]]
    const thisYRange = ranges[axisOrder[1]]
    const thisZRange = ranges[axisOrder[0]]

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

    const secondaryColor = useCSSVariable('--text-plot') //replace with needed variable
    const colorHex = useMemo(()=>{
        if (!secondaryColor){return}
        const col = new THREE.Color(secondaryColor) 
        return col.getHex()
    },[secondaryColor])

    const lineMat = useMemo(()=>new LineMaterial({color: colorHex ? colorHex : 0, linewidth: AXIS_CONSTANTS.LINE_WIDTH}),[colorHex])
    const tickLength = AXIS_CONSTANTS.TICK_LENGTH_FACTOR;

    const xTitleOffset = useMemo(() => (dimNames[shapeLength - 1].length * AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR / 2 + 0.1), [dimNames, shapeLength]);
    const yTitleOffset = useMemo(() => (dimNames[shapeLength - 2].length * AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR / 2 + 0.1), [dimNames, shapeLength]);
    const zTitleOffset = useMemo(() => (dimNames[shapeLength - 3].length * AXIS_CONSTANTS.TITLE_FONT_SIZE_FACTOR / 2 + 0.1), [dimNames, shapeLength]);

    const zScale = axisOrder[0] === 0 ? Math.max(axisShape[0] * 2, 2) : axisShape[0] * 2
    const zFlipped = axisFlipped[axisOrder[0]]
    const yFlipped = axisFlipped[axisOrder[1]]
    const xFlipped = axisFlipped[axisOrder[2]]

    const timeFront = zFlipped
        ? (thisZRange[flipX ? 0 : 1] * zScale + (flipX ? -tickLength : tickLength)) / 2
        : (thisZRange[flipX ? 0 : 1] * zScale + (flipX ? -tickLength : tickLength)) / 2
    const xFront = axisShape[2]*thisXRange[flipY ? 0 : 1] + (flipY ? -tickLength : tickLength) / 2
    const xBack =  axisShape[2]*thisXRange[flipY ? 1 : 0] + (flipY ? tickLength : -tickLength) / 2

  return (
    <group visible={plotType != 'sphere' && plotType != 'flat' && !hideAxis}>
        {/* Horizontal Group */} 
        <group position={[
            0, 
            axisShape[1] * (yFlipped ? -thisYRange[1] : thisYRange[0]),
            0]}>
            {/* X Axis */}
            <Axis 
                resolution={xResolution}
                setResolution={setXResolution}
                varName={dimNames[2]}
                units={dimUnits[2]}
                flip={flipX}
                range={thisXRange}
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
                shapeRatio={axisShape[2]}
                color={colorHex}
                anchorX='center'
                anchorY='top'
                tickLength={tickLength}
                tickRotations={[0, Math.PI]}
                titleOffset={xTitleOffset}
                hideAxisControls={hideAxisControls}
            />
            {/* Z Axis */}
            <Axis 
                resolution={zResolution}
                setResolution={setZResolution}
                varName={dimNames[0]}
                units={dimUnits[0]}
                flip={flipY}
                range={zFlipped ? thisZRange.map(i => -1*i) :thisZRange}
                lineMat={lineMat}
                axis={2}
                labels={dimSlices[0]}
                position={[xBack, 0, 0]}
                rotation={[0, 0, flipDown ? flipY ? -Math.PI/2 : Math.PI/2 : 0]}
                isVertical={false}
                shapeRatio={zScale / 2}
                color={colorHex}
                anchorX='center'
                anchorY='top'
                tickLength={tickLength}
                tickRotations={[-Math.PI/2, Math.PI/2]}
                titleOffset={-zTitleOffset}
                hideAxisControls={hideAxisControls}
            />
        </group>
        {/* Y Axis */}
        <Axis 
            resolution={yResolution}
            setResolution={setYResolution}
            varName={dimNames[1]}
            units={dimUnits[1]}
            flip={flipY}
            mirrorFlip={flipX}
            range={thisYRange}
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

export default VolumeAxis
