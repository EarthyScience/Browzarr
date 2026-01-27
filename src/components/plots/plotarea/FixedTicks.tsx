import { Text, OrbitControls } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useState, useMemo, useEffect, useRef } from 'react'
import { parseTimeUnit } from '@/utils/HelperFuncs'
import { Fragment } from 'react'
import { useGlobalStore, usePlotStore } from '@/GlobalStates'
import { useShallow } from 'zustand/shallow'


interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

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
  const initSize = useRef(size)
  const [bounds, setBounds] = useState<ViewportBounds>({ left: 0, right: 0, top: 0, bottom: 0 })
  const {dimCoords, dimArrays, plotDim, valueScales} = useGlobalStore(
    useShallow(state=>({
      dimCoords:state.dimCoords,
      dimArrays:state.dimArrays,
      plotDim:state.plotDim,
      valueScales:state.valueScales
    })))
  const {zSlice, ySlice, xSlice} = usePlotStore(useShallow(state => ({
                zSlice: state.zSlice,
                ySlice: state.ySlice,
                xSlice: state.xSlice
      })))
  const dimSlices = [
    dimArrays[0].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
    dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
    dimArrays[2].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined),
  ]
  const coords = dimCoords
  const xDimArray = dimSlices[plotDim]
  const xTickCount = 10;
  const yTickCount = 8;

  const xDimSize = xDimArray.length;
  const yDimSize = (valueScales.maxVal-valueScales.minVal)
  //Converts BigInt to DateTime
 

  const textArray = useMemo(()=>{
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (xDimArray){
      const isBig = xDimArray.every(item => typeof item === "bigint");
      if (isBig){
        const check = Object.keys(coords).length > 0;
        const firstID = check ? Object.keys(coords)[0] : null
        const [unit, offset] = firstID ? parseTimeUnit(coords[firstID].plot.units) : [1, 0];
        const timeStrings = []
        for (let i = 0 ; i < xDimArray.length; i++){
          const timeStamp = Number(xDimArray[i])*unit
          // timeStrings.push(new Date(timeStamp).toDateString())
          const date = new Date(timeStamp+offset);
          // const dateString = date.toDateString().replace(/\s(\d{4})$/, '\n$1');
          const dateString = `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}\n${date.getFullYear()}`;
          // // timeStrings.push(dateString);
          timeStrings.push(dateString);
        }
        return timeStrings
      }
      return xDimArray.map(val => String(val))
    }
  },[xDimArray,coords])

  const [zoom, setZoom] = useState(camera.zoom)
  
  const sizes = useMemo(() => {
    // Convert from pixels to scene units
    const pixelsPerUnit = 1 / camera.zoom 
    return {
      tickSize: tickSize * pixelsPerUnit,
      fontSize: fontSize / pixelsPerUnit,
      labelOffset: tickSize * pixelsPerUnit
    }
  }, [camera.zoom, tickSize, fontSize])


  useFrame(() => {
    if (camera.zoom !== zoom) {
      setZoom(camera.zoom) 
    }
    const worldWidth = size.width / camera.zoom
    const worldHeight = size.height / camera.zoom
    const newBounds = {
      left: -worldWidth / 2 + camera.position.x,
      right: worldWidth / 2 + camera.position.x,
      top: worldHeight / 2 + camera.position.y,
      bottom: -worldHeight / 2 + camera.position.y
    }
    if (JSON.stringify(bounds) != JSON.stringify(newBounds)){ 
      setBounds(newBounds) //This was firing every frame. Changed to only fire if it's different
    }
  })


  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // @ts-expect-error why J?
  const cameraRef = useRef<OrbitControls | null>(null)

  //This reset the camera position when the window is rescaled
  useEffect(() => {
    // Clear existing timeout if height changes
    if (timeoutRef.current){
      clearTimeout(timeoutRef.current);
    }
    if (cameraRef.current){
          // Set a timeout for 0.1 seconds
      timeoutRef.current = setTimeout(() => {
      if (cameraRef.current) {
        cameraRef.current.reset();
      }
      }, 100);
    }
    // Cleanup timeout when component unmounts or height changes
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [height]);
  const vertY = (bounds.top+bounds.bottom)/2
  const horX = (bounds.left+bounds.right)/2 //Moved calcs here to reduce calcs
  const rescaleSizes = {
    width: initSize.current.width/size.width,
    height: initSize.current.height/size.height
  }
  return (
    <group >
      {/* Grid Lines */}
      {showGrid && (
        <>
          {/* Vertical grid lines */}
          {Array.from({ length: xTickCount }, (_, i) => {
            if (i === 0 || i === xTickCount-1) return null; // Skip edges
            const x = (size.width*(i / (xTickCount-1))-size.width/2 + camera.position.x)
            const normX = (x/(rescaleSizes.width))/xScale/size.width+.5;
            const y = vertY
            return (
              <Fragment key={`vert-group-${i}`}>
                <group position={[x,y,0]}>
                    <line key={`vgrid-${i}`} >
                      <bufferGeometry >
                        <float32BufferAttribute
                          attach="attributes-position"
                          args={[new Float32Array([
                            0, bounds.top-y, 0,
                            0, bounds.bottom-y, 0
                          ]), 3]}
                        />
                      </bufferGeometry >
                      <lineDashedMaterial 
                        color={colorTicks} 
                        opacity={gridOpacity} 
                        transparent 
                        dashSize={0.5}
                        gapSize={0.5}
                        
                      />
                    </line>
                </group>
                
                <group key={`top-tick-${i}`} position={[x, bounds.top, 0]}>
                  <line>
                    <bufferGeometry>
                      <float32BufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array([0, 0, 0, 0, -sizes.tickSize, 0]), 3]}
                      />
                    </bufferGeometry>
                    <lineBasicMaterial color={colorTicks} />
                  </line>

                  {/* Only show labels for non-edge ticks */}
                  {i !== 0 && i !== xTickCount-1 && (
                    <Text
                      position={[0, sizes.tickSize/4 - sizes.labelOffset, 0]}
                      fontSize={sizes.fontSize/zoom**2}
                      color={colorTicks}
                      anchorX="center"
                      anchorY="top"
                    >
                      {textArray?.[Math.round(normX*xDimSize-.5)] ?? ''}
                    </Text>
                  )}
                </group>
              </Fragment>
            )
          })}

          {/* Horizontal grid lines */}
          {Array.from({ length: yTickCount }, (_, i) => {
            if (i === 0 || i === yTickCount-1) return null; // Skip edges
            const y = (size.height*(i / (yTickCount-1))-size.height/2 + camera.position.y)
            const normY = (y/(rescaleSizes.height))/yScale/size.height+.5;
            const x = horX
            return (
              <Fragment key={`vert-group-${i}`}>
                <group key={`hgrid-${i}`} position={[x,y,0]}>
                  <line >
                    <bufferGeometry>
                      <float32BufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array([
                          bounds.left-x, 0, 0,
                          bounds.right-x, 0, 0
                        ]), 3]}
                      />
                    </bufferGeometry>
                    <lineDashedMaterial 
                      color={colorTicks} 
                      opacity={gridOpacity} 
                      transparent 
                      dashSize={0.}
                      gapSize={0.5}
                      linewidth={1}
                    />
                  </line>
                </group>
                <group key={`right-tick-${i}`} position={[bounds.right, y, 0]}>
                  <line>
                    <bufferGeometry>
                      <float32BufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array([0, 0, 0, -sizes.tickSize, 0, 0]), 3]}
                      />
                    </bufferGeometry>
                    <lineBasicMaterial color={colorTicks} />
                  </line>
                  {/* Only show labels for non-edge ticks */}
                  {i !== 0 && i !== yTickCount-1 && (
                    <Text
                      position={[-sizes.tickSize - sizes.labelOffset, 0, 0]}
                      fontSize={sizes.fontSize/zoom**2}
                      color={colorTicks}
                      anchorX="right"
                      anchorY="middle"
                    >
                      {(valueScales.minVal+(normY*yDimSize)).toFixed(1)}


                    </Text>
                  )}
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