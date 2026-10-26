import { OrbitControls } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useState, useMemo, useEffect, useRef, Fragment } from 'react'
import { parseTimeUnit } from '@/lib/helpers'
import { useGlobalStore } from '@/stores/GlobalStore';
import { useShallow } from 'zustand/shallow'
import { useDimAxis, useValueScales } from '@/hooks'
import { CanvasText } from '../utils/CanvasText'

interface FixedTicksProps {
  colorTicks?: string;
  tickSize?: number;
  fontSize?: number;
  showGrid?: boolean;
  gridOpacity?: number;
  height:number,
  yScale:number,
  xScale:number,
}

// Shared <line> renderer: dashed for grid lines, solid for tick marks
function PlotLine({ points, dashed, colorTicks, gridOpacity }: {
  points: number[], dashed?: boolean, colorTicks: string, gridOpacity: number,
}) {
  return (
    <line>
      <bufferGeometry>
        <float32BufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points), 3]}
        />
      </bufferGeometry>
      {dashed
        ? <lineDashedMaterial color={colorTicks} opacity={gridOpacity} transparent dashSize={0.5} gapSize={0.5} />
        : <lineBasicMaterial color={colorTicks} />}
    </line>
  )
}

export function FixedTicks({
  colorTicks = 'grey',
  tickSize = 4,
  fontSize = 14,
  showGrid = true,
  gridOpacity = 0.5,
  height,
  yScale = 1,
  xScale=1,
}: FixedTicksProps) {
  const { camera, size } = useThree()
  // Single snapshot of the camera; anything that moves/zooms it re-renders the grid
  const [cam, setCam] = useState({ x: camera.position.x, y: camera.position.y, zoom: camera.zoom })
  const {dimCoords, plotDim} = useGlobalStore(useShallow(s => ({
    dimCoords: s.dimCoords, plotDim: s.plotDim
  })))
  const valueScales = useValueScales();
  const {xArray, yArray, zArray} = useDimAxis()
  const xDimArray = [zArray, yArray, xArray][plotDim]
  const xTickCount = 10;
  const yTickCount = 8;

  const xDimSize = xDimArray.length;
  const yDimSize = (valueScales.maxVal-valueScales.minVal)
  //Converts BigInt to DateTime

  const textArray = useMemo(()=>{
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (xDimArray){
      const firstID = Object.keys(dimCoords)[0]?? null
      const timeLike = firstID && dimCoords[firstID].plot.units.includes("since");
      if (timeLike){
        const [unit, offset] = parseTimeUnit(dimCoords[firstID].plot.units);
        const timeStrings = []
        for (let i = 0 ; i < xDimArray.length; i++){
          const timeStamp = Number(xDimArray[i])*unit
          const date = new Date(timeStamp+offset);
          const dateString = `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}\n${date.getFullYear()}`;
          timeStrings.push(dateString);
        }
        return timeStrings
      }
      return xDimArray.map(val => String(val))
    }
  },[xDimArray,dimCoords])

  useFrame(() => {
    if (camera.position.x !== cam.x || camera.position.y !== cam.y || camera.zoom !== cam.zoom) {
      setCam({ x: camera.position.x, y: camera.position.y, zoom: camera.zoom })
    }
  })

  // Must match the data coordinate system built in ThickLine/PlotPoints:
  // world x = (u - .5) * viewWidth * xScale, world y = (v - .5) * viewHeight * yScale
  const viewWidth = window.innerWidth
  const viewHeight = window.innerHeight - height

  const worldPerPx = 1 / cam.zoom
  const worldWidth = size.width * worldPerPx   // visible width in world units
  const worldHeight = size.height * worldPerPx // visible height in world units
  const tickLen = tickSize * worldPerPx        // tickSize px expressed in world units
  const labelFont = fontSize * worldPerPx      // fontSize px expressed in world units

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // @ts-expect-error why J?
  const cameraRef = useRef<OrbitControls | null>(null)

  return (
    <group >
      {showGrid && (
        <>
          {/* Vertical grid lines, fixed to the viewport */}
          {Array.from({ length: xTickCount }, (_, i) => {
            if (i === 0 || i === xTickCount-1) return null; // Skip edges
            const x = size.width*(i/(xTickCount-1)-.5)/cam.zoom + cam.x
            const normX = x/(viewWidth*xScale)+.5; // invert the data transform
            return (
              <Fragment key={`xtick-${i}`}>
                <group position={[x, cam.y, 0]}>
                  <PlotLine points={[0, worldHeight/2, 0, 0, -worldHeight/2, 0]} dashed colorTicks={colorTicks} gridOpacity={gridOpacity} />
                </group>
                <group position={[x, cam.y + worldHeight/2, 0]}>
                  <PlotLine points={[0, 0, 0, 0, -tickLen, 0]} colorTicks={colorTicks} gridOpacity={gridOpacity} />
                  <CanvasText
                    position={[0, -0.75*tickLen, 0]}
                    fontSize={labelFont}
                    color={colorTicks}
                    anchorX="center"
                    anchorY="top"
                  >
                    {textArray?.[Math.round(normX*(xDimSize-1))] ?? ''}
                  </CanvasText>
                </group>
              </Fragment>
            )
          })}

          {/* Horizontal grid lines, fixed to the viewport */}
          {Array.from({ length: yTickCount }, (_, i) => {
            if (i === 0 || i === yTickCount-1) return null; // Skip edges
            const y = size.height*(i/(yTickCount-1)-.5)/cam.zoom + cam.y
            const normY = y/(viewHeight*yScale)+.5; // invert the data transform
            return (
              <Fragment key={`ytick-${i}`}>
                <group position={[cam.x, y, 0]}>
                  <PlotLine points={[worldWidth/2, 0, 0, -worldWidth/2, 0, 0]} dashed colorTicks={colorTicks} gridOpacity={gridOpacity} />
                </group>
                <group position={[cam.x + worldWidth/2, y, 0]}>
                  <PlotLine points={[0, 0, 0, -tickLen, 0, 0]} colorTicks={colorTicks} gridOpacity={gridOpacity} />
                  <CanvasText
                    position={[-2*tickLen, 0, 0]}
                    fontSize={labelFont}
                    color={colorTicks}
                    anchorX="right"
                    anchorY="middle"
                  >
                    {(valueScales.minVal+(normY*yDimSize)).toFixed(1)}
                  </CanvasText>
                </group>
              </Fragment>
            )
          })}
        </>
      )}
      <OrbitControls
        ref={cameraRef}
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        zoomSpeed={0.85}
        maxDistance={500}
        maxZoom={20}
        minZoom={0.5}
      />
    </group>
  )
}
