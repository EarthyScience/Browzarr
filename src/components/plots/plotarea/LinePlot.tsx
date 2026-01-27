import { Canvas } from '@react-three/fiber'
import { parseLoc } from '@/utils/HelperFuncs'
import { FixedTicks, ThickLine } from '@/components/plots'
import {  RefObject, useEffect, useRef, useState } from 'react'
import { ResizeBar, YScaler, XScaler, ShowLinePlot } from '@/components/ui'
import './LinePlot.css'
import { useGlobalStore } from '@/GlobalStates'
import { useShallow } from 'zustand/shallow'
import PlotLineOptions from '@/components/ui/LinePlotArea/PlotLineOptions'
import { IoCloseCircleSharp } from "react-icons/io5";
import { FaThumbtack } from "react-icons/fa";

interface pointInfo{
  pointID:[string, number],
  pointLoc:number[],
  showPointInfo:boolean
  plotUnits:string
}
const MIN_HEIGHT = 10;

function PointInfo({pointID,pointLoc,showPointInfo, plotUnits}:pointInfo){
  const {plotDim, dimArrays, dimNames, dimUnits, timeSeries} = useGlobalStore(
    useShallow(state=>({
      plotDim:state.plotDim,
      dimArrays:state.dimArrays,
      dimNames:state.dimNames,
      dimUnits:state.dimUnits,
      timeSeries:state.timeSeries,
    }))
  );
  let pointY = 0;
  let pointX = 0;
  if (Object.entries(pointID).length > 0 && Object.entries(timeSeries).length > 0){
    const [tsID, idx] = pointID;
    pointY = timeSeries[tsID]['data'][idx];
    pointX = dimArrays[plotDim][idx];
  }

  const [divX,divY] = pointLoc;
  const [show,setShow] = useState(false);

  useEffect(()=>{
    if (!showPointInfo) {
      const timeout = setTimeout(() => {
        setShow(false);
      }, 100); // 0.1s delay
  
      return () => clearTimeout(timeout); // Cleanup timeout on re-renders
    }
    setShow(true)  
  },[showPointInfo])

  return(
    <>
     { show && <div className='point-info'
        style={{
          left:`${divX}px`,
          top:`${divY}px`
        }}
      >
        {`${pointY.toFixed(2)}${plotUnits}`}<br/>
        {`${dimNames[plotDim]}: ${parseLoc(pointX,dimUnits[plotDim])}       
        `}
      </div>}
    </>
  )
}

function PointCoords({open, height} : {open:boolean, height:number}){
  const {coords, timeSeries, setDimCoords, setTimeSeries} = useGlobalStore(useShallow(state=>({
    coords: state.dimCoords, 
    timeSeries: state.timeSeries, 
    setDimCoords: state.setDimCoords, 
    setTimeSeries: state.setTimeSeries}
  )))
  const [moving,setMoving] = useState<boolean>(false)
  const initialMouse = useRef<number[]>([0,Math.round(window.innerHeight*0.255)])
  const initialDiv = useRef<number[]>([0,Math.round(window.innerHeight*0.255)])
  const [xy, setXY] = useState<number[]>([0,Math.round(window.innerHeight*0.255)])

  function RemoveLine (keyID : string){
    const { [keyID]: _coord, ...rest } = coords;
    setDimCoords(rest);
    const { [keyID]: _ts, ...tsRest } = timeSeries;
    setTimeSeries(tsRest);
  };

  function handleDown(e: any){
    initialMouse.current = [e.clientX,e.clientY]
    initialDiv.current = [...xy]
    setMoving(true)
  }

  function handleMove(e: any){
    if (moving){
      const deltaX = initialMouse.current[0]-e.clientX
      const deltaY = initialMouse.current[1]-e.clientY
      const x = Math.min(Math.max(initialDiv.current[0]-deltaX,10),window.innerWidth-120)
      const y = Math.max(initialDiv.current[1]+deltaY,0) //Again hardcoded footer height
      setXY([Math.min(x,window.innerWidth-100),Math.min(y,window.innerHeight-100)])
    }
  }

  function handleUp(){
    setMoving(false)
  }
  useEffect(() => {
    if (moving) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [moving]);

  const moveLeft = xy[0] < window.innerWidth / 2;
  return(
    <>
    <div className='coord-container'
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={()=>setMoving(false)}  
      style={{
          left:`${xy[0]}px`,
          bottom:`${xy[1]}px`,
          transform: open ? '' : `translateX(${(moveLeft ? -1 : 1) * window.innerWidth}px) translateY(${-height}px)`  ,
          transition:'transform 0.5s ease',
        }}
    >
    { //Only show coords when coords exist
      Object.keys(coords).length > 0 && 
      Object.keys(coords).reverse().map((val,idx)=>(
        <div className='plot-coords'
        key={val}   
        style={{
          background: `rgb(${timeSeries[val]['color']})`,
          justifyContent:'space-between'
        }}
      >
        <b>{`${coords[val]['first'].name}: `}</b>
        {`${parseLoc(coords[val]['first'].loc,coords[val]['first'].units)}`}
        <br/>
        <b>{`${coords[val]['second'].name}: `}</b>
        {`${parseLoc(coords[val]['second'].loc,coords[val]['second'].units)}`}
        <IoCloseCircleSharp 
        onClick={()=>RemoveLine(val)}
          style={{
            cursor:'pointer',
            zIndex:3
          }}
          size={24}
        />
      </div>
      ))
      }
      </div>
    </>
  )
}

export function PlotArea() {
  const [pointID, setPointID] = useState<[string, number]>(['',0]);
  const [pointLoc, setPointLoc] = useState<number[]>([0,0])
  const [showPointInfo,setShowPointInfo] = useState<boolean>(false)
  const [height, setHeight] = useState<number>(Math.round(window.innerHeight-(window.innerHeight*0.25)))
  const {metadata, timeSeries} = useGlobalStore(useShallow(state=>({
    metadata: state.metadata,
    timeSeries: state.timeSeries
  })))
  const plotUnits = metadata ? (metadata as any).units : "Default"
  const [open, setOpen] = useState(true);
  const [pinned, setPinned] = useState<boolean>(false);
  const divRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<boolean>(false);

  const [yScale,setYScale] = useState<number>(1)
  const [xScale,setXScale] = useState<number>(1)

  const pointSetters ={
    setPointID,
    setPointLoc,
    setShowPointInfo,
  }
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      // Update height based on new viewport dimensions
      const newHeight = Math.round(window.innerHeight-(window.innerHeight*0.25));
      setHeight(newHeight);
      document.documentElement.style.setProperty('--plot-height', `${newHeight}px`);
    };

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    // Also listen for resize as a fallback
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Close on outside click (delayed and cancellable)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (divRef.current && !divRef.current.contains(e.target as Node) && 
          !menuRef.current &&
          !pinned) {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current)
        }
        closeTimeoutRef.current = setTimeout(() => {
          setOpen(false)
          closeTimeoutRef.current = null
        }, 100)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
    }
  }, [open, pinned])

  // Re-open on new transects AND cancel any pending close
  useEffect(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    if (!open) {
      setOpen(true)
    }
  }, [timeSeries])


  useEffect(() => {
    document.documentElement.style.setProperty('--plot-height', `${height}px`);
  }, [height]);

  return (
    <>
    {<ShowLinePlot onClick={()=>{setOpen(true)}}/>}
      <div ref={divRef} 
        className='plot-canvas'
        style={{
          transform: open ? '' : `translateY(${height}px)`,
        }}
      >
        <FaThumbtack 
          style={{
            position:'absolute',
            top:5,
            left:5,
            color: pinned ? '' : 'gray',
            zIndex:5,
            cursor:'pointer',
          }}
          onClick={()=>{setPinned(x=>!x)}}
          size={20}
        />
        <PlotLineOptions menuRef={menuRef}/>
        {showPointInfo && <PointInfo pointID={pointID} pointLoc={pointLoc} showPointInfo={showPointInfo} plotUnits={plotUnits}/>}
        <ResizeBar height={height} setHeight={setHeight}/> 
        <YScaler scale={yScale} setScale={setYScale} />
        <XScaler scale={xScale} setScale={setXScale} />
        <Canvas
          orthographic
          camera={{ position: [0, 0, 100] }}
          frameloop="demand"
        >
          <ThickLine height={height} yScale={yScale} pointSetters={pointSetters} xScale={xScale}/>
          <FixedTicks height={height} yScale={yScale} xScale={xScale}/>
        </Canvas>
        <PointCoords open={open} height={height}/>
      </div>
      
    </>
  )
}