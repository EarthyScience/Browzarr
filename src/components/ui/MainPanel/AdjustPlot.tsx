"use client";
import React, {useState, useEffect, useRef, useCallback} from 'react'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import '../css/MainPanel.css'
import { useShallow } from 'zustand/shallow';
import { SliderThumbs } from '@/components/ui/Widgets/SliderThumbs';
import { RxReset } from "react-icons/rx";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input, Switch, Hider, Button, Slider as UISlider, Switcher, Slider, QuickTip } from '@/components/ui';
import { parseLoc, normalize, denormalize } from '@/utils/HelperFuncs';
import { BsFillQuestionCircleFill } from "react-icons/bs";
import { ChevronDown } from 'lucide-react';
import {Select, SelectTrigger, SelectContent, SelectItem, SelectValue} from '@/components/ui'
import { RiCloseLargeLine } from "react-icons/ri";
import { Reprojection } from '../Elements/Reprojection';
import { useAxisIndices, useDimAxis } from '@/hooks';
import { FaLongArrowAltUp } from "react-icons/fa";
import { HiAdjustmentsHorizontal } from "react-icons/hi2";

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
  const {xRange, yRange, zRange, setXRange, setYRange, setZRange} = usePlotStore(useShallow(s => s))

      const defaultScales = {minVal: 0, maxVal: 0} //This is fed into MinMax as it is required but overwritten if an array is present
      const {xArray, yArray, zArray} = useDimAxis()
      const {axisDimArrays, axisDimNames, axisDimUnits} = useGlobalStore(useShallow(s => s))
      const {xIdx, yIdx, zIdx} = useAxisIndices()
      const [isSpatialOpen, setIsSpatialOpen] = useState(false);
  return (
    <>
    
    <div className="flex flex-col gap-6">
      <div className="flex flex-col w-[200px] -mt-4">
        <button 
          onClick={() => setIsSpatialOpen(!isSpatialOpen)}
          className="flex items-center gap-2 w-full mb-2"
        >
          <b>Axis Cropping</b>
          <ChevronDown 
            className={`h-4 w-4 transition-transform duration-200 ${
              !isSpatialOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div 
          className="grid transition-all duration-300 ease-in-out"
          style={{
            gridTemplateRows: isSpatialOpen ? '1fr' : '0fr',
          }}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col items-center gap-2">
              <div className='grid w-[100%] place-items-center'>
                <h2>{axisDimNames[xIdx]}</h2>
                <MinMaxSlider 
                  range={xRange} 
                  setRange={setXRange} 
                  valueScales={defaultScales} 
                  array={xArray} 
                  units={axisDimUnits[xIdx]}
                />
              </div>
              <div className='grid w-[100%] place-items-center'>
                <h2>{axisDimNames[yIdx]}</h2>
                <MinMaxSlider 
                range={yRange} 
                setRange={setYRange} 
                valueScales={defaultScales} 
                array={yArray} 
                units={axisDimUnits[yIdx]}
                />
              </div>
              <div className='grid w-[100%] place-items-center'>
                <h2>{axisDimNames[zIdx]}</h2>
                <MinMaxSlider 
                  range={zRange} 
                  setRange={setZRange} 
                  valueScales={defaultScales} 
                  array={zArray} 
                  units={axisDimUnits[zIdx]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

const VolumeOptions = ()=>{
  const { useRayMarch, quality, transparency, vTransferRange, vTransferScale, interpPixels, revTransparency,
    setQuality, setUseRayMarch, setTransparency, setVTransferRange, setVTransferScale, setRevTransparency} = usePlotStore(useShallow(s => s))
  useEffect(()=>{
    if (!useRayMarch && interpPixels) setUseRayMarch(true)
  }, [interpPixels, useRayMarch])
  return(
    <>
    <div className='grid gap-y-[5px] items-center w-50 text-center mb-8'>
      <b className='flex justify-center'>Renderer
        <QuickTip message={<div className='flex flex-col'>
          <span>Change between DDA or Raymarching render method.</span>
          <span>DDA is more performant than Raymarching and doesn't produce artifacts.</span>
          <span>Raymarching can interpolate and show smoother animations</span>
        </div>}>
          <BsFillQuestionCircleFill/>
        </QuickTip>

      </b>
      <Hider show={useRayMarch}>
        <b className='flex pb-1 justify-center font-mono'>Quality 
          <QuickTip message='Increase the accuracy of Raymarching steps. Reduces performance'>
            <BsFillQuestionCircleFill/>
          </QuickTip>
        </b>

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
      </Hider>
      <Switcher className={interpPixels ? 'opacity-40 !cursor-default' : undefined} leftText='DDA' rightText='Raymarch' state={!useRayMarch} onClick={()=> setUseRayMarch(!useRayMarch)}/>
      <div className='grid grid-cols-3 justify-between place-items-center'>
        <b>Transparency</b>
        <Button
          variant='ghost'
          className='px-0 w-10'
          onClick={()=>setRevTransparency(!revTransparency)}
        >
          <FaLongArrowAltUp 
            style={{
              rotate:revTransparency ? '180deg' : '',
              transition:'0.2s'
            }}
            size={20}
          />
        </Button>
        <QuickTip message='Choose whether to clip higher or lower values first.'>
            <Button 
              variant={'outline'}
              className='px-2'
              onClick={()=>setRevTransparency(!revTransparency)}
            >
              <span className='text-justify'>{`${revTransparency ? 'High' : 'Low'} clip`}</span>
          </Button>
        </QuickTip>
        
      </div>
      
      <UISlider
              min={0}
              max={10}
              step={0.2}
              value={[transparency]}
              className='w-full mb-2'
          onValueChange={(vals:number[]) => setTransparency(vals[0])}
      />
      <div className='grid grid-cols-[auto_60px] items-center text-left'>
        <h1 className='flex'><span>Transparency Scale </span> 
        <QuickTip message='This is the raised power for transparency. Higher values "Squash" lower values while lower values help bring them out. 1 is linear.'>
          <BsFillQuestionCircleFill/>
        </QuickTip>
        </h1>
        <Input type='number' value={vTransferScale} step={0.1} min={0} onChange={e => setVTransferScale(parseFloat(e.target.value))} />
      </div>
      <div className="grid grid-cols-[auto_20%] items-center gap-2 mt-2 text-left">
        <label htmlFor="compress-data"> 
          <h1 className='flex'> <span>Scale by clip </span> 
            <QuickTip 
              className='max-w-80'
              message='Transparency is scaled from dataset minimum to maximum. Lower values are more transparent. When enabled - transparency scales based on the cropped values below. '>
              <BsFillQuestionCircleFill/>
            </QuickTip>
          </h1> 
        </label>
        <Switch className='h-5 cursor-pointer'  id="compress-data" checked={vTransferRange} onCheckedChange={e=>setVTransferRange(e)}/>
      </div>
      
    </div>
    </>
  )
}

const PointOptions = () =>{
  const {setPointSize, setScaleIntensity, setScalePoints, setTimeScale} = usePlotStore(useShallow(s => s))
  const {scalePoints, scaleIntensity, pointSize, timeScale, disablePointScale} = usePlotStore(useShallow(s => s))

  return(
    <>
    <div className='flex-column items-center w-50 text-center mb-8'>
          <b>Point Size</b>
          <UISlider
              className='w-full mb-4 mt-2'
              min={1}
              max={50}
              step={1}
              value={[pointSize]}
              disabled={disablePointScale}
          onValueChange={(vals:number[]) => setPointSize(vals[0])}
          />
      <Button variant="pink" size="sm" className="w-[100%] cursor-[pointer] mb-2 mt-2" disabled={disablePointScale} onClick={() => setScalePoints(!scalePoints)}>
        {scalePoints ? "Remove Scaling" : "Scale By Value" }
      </Button>

      <Button variant="pink" size="sm" className="w-[100%] cursor-[pointer] mb-2 mt-2" onClick={() => usePlotStore.setState({disablePointScale: !disablePointScale})}>
        {disablePointScale ? "Enable Scaling" : "Disable Scaling" }
      </Button>
      <Hider show={scalePoints}>
        <><b>Scale Intensity</b>
        <UISlider
            className='w-full mb-2 mt-2'
            min={1}
            max={100}
            step={1}
            value={[scaleIntensity]}
        onValueChange={(vals:number[]) => setScaleIntensity(vals[0])}
        /></>
      </Hider>
      <div className='relative'>
        {timeScale != 1 && <RxReset className='text-lg cursor-pointer absolute top-0 left-0 hover:scale-90 transition-transform duration-100 ease-out' onClick={()=> setTimeScale(1)}/>}
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
    </>
  )
}

const FlatOptions = () =>{
  const {displacement, displaceFaces, offsetNegatives, rotateFlat,
    setDisplacement, setDisplaceFaces, setOffsetNegatives,
    setResetCamera} = usePlotStore(useShallow(s => s))
   return(
   <>
   
   <div className='grid gap-2 mb-2'>
    <Switcher leftText='Flat' rightText='Displace' state={!displaceFaces} onClick={()=>{
      if (displaceFaces){setResetCamera(!usePlotStore.getState().resetCamera)}; setDisplaceFaces(!displaceFaces); usePlotStore.setState({rotateFlat: false}) }} 
    />
    <Hider show={displaceFaces}>
      <div className='grid gap-2'>
        <b>Displacement</b>
        <UISlider
          min={0}
          max={100}
          step={2}
          value={[displacement]}
          className='w-full mb-2'
          onValueChange={(vals:number[]) => (setDisplacement(vals[0]))}
        />
        <div className='grid grid-cols-[auto_20%] items-center gap-2 text-left'>
          <label htmlFor="offset-switch"><b>Offset Negatives</b></label>
          <Switch id='offset-switch' checked={offsetNegatives} onCheckedChange={e=>setOffsetNegatives(e)} />

          <label htmlFor="rotate-switch"><b>Rotate</b></label>
          <Switch id='rotate-switch' checked={rotateFlat} onCheckedChange={e=>usePlotStore.setState({rotateFlat: e})} />
        </div>
      </div>
    </Hider>
    </div>
   </>
   )
}

const SphereOptions = () =>{
  const {sphereResolution, displacement, displaceFaces, offsetNegatives,
    setSphereResolution, setDisplacement, setDisplaceFaces, setOffsetNegatives} = usePlotStore(useShallow(s => s))
  const maxSurfaceDisp = 2;
  const maxFaceDisplacement = 15*maxSurfaceDisp; 

  return(<>
  <div className='grid gap-y-[5px] items-center w-50 text-center mb-2'>
    <b>Displacement Mode</b>
    <Switcher 
      leftText='Surface' 
      rightText='Faces' state={!displaceFaces} 
      onClick={() => {
        setDisplaceFaces(!displaceFaces); 
        setDisplacement(displacement * (!displaceFaces ? maxFaceDisplacement/maxSurfaceDisp : maxSurfaceDisp/maxFaceDisplacement))}}
    />
    
    <b>Displacement</b>
    <UISlider
      min={0}
      max={!displaceFaces ? maxSurfaceDisp : maxFaceDisplacement}
      step={0.2}
      value={[displacement]}
      className='w-full mb-2'
      onValueChange={(vals:number[]) => (setDisplacement(vals[0]))}
    />
    <Hider show={displaceFaces}>
        <div className='grid grid-cols-[auto_20%] items-center gap-2 text-left'>
          <label htmlFor="offset-switch">Offset Negatives</label>
          <Switch id='offset-switch' checked={offsetNegatives} onCheckedChange={e=>setOffsetNegatives(e)} />
      </div>
    </Hider>
    <Hider show={!displaceFaces}>
        <b>Displacement Resolution</b>
        <UISlider
          min={4}
          max={100}
          step={4}
          value={[sphereResolution]}
          className='w-full mb-2'
          onValueChange={(vals:number[]) => (setSphereResolution(vals[0]))}
        />
    </Hider>
  </div>
  </>)
}

const SpatialExtent = () =>{
  const {lonExtent, latExtent, lonResolution, latResolution, originalExtent,
        setLonExtent, setLatExtent, setLonResolution, setLatResolution} = usePlotStore(useShallow(s => s))
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
          originalExtent.slice(0,2).every((val, idx) => val == lonExtent[idx]) &&
          originalExtent.slice(2).every((val, idx) => val == latExtent[idx])
        }
        onClick={()=>{
          setLonExtent([originalExtent[0], originalExtent[1]])
          setLatExtent([originalExtent[2], originalExtent[3]])
        }}
      > Reset Extent </Button>
    </div>
  )
}

const GlobalOptions = () =>{
  const {valueRange, showBorders, borderWidth, borderColor, nanColor, nanTransparency, plotType, interpPixels, fillValue, useBorderTexture,
    setValueRange, setShowBorders, setBorderColor, setNanColor, setNanTransparency, setInterpPixels, setFillValue} = usePlotStore(useShallow(s => s))
  const {analysisMode, axis} = useAnalysisStore(useShallow(s => s))
  const {valueScales, borderCompatible} = useGlobalStore(useShallow(s => ({valueScales: s.valueScales, borderCompatible: s.borderCompatible})))
  const [thisFillVal, setThisFillValue] = useState(denormalize(fillValue, valueScales.minVal, valueScales.maxVal))
  const [showMasks, setShowMasks] = useState(false)
  const masks = ["None", "Land", "Water"]
  const isPC = plotType == 'point-cloud'

  const throttleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef(borderColor);

  const handleColorChange = useCallback((setter: (color:string) => void)=>(e: React.ChangeEvent<HTMLInputElement>) => {
    latestValue.current = e.target.value;

    if (throttleTimeout.current) return; // already scheduled

    throttleTimeout.current = setTimeout(() => {
      setter(latestValue.current);
      throttleTimeout.current = null;
    }, 100);
  }, []);

  return (
    <div className='grid gap-y-[5px] items-center w-50 text-center'>
      <div className="border-t border-gray-300 w-full my-4" />
      <div className="flex flex-col items-center w-[200px] gap-4">
        <b>Value Cropping</b>
        <MinMaxSlider 
          range={valueRange} 
          setRange={setValueRange} 
          valueScales={valueScales} 
          min={0} 
        />
      </div>
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
        defaultValue={nanColor}
        onChange={handleColorChange(setNanColor)}
      />
      <div className='grid grid-cols-[auto_20%] items-center gap-2 mt-2 text-left'>
        <label>Interpolate Pixels</label>
        <Switch className='h-5'  id="interpoalte-pixels" checked={interpPixels} onCheckedChange={e=>setInterpPixels(e)}/>
      </div>
      </>}
      <button
        onClick={()=>setShowMasks(x=>!x)}
        className="flex items-center gap-2 w-full mb-2"
      >
        <b>Masking</b>
        <ChevronDown 
          className={`h-4 w-4 transition-transform duration-200 ${
            showMasks ? '' : 'rotate-180'
          }`}
        />
      </button>
      
      <Hider show={showMasks} >
          <b>Mask Value</b>
          <div className='grid grid-cols-[auto_60%] items-center gap-2 mt-2 text-left'>
          <Input
            type='number'
            defaultValue={denormalize(fillValue, valueScales.minVal, valueScales.maxVal)}
            onChange={e=> setThisFillValue(parseFloat(e.target.value))}
          />
          <Button
            disabled={normalize(thisFillVal, valueScales.minVal, valueScales.maxVal) === fillValue}
            className='cursor-pointer'
            onClick={()=>setFillValue(normalize(thisFillVal, valueScales.minVal, valueScales.maxVal))}
          >Set Value</Button>
          <b>Mask Land</b>
          <Select onValueChange={e=>{
            const idx = masks.indexOf(e)
            usePlotStore.setState({maskValue:idx})
          }}>
            <SelectTrigger className='w-[100%]'>
              <SelectValue placeholder={masks[usePlotStore.getState().maskValue]}/>
            </SelectTrigger>
            <SelectContent>
              {masks.map((val,idx)=>(
                <SelectItem value={val} key={idx}>
                  {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Hider>
      {!(analysisMode && axis != 0) && // Hide if Analysismode and Axis != 0
      <>
      <QuickTip 
        asChild={borderCompatible} // Won't trigger when button below is disabled
        message={borderCompatible ? 'Show political boundaries' : "Browzarr was unable to parse spatal extent"}>
        <Button 
          variant="pink" 
          size="sm" 
          className="w-[100%] cursor-[pointer] mb-2 mt-2" 
          disabled={!borderCompatible}
          onClick={() => setShowBorders(!showBorders)}>{showBorders ? "Hide Borders" : "Show Borders" }</Button>
      </QuickTip>
        
        <Hider show={showBorders}>
          <Switcher leftText='Texture' rightText='Lines' state={useBorderTexture} onClick={
            ()=>usePlotStore.setState({useBorderTexture:!useBorderTexture})
          } />
          <Hider show={useBorderTexture} >
            <b>Border Width</b>
            <Slider className='my-2'
              value={[borderWidth]}
              min={0.01}
              max={0.4}
              step={0.01}
              onValueChange={e=>usePlotStore.setState({borderWidth:e[0]})}
            />
          </Hider>
          <b>Border Color</b>
          <input type="color"
              className='w-[100%] cursor-pointer'
              defaultValue={borderColor}
              onChange={handleColorChange(setBorderColor)}
              />
        </Hider>
      </>
      }
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" className='w-[100%] cursor-pointer mb-2'>
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

function resetViz(){
  usePlotStore.setState({
    timeScale: 1,
    valueRange: [0, 1],
    xRange: [-1, 1],
    yRange: [-1, 1],
    zRange: [-1, 1],
    transparency: 0,
    vTransferRange: false,
    vTransferScale: 1,
    sphereResolution: 10,
    displacement: 0,
    displaceFaces: true,
    fillValue: undefined, 
    maskValue: 0,
    disablePointScale: false,
  })
}


const AdjustPlot = () => {
    const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
    const [open, setOpen] = useState(false);

    const {plotOn} = useGlobalStore(useShallow(s => s))
    const {plotType} = usePlotStore(useShallow(s => s))

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div style={enableCond ? {} : { pointerEvents: 'none' } }>
          <QuickTip message={<span>Plot Settings</span>}>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
              style={{
                color: enableCond ? '' : 'var(--text-disabled)'
              }}
            >
              <HiAdjustmentsHorizontal className="size-8" />
            </Button>
          </QuickTip>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => { //Prevents tooltip from opening automatically
          e.preventDefault();
        }}
        className={`relative w-[240px] mt-2 mr-1 ${
          popoverSide === 'top' ? 'mb-1' : ''
        }`}
      >
        <QuickTip message='Close settings'>
          <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-1 z-10 cursor-pointer saturate-[180%]"
              onClick={() => setOpen(false)}
              aria-label="Close settings"
            >
              <RiCloseLargeLine className="size-4" />
            </Button>
        </QuickTip>
        <div className={`overflow-y-auto no-scrollbar -mx-4 px-4 ${popoverSide === 'top' ? 'max-h-[80vh]' : 'max-h-[70vh]'}`}>          
          <RxReset size={25} 
            style={{
              // position:'absolute',
              top:"10px",
              left:"10px",
              cursor:'pointer',
            }} 
            onClick={resetViz}
          />
          {plotType === 'volume' && <VolumeOptions />}
          {plotType === 'point-cloud' && <PointOptions />}
          {plotType === 'sphere' && <SphereOptions/>}
          {(plotType === 'volume' || plotType === 'point-cloud') && <DimSlicer />}
          {plotType === 'flat' && <FlatOptions />}
          <Reprojection />
          <GlobalOptions />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default AdjustPlot
