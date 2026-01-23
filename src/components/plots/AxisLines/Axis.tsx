import React, {useMemo} from 'react'
import { Text } from '@react-three/drei'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three-stdlib';
import { parseLoc } from '@/utils/HelperFuncs';

export const AXIS_CONSTANTS = {
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
    units: string,
    labels: number[],
    range: number[],
    resolution: number,
    setResolution: React.Dispatch<React.SetStateAction<number>>,
    axis: 0 | 1 | 2 // X, Y, Z
    position: [number, number, number],
    rotation: [number, number, number],
    flip: boolean,
    mirrorFlip?: boolean,
    isVertical?: boolean,
    shapeRatio?: number,
    scale?: number,
    tickLength: number,
    tickRotations: [number, number]
    titleOffset: number,
    lineMat: LineMaterial,
    color: number | undefined,
    anchorX: "center" | "left" | "right",
    anchorY: "bottom" | "top" | "top-baseline" | "middle" | "bottom-baseline"
    hideAxisControls:boolean,
}

export const Axis = ({
    resolution, setResolution, hideAxisControls, varName, range, scale=1, axis, lineMat, 
    tickLength, labels, color, rotation=[0, 0, 0], position=[0, 0, 0], titleOffset,
    anchorX, anchorY, units, flip, mirrorFlip, tickRotations, isVertical=false, shapeRatio=1
}: AxisType) => {

    const lineGeom = useMemo(() => {
        let positions = [0, 0, 0, 0, 0, 0]
        positions[axis] = range[0] *  shapeRatio - tickLength / 2
        positions[axis + 3] = range[1] *  shapeRatio + tickLength / 2
        const geom = new LineSegmentsGeometry().setPositions(positions);
        return new LineSegments2(geom, lineMat);
    }, [range, scale, tickLength, shapeRatio, lineMat])

    const tickLine = useMemo(()=> {
        const geom = new LineSegmentsGeometry().setPositions([0, 0, 0, 0, 0, tickLength]);
        return new LineSegments2(geom, lineMat)
    },[lineMat, tickLength])

    const dimScale = resolution/(resolution-1)
    const valDelta = (labels.length-1)/(resolution-1)

    let labelOffset = [0, 0, 0] //Offset of value next to Tick
    if (axis === 0)labelOffset[2] = flip ? -AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale : AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale
    else if (axis === 1) labelOffset[0] = flip ? -AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale : AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale
    else labelOffset[0] = flip ? AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale : -AXIS_CONSTANTS.TICK_LENGTH_FACTOR*scale

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
                return (
                    (((range[0] + 1)/2) <= (idx*dimScale)/resolution  &&
                    ((range[1] + 1)/2) >= (idx*dimScale)/resolution ) &&
                    <group  key={idx} position={tickPosition as [number, number, number]} >
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
                    </group>
                )
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