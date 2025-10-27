"use client";
import React, {useState, useEffect} from 'react'
import { useAnalysisStore, useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import '../css/MainPanel.css'
import { useShallow } from 'zustand/shallow';
import { Slider as UISlider } from '@/components/ui/slider';
import { SliderThumbs } from '@/components/ui/SliderThumbs';
import { Button } from '../button';
import { LuSettings } from "react-icons/lu";
import { RxReset } from "react-icons/rx";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from '../input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { parseLoc } from '@/utils/HelperFuncs';
import { BsFillQuestionCircleFill } from "react-icons/bs";


function DeNorm(val : number, min : number, max : number){
    const range = max-min;
    return val*range+min;
}

function Norm(val : number, min : number, max : number){
    const range = max-min;
    return (val-min)/range;
}

const MinMaxSlider = React.memo(function MinMaxSlider({range, setRange, valueScales, min=-1, array, units} : 
    {
        range : number[], 
        setRange : (value: number[]) => void, 
        valueScales : {minVal : number, maxVal  : number},
        min?: number,
        array?: number[],
        units?: string
    }){
        let {minVal, maxVal} = valueScales;
        minVal = Number(minVal)
        maxVal = Number(maxVal)
        let [trueMin, trueMax] = [min, 1]
        if (array){
            const size = array.length
            const minIdx = Math.round(Norm(range[0], min, 1) * size)
            const maxIdx = Math.round(Norm(range[1], min, 1) * size)
            trueMin = array[minIdx]
            trueMax = array[maxIdx-1]
        }
        else {
            trueMin = Math.round(DeNorm(range[0], minVal, maxVal)*100)/100
            trueMax = Math.round(DeNorm(range[1], minVal, maxVal)*100)/100
        }

    return(
        <div className='w-full flex justify-between flex-col'>
            <SliderThumbs
                min={min}
                max={1}
                value={range}
                step={0.01}
                onValueChange={(values: number[]) => setRange(values)}
            />

        {/* Min/Max labels */}
            <div className="flex justify-between text-xs mt-2 mb-2">
                <span>Min: {parseLoc(trueMin, units)}</span>
                <span>Max: {parseLoc(trueMax, units)}</span>
            </div>
        </div>

    )
})

const DimSlicer = () =>{
  const {valueRange, xRange, yRange, zRange, setValueRange, setXRange, setYRange, setZRange} = usePlotStore(useShallow(state => ({
          valueRange: state.valueRange,
          xRange: state.xRange,
          yRange: state.yRange,
          zRange: state.zRange,
          setValueRange: state.setValueRange,
          setXRange: state.setXRange,
          setYRange: state.setYRange,
          setZRange: state.setZRange,
      })))

      const defaultScales = {minVal: 0, maxVal: 0} //This is fed into MinMax as it is required but overwritten if an array is present
  
      const {valueScales, dimArrays, dimNames, dimUnits, is4D} = useGlobalStore(useShallow(state => ({
        valueScales : state.valueScales, 
        dimArrays : state.dimArrays, 
        dimNames: state.dimNames,
        dimUnits: state.dimUnits,
        is4D: state.is4D
      })))

      const theseDims = is4D ? dimNames.slice(1) : dimNames
      const theseUnits = is4D ? dimUnits.slice(1) : dimUnits
  return (
    <>
    
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center w-[200px] gap-4">
        <b>Value Cropping</b>
        <MinMaxSlider 
          range={valueRange} 
          setRange={setValueRange} 
          valueScales={valueScales} 
          min={0} 
        />
      </div>

      <div className="flex flex-col items-center w-[200px] gap-2 -mt-4">
        <b>Spatial Cropping</b>
        <div className='grid w-[100%]'>
          <div className='grid w-[100%] place-items-center'>
            <h2>{theseDims[2]}</h2>
            <MinMaxSlider 
              range={xRange} 
              setRange={setXRange} 
              valueScales={defaultScales} 
              array={dimArrays[2]} 
              units={theseUnits[2]}
            />
          </div>
          <div className='grid w-[100%] place-items-center'>
            <h2>{theseDims[1]}</h2>
            <MinMaxSlider 
            range={yRange} 
            setRange={setYRange} 
            valueScales={defaultScales} 
            array={dimArrays[1]} 
            units={theseUnits[1]}
            />
          </div>
          <div className='grid w-[100%] place-items-center'>
            <h2>{theseDims[0]}</h2>
            <MinMaxSlider 
              range={zRange} 
              setRange={setZRange} 
              valueScales={defaultScales} 
              array={dimArrays[0]} 
              units={theseUnits[0]}
            />
          </div>
        </div>
      </div>
    </div>
    <div className="border-t border-gray-300 w-full my-4" />
    </>
  )
}

const VolumeOptions = ()=>{
  const { useFragOpt, quality, transparency, vTransferRange, vTransferScale, setQuality, setUseFragOpt, setTransparency, setVTransferRange, setVTransferScale} = usePlotStore(useShallow(state => ({
          useFragOpt: state.useFragOpt,
          quality: state.quality,
          transparency: state.transparency,
          nanTransparency: state.nanTransparency,
          nanColor: state.nanColor,
          vTransferRange: state.vTransferRange,
          vTransferScale: state.vTransferScale,
          setQuality: state.setQuality,
          setUseFragOpt: state.setUseFragOpt,
          setTransparency: state.setTransparency,
          setNanTransparency: state.setNanTransparency,
          setNanColor: state.setNanColor,
          setVTransferRange: state.setVTransferRange,
          setVTransferScale: state.setVTransferScale
      })))
  return(
    <>
    
    <div className='grid gap-y-[5px] items-center w-50 text-center'>
      <b>Quality</b>
      <div className='w-full flex justify-between text-xs items-center gap-2'>
          Worse
          <UISlider
              min={50}
              max={1000}
              step={50}
              value={[quality]}
              className='flex-1 mb-2'
              onValueChange={(vals:number[]) => setQuality(vals[0])}
          />
          Better
      </div>
      <Tooltip delayDuration={500} >
        <TooltipTrigger asChild>
          <Button variant="pink" size="sm" className="w-[100%] cursor-[pointer] mb-2 mt-2" onClick={() => setUseFragOpt(!useFragOpt)}>
            {useFragOpt ? "Revert to Normal" : "Use Optimized Shader"}
          </Button>
        </TooltipTrigger>
        <TooltipContent side='left'>
          Enable this for better performance while navigating. Switch back for exports or still images. 
        </TooltipContent>
      </Tooltip>
      
      <b>Transparency</b>
      <UISlider
              min={0}
              max={10}
              step={0.2}
              value={[transparency]}
              className='w-full mb-2'
          onValueChange={(vals:number[]) => setTransparency(vals[0])}
      />
      <div className='grid grid-cols-[auto_60px] items-center text-left'>
        <h1><span>Transparency Scale </span> 
        <Tooltip>
          <TooltipTrigger>
            <BsFillQuestionCircleFill/>
          </TooltipTrigger>
          <TooltipContent className="max-w-60 break-words whitespace-normal">
            {`This is the raised power for transparency. Higher values "Squash" lower values while lower values help bring them out. 1 is linear.`}  
          </TooltipContent>
        </Tooltip>
        </h1>
        <Input type='number' value={vTransferScale} step={0.1} min={0} onChange={e => setVTransferScale(parseFloat(e.target.value))} />
      </div>
      <div className="grid grid-cols-[auto_20%] items-center gap-2 mt-2 text-left">
        <label htmlFor="compress-data"> 
          <h1> <span>Scale by clip </span> 
            <Tooltip>
              <TooltipTrigger>
                <BsFillQuestionCircleFill/>
              </TooltipTrigger>
              <TooltipContent className="max-w-60 break-words whitespace-normal">
                Transparency is scaled from dataset minimum to maximum. Lower values are more transparent. When enabled - transparency scales based on the cropped values below. 
              </TooltipContent>
            </Tooltip>
          </h1> 
        </label>
        <Input className='h-5' type="checkbox" id="compress-data" checked={vTransferRange} onChange={e=>setVTransferRange(e.target.checked)}/>
      </div>
      
    </div>

    <div className="border-t border-gray-300 w-full my-4" />
    </>
  )
}

const PointOptions = () =>{
  const {setPointSize, setScaleIntensity, setScalePoints, setTimeScale} = usePlotStore(useShallow(
          (state => ({
              setPointSize: state.setPointSize, 
              setScaleIntensity: state.setScaleIntensity, 
              setScalePoints: state.setScalePoints,
              setTimeScale: state.setTimeScale,
          }))))
  
      const {scalePoints, scaleIntensity, pointSize, timeScale} = usePlotStore(useShallow(state => ({
        scalePoints: state.scalePoints,
        scaleIntensity: state.scaleIntensity,
        pointSize: state.pointSize,
        timeScale: state.timeScale,
      })))

  return(
    <>
    
    <div className='flex-column items-center w-50 text-center'>
          <b>Point Size</b>
          <UISlider
              className='w-full mb-4 mt-2'
              min={1}
              max={50}
              step={1}
              value={[pointSize]}
          onValueChange={(vals:number[]) => setPointSize(vals[0])}
          />
      <Button variant="pink" size="sm" className="w-[100%] cursor-[pointer] mb-2 mt-2" onClick={() => setScalePoints(!scalePoints)}>{scalePoints ? "Remove Scaling" : "Scale By Value" }</Button>
      {scalePoints && 
      <><b>Scale Intensity</b>
      <UISlider
          className='w-full mb-2 mt-2'
          min={1}
          max={100}
          step={1}
          value={[scaleIntensity]}
      onValueChange={(vals:number[]) => setScaleIntensity(vals[0])}
      /></>}
      <div className='relative'>
        {timeScale != 1 && <RxReset className='text-lg cursor-pointer absolute top-0 left-0 hover:scale-90 transition-transform duration-100 ease-out' onClick={e=> setTimeScale(1)}/>}
        <b>Resize Time Dimension</b>
      </div>
      
        <UISlider
            className='w-full mb-2 mt-2'
            min={0.05}
            max={5}
            step={0.05}
            value={[timeScale]}
        onValueChange={(vals:number[]) => setTimeScale(vals[0])}
        />
    </div>
    <div className="border-t border-gray-300 w-full my-4" />
    </>
  )
}

const SphereOptions = () =>{
  const {sphereResolution, sphereDisplacement, displaceSurface, 
    setSphereResolution, setSphereDisplacement, setDisplaceSurface} = usePlotStore(useShallow(state => ({
    sphereResolution: state.sphereResolution,
    sphereDisplacement: state.sphereDisplacement,
    displaceSurface: state.displaceSurface,
    setSphereResolution: state.setSphereResolution,
    setSphereDisplacement: state.setSphereDisplacement,
    setDisplaceSurface: state.setDisplaceSurface
  })))
  const maxSurfaceDisp = 2;
  const maxFaceDisplacement = 15*maxSurfaceDisp; 

  return(<>
  <div className='grid gap-y-[5px] items-center w-50 text-center'>
    <b>Displacement Mode</b>
    <div 
      className='relative w-full h-10 bg-gray-200 rounded-full cursor-pointer mb-2 flex items-center justify-between px-4'
      onClick={() => {setDisplaceSurface(!displaceSurface); setSphereDisplacement(sphereDisplacement * (displaceSurface ? maxFaceDisplacement/maxSurfaceDisp : maxSurfaceDisp/maxFaceDisplacement))}}  
    >
      <span className={`z-10 font-semibold transition-colors ${displaceSurface ? 'text-primary' : 'text-secondary'}`}>
        Surface
      </span>
      <span className={`z-10 font-semibold transition-colors ${!displaceSurface ? 'text-primary' : 'text-secondary'}`}>
        Faces
      </span>
      <div 
        className={`absolute top-1 h-8 w-[calc(50%-8px)] bg-secondary shadow-xs hover:bg-secondary/80 rounded-full transition-all duration-300 ${
          displaceSurface ? 'left-1' : 'left-[calc(50%+4px)]'
        }`}
      />
    </div>
    <b>Displace Surface</b>
    <UISlider
      min={0}
      max={displaceSurface ? maxSurfaceDisp : maxFaceDisplacement}
      step={0.2}
      value={[sphereDisplacement]}
      className='w-full mb-2'
      onValueChange={(vals:number[]) => (setSphereDisplacement(vals[0]))}
    />
    
    {displaceSurface && <>
      <b>Displacement Resolution</b>
      <UISlider
        min={4}
        max={100}
        step={4}
        value={[sphereResolution]}
        className='w-full mb-2'
        onValueChange={(vals:number[]) => (setSphereResolution(vals[0]))}
      />
    </>}
  </div>
  </>)
}

const SpatialExtent = () =>{

  const {lonExtent, latExtent, lonResolution, latResolution, originalExtent,
        setLonExtent, setLatExtent, setLonResolution, setLatResolution} = usePlotStore(useShallow(state => ({
    lonExtent: state.lonExtent,
    latExtent: state.latExtent,
    lonResolution: state.lonResolution,
    latResolution: state.latResolution,
    originalExtent: state.originalExtent,
    setLonExtent: state.setLonExtent,
    setLatExtent: state.setLatExtent,
    setLonResolution: state.setLonResolution,
    setLatResolution: state.setLatResolution
  })))
  return (
    <div className='grid gap-2 mb-4 justify-items-center '>
      <h1>Spatial Extent</h1>
      <div className="border-t border-gray-300 w-full" />
      
      <div className='flex justify-between'>
        <div className='flex-col justify-items-center'>
          <h2>Min Lon</h2>
          <Input value={lonExtent[0]} onChange={e=>setLonExtent([parseFloat(e.target.value), lonExtent[1]])} type='number'/>
        </div>
        <div className='flex-col justify-items-center'>
          <h2>Max Lon</h2>
          <Input  value={lonExtent[1]} onChange={e=>setLonExtent([lonExtent[0], parseFloat(e.target.value)])} type='number'/>
        </div>
      </div>
      <div className='flex justify-between'>
        <div className='flex-col justify-items-center'>
          <h2>Min Lat</h2>
          <Input value={latExtent[0]} onChange={e=>setLatExtent([parseFloat(e.target.value), latExtent[1]])} type='number'/>
        </div>
        <div className='flex-col justify-items-center'>
          <h2>Max Lat</h2>
          <Input value={latExtent[1]} onChange={e=>setLatExtent([latExtent[0], parseFloat(e.target.value)])} type='number'/>
        </div>
      </div>
      <div className='flex justify-between'>
        <div className='flex-col justify-items-center'>
          <h2>Lon Resolution</h2>
          <Input value={lonResolution} onChange={e=>setLonResolution(parseFloat(e.target.value))} type='number'/>
        </div>
        <div className='flex-col justify-items-center'>
          <h2>Lat Resolution</h2>
          <Input value={latResolution} onChange={e=>setLatResolution(parseFloat(e.target.value))} type='number'/>
        </div>
      </div>
      
      <Button variant='pink'
        disabled={
          originalExtent.toArray().slice(0,2).every((val, idx) => val == lonExtent[idx]) &&
          originalExtent.toArray().slice(2).every((val, idx) => val == latExtent[idx])
        }
        onClick={e=>{
          setLonExtent([originalExtent.x, originalExtent.y])
          setLatExtent([originalExtent.z, originalExtent.w])
        }}
      > Reset Extent </Button>
    </div>
  )
}

const GlobalOptions = () =>{
  const {showBorders, borderColor, nanColor, nanTransparency, plotType, setShowBorders, setBorderColor, setNanColor, setNanTransparency} = usePlotStore(useShallow(state => ({
    showBorders: state.showBorders,
    borderColor: state.borderColor,
    nanColor: state.nanColor,
    nanTransparency: state.nanTransparency,
    plotType: state.plotType,
    setShowBorders: state.setShowBorders,
    setBorderColor: state.setBorderColor,
    setNanColor: state.setNanColor,
    setNanTransparency: state.setNanTransparency
  })))
  const {analysisMode, axis} = useAnalysisStore(useShallow(state =>({
    analysisMode: state.analysisMode,
    axis: state.axis
  })))

  const isPC = plotType == 'point-cloud'
  return (
    <div className='grid gap-y-[5px] items-center w-50 text-center'>
      {!isPC &&
        <>
      <b>NaN Transparency</b>
      <UISlider
              min={0}
              max={1}
              step={0.05}
              value={[nanTransparency]}
              className='w-full mb-2'
          onValueChange={(vals:number[]) => setNanTransparency(vals[0])}
          />
        <b>NaN Color</b>
      <input type="color"
      className='w-[100%] cursor-pointer'
              value={nanColor}
          onChange={e => setNanColor(e.target.value)}
          />
      </>}
      {!(analysisMode && axis != 0) && // Hide if Analysismode and Axis != 0
      <>
        <Button variant="pink" size="sm" className="w-[100%] cursor-[pointer] mb-2 mt-2" onClick={() => setShowBorders(!showBorders)}>{showBorders ? "Hide Borders" : "Show Borders" }</Button>
        {showBorders && 
          <div>
          <b>Border Color</b>
          <input type="color"
              className='w-[100%] cursor-pointer'
                  value={borderColor}
              onChange={e => setBorderColor(e.target.value)}
              />
          </div>
        }</>
      }
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="pink" size="sm" className='w-[100%] cursor-pointer mb-2'>
            Adjust Extent
          </Button>
        </PopoverTrigger>
        <PopoverContent className="overflow-y-auto p-2 w-[280px] max-h-[70vh]">
          <SpatialExtent/>
        </PopoverContent>
      </Popover>
    </div>
  )
}


const AdjustPlot = () => {
    const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");

    const {plotOn} = useGlobalStore(
        useShallow(state=>({
          plotOn: state.plotOn,
        })))
    const {plotType} = usePlotStore(
        useShallow(state=> ({
          plotType: state.plotType,
        })))
    

  useEffect(() => {
      const handleResize = () => {
        setPopoverSide(window.innerWidth < 768 ? "top" : "left");
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

  const enableCond = (plotOn)
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <div style={enableCond ? {} : { pointerEvents: 'none' } }>
            <Tooltip delayDuration={500} >
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
                    style={{
                      color: enableCond ? '' : 'var(--text-disabled)'
                    }}
                  >
                    <LuSettings className="size-8" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side={popoverSide === "left" ? "left" : "top"}
                align={popoverSide === "left" ? "start" : "center"}
              >
                <span>Plot Settings</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </PopoverTrigger>
        <PopoverContent
          side={popoverSide}
          className={`overflow-y-auto w-[240px] mt-2 mr-1 ${
            popoverSide === 'top'
              ? 'max-h-[80vh] mb-1' 
              : 'max-h-[70vh]'
          }`}
        >
          {plotType === 'volume' && <VolumeOptions />}
          {plotType === 'point-cloud' && <PointOptions />}
          {plotType === 'sphere' && <SphereOptions/>}
          {(plotType === 'volume' || plotType === 'point-cloud') && <DimSlicer />}
          <GlobalOptions />
        </PopoverContent>
      </Popover>
    </>
  )
}

export default AdjustPlot
