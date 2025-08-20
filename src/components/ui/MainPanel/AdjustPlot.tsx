"use client";
import React, {useState, useEffect} from 'react'
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import '../css/MainPanel.css'
import { useShallow } from 'zustand/shallow';
import Slider from 'rc-slider';
import { Button } from '../button';
import { LuSettings } from "react-icons/lu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from '../input';

function DeNorm(val : number, min : number, max : number){
    const range = max-min;
    return val*range+min;
}

function Norm(val : number, min : number, max : number){
    const range = max-min;
    return (val-min)/range;
}

const MinMaxSlider = React.memo(function MinMaxSlider({range, setRange, valueScales, min=-1, array} : 
    {
        range : number[], 
        setRange : (value: number[]) => void, 
        valueScales : {minVal : number, maxVal  : number},
        min?: number,
        array?: number[]
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
            <Slider
                range
                min={min}
                max={1}
                defaultValue={range}
                step={0.01}
                onChange={(values) => setRange(values as number[])}
            />

        {/* Min/Max labels */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 18 }}>
                <span>Min: {trueMin}</span>
                <span>Max: {trueMax}</span>
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
  
      const {valueScales, dimArrays} = useGlobalStore(useShallow(state => ({valueScales : state.valueScales, dimArrays : state.dimArrays, isFlat: state.isFlat})))

  return (
    <div>
      <div className='flex-column text-center w-[200px]'>
        <b>Value Cropping</b>
        <MinMaxSlider range={valueRange} setRange={setValueRange} valueScales={valueScales} min={0}/>
      </div>
      <div className='flex-column text-center'>
        <b>Spatial Cropping</b>
        <MinMaxSlider range={xRange} setRange={setXRange} valueScales={defaultScales} array={dimArrays[2]}/>
        <MinMaxSlider range={yRange} setRange={setYRange} valueScales={defaultScales} array={dimArrays[1]}/>
        <MinMaxSlider range={zRange} setRange={setZRange} valueScales={defaultScales} array={dimArrays[0]}/>
      </div>
    </div>
  )
}

const VolumeOptions = ()=>{
  const { useFragOpt, quality, transparency, nanTransparency, nanColor, setQuality, setUseFragOpt, setTransparency, setNanTransparency, setNanColor} = usePlotStore(useShallow(state => ({
          useFragOpt: state.useFragOpt,
          quality: state.quality,
          transparency: state.transparency,
          nanTransparency: state.nanTransparency,
          nanColor: state.nanColor,
          setQuality: state.setQuality,
          setUseFragOpt: state.setUseFragOpt,
          setTransparency: state.setTransparency,
          setNanTransparency: state.setNanTransparency,
          setNanColor: state.setNanColor
      })))
  return(
    <div className='grid gap-y-[5px] items-center w-50 text-center'>
      <b>Quality</b>
      <div className='w-full flex justify-between text-xs'>
          Worse
          <input type="range"
              min={50}
              max={1000}
              step={50}
              value={quality}
          onChange={e => setQuality(parseInt(e.target.value))}
          />
          Better
      </div>
      <Button variant="pink" className="w-[100%] h-[20px] cursor-[pointer]" onClick={() => setUseFragOpt(!useFragOpt)}>{useFragOpt ? "Revert to Normal" : "Use Optimized Shader"}</Button>
      <b>Transparency</b>

      <input type="range"
              min={0}
              max={10}
              step={.2}
              value={transparency}
          onChange={e => setTransparency(parseFloat(e.target.value))}
          />
      <b>NaN Transparency</b>
      <input type="range"
              min={0}
              max={1}
              step={.05}
              value={nanTransparency}
          onChange={e => setNanTransparency(parseFloat(e.target.value))}
          />
        <b>NaN Color</b>
      <input type="color"
      className='w-[100%] cursor-pointer'
              value={nanColor}
          onChange={e => setNanColor(e.target.value)}
          />
    </div>
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
    <div className='flex-column items-center w-50 text-center'>
          <b>Point Size</b>
          <input type="range"
              className='w-full'
              min={1}
              max={50}
              step={1}
              defaultValue={pointSize} 
          onChange={e => setPointSize(parseInt(e.target.value))}
          />
      <Button variant="pink" className="w-[100%] h-[20px] cursor-[pointer]" onClick={() => setScalePoints(!scalePoints)}>{scalePoints ? "Remove Scaling" : "Scale By Value" }</Button>
      {scalePoints && 
      <><b>Scale Intensity</b>
      <input type="range"
          className='w-full'
          min={1}
          max={100}
          step={1}
          defaultValue={scaleIntensity} 
      onChange={e => setScaleIntensity(parseInt(e.target.value))}
      /></>}
      <b>Resize Time Dimension</b>
        <input type="range"
            className='w-full'
            min={.05}
            max={5}
            step={.05}
            defaultValue={timeScale} 
        onChange={e => setTimeScale(parseFloat(e.target.value))}
        />
    </div>
  )
}


const SphereOptions = () =>{
  const {dimArrays, dimUnits} = useGlobalStore(useShallow(state => ({
    dimArrays: state.dimArrays,
    dimUnits: state.dimUnits
  })))

  const {lonExtent, latExtent, lonResolution, latResolution, 
        setLonExtent, setLatExtent, setLonResolution, setLatResolution} = usePlotStore(useShallow(state => ({
    lonExtent: state.lonExtent,
    latExtent: state.latExtent,
    lonResolution: state.lonResolution,
    latResolution: state.latResolution,
    setLonExtent: state.setLonExtent,
    setLatExtent: state.setLatExtent,
    setLonResolution: state.setLonResolution,
    setLatResolution: state.setLatResolution
  })))


  return (
    <div className='grid gap-2 mb-4 justify-items-center '>
      <h1>Spatial Extent</h1>
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
          <h2>Min Lat</h2>
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
    </div>
  )
}

const GlobalOptions = () =>{
  const {showBorders, borderColor, setShowBorders, setBorderColor} = usePlotStore(useShallow(state => ({
    showBorders: state.showBorders,
    borderColor: state.borderColor,
    setShowBorders: state.setShowBorders,
    setBorderColor: state.setBorderColor
  })))

  return (
    <div className='grid gap-y-[5px] items-center w-50 text-center'>
      <Button variant="pink" className="w-[100%] h-[20px] cursor-[pointer]" onClick={() => setShowBorders(!showBorders)}>{showBorders ? "Hide Borders" : "Show Borders" }</Button>
      {showBorders && <div>
      <b>Border Color</b>
      <input type="color"
          className='w-[100%] cursor-pointer'
              value={borderColor}
          onChange={e => setBorderColor(e.target.value)}
          />
      </div>}
      
    </div>
  )
}


const AdjustPlot = () => {
    const [isMobile, setIsMobile] = useState(false);

    const {plotOn} = useGlobalStore(
        useShallow(state=>({
          plotOn: state.plotOn,
        })))
    const {plotType} = usePlotStore(
        useShallow(state=> ({
          plotType: state.plotType,
        })))
    

  useEffect(() => {
    const checkWindowSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkWindowSize(); // Initial check
    window.addEventListener("resize", checkWindowSize);

    return () => window.removeEventListener("resize", checkWindowSize);
  }, []);

  const enableCond = (plotOn)
  return (
      <Popover>
        <PopoverTrigger
          disabled={!enableCond}
        >
          <LuSettings
            color={enableCond ? '' : 'var(--text-disabled)'}
            style={{
              cursor: enableCond ? 'pointer' : 'auto',
              transform: enableCond ? '' : 'scale(1)'
            }}
            className="panel-item"
          />
        </PopoverTrigger>
        <PopoverContent
          side={isMobile ? 'top' : 'left'}
          className={`${
            isMobile 
              ? 'overflow-y-scroll overflow-x-hidden w-[calc(100vw-24px)] mb-1' 
              : 'w-[242px]'
          }`}
          style={{ height: 'fit-content' }}
        >
          <div className="px-2 py-2">
            {plotType === 'volume' && <VolumeOptions />}
            {plotType === 'point-cloud' && <PointOptions />}
            {(plotType === 'volume' || plotType === 'point-cloud') && <DimSlicer />}
            {plotType === 'sphere' && <SphereOptions />}
            <GlobalOptions />
          </div>
        </PopoverContent>
      </Popover>
  )
}

export default AdjustPlot
