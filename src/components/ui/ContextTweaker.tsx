"use client";

import React, { useEffect, useMemo, useState } from 'react'
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import { Button } from "@/components/ui/button"
import Slider  from 'rc-slider';
import { useShallow } from 'zustand/shallow';
import 'rc-slider/assets/index.css';
import { ArrayMinMax } from '@/utils/HelperFuncs';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function DeNorm(val : number, min : number, max : number){
    const range = max-min;
    return val*range+min;
}

function Norm(val : number, min : number, max : number){
    const range = max-min;
    return (val-min)/range;
}

export const MinMaxSlider = React.memo(function MinMaxSlider({range, setRange, valueScales, min=-1, array} : 
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
                {/* <span>Min: {DeNorm(range[0], minVal, maxVal)}</span>
                <span>Max: {DeNorm(range[1], minVal, maxVal)}</span> */}
                <span>Min: {trueMin}</span>
                <span>Max: {trueMax}</span>
            </div>
        </div>

    )
})

const VolumeTweaks = React.memo(function VolumeTweaks({loc} : {loc:number[]}){
    const {valueRange, xRange, yRange, zRange, useFragOpt, quality, setValueRange, setXRange, setYRange, setZRange, setQuality, setPlotType, setUseFragOpt} = usePlotStore(useShallow(state => ({
        valueRange: state.valueRange,
        xRange: state.xRange,
        yRange: state.yRange,
        zRange: state.zRange,
        useFragOpt: state.useFragOpt,
        quality: state.quality,
        setValueRange: state.setValueRange,
        setXRange: state.setXRange,
        setYRange: state.setYRange,
        setZRange: state.setZRange,
        setQuality: state.setQuality,
        setPlotType: state.setPlotType,
        setUseFragOpt: state.setUseFragOpt
    })))
    const [xScales, setXScales] = useState<{minVal: number, maxVal: number}>({minVal: 0, maxVal: 0})
    const [yScales, setYScales] = useState<{minVal: number, maxVal: number}>({minVal: 0, maxVal: 0})
    const [zScales, setZScales] = useState<{minVal: number, maxVal: number}>({minVal: 0, maxVal: 0})

    const {valueScales, dimArrays} = useGlobalStore(useShallow(state => ({valueScales : state.valueScales, dimArrays : state.dimArrays, isFlat: state.isFlat})))

    useEffect(()=>{
        if (dimArrays.length === 3){
            const [xMin, xMax] = ArrayMinMax(dimArrays[2]);
            const [yMin, yMax] = ArrayMinMax(dimArrays[1]); 
            const [zMin, zMax] = ArrayMinMax(dimArrays[0]);
            setXScales({minVal: xMin, maxVal: xMax});
            setYScales({minVal: yMin, maxVal: yMax});
            setZScales({minVal: zMin, maxVal: zMax});
        }
        
    },[dimArrays])

    const [isOpen, setIsOpen] = useState(false);

    useEffect(()=>{
        setIsOpen(true)
    },[loc])

    return(
        <div className="nav-dropdown">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger />
            <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Plot Quality</DropdownMenuLabel>
                <DropdownMenuItem onSelect={e=> e.preventDefault()} >
                <div className='w-full flex justify-between'>
                    Worse
                    <input type="range"
                        min={50}
                        max={1000}
                        step={50}
                        defaultValue={200} 
                        value={quality}
                    onChange={e => setQuality(parseInt(e.target.value))}
                    />
                    Better
                </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Button variant="destructive" className="w-[100%] h-[20px] cursor-[pointer]" onClick={() => setUseFragOpt(!useFragOpt)}>{useFragOpt ? "Revert to Normal" : "Use Optimized Shader"}</Button>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Value Cropping</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                        <MinMaxSlider range={valueRange} setRange={setValueRange} valueScales={valueScales} min={0}/>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup onSelect={e=> e.preventDefault()}>
                    <DropdownMenuLabel>Spatial Cropping</DropdownMenuLabel>
                    <DropdownMenuGroup>
                        <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                            <MinMaxSlider range={xRange} setRange={setXRange} valueScales={xScales} array={dimArrays[2]}/>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                            <MinMaxSlider range={yRange} setRange={setYRange} valueScales={yScales} array={dimArrays[1]}/>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                            <MinMaxSlider range={zRange} setRange={setZRange} valueScales={zScales} array={dimArrays[0]}/>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuGroup>
                <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                    <Button variant="destructive" className="w-[100%] h-[20px] cursor-[pointer]" onClick={() => setPlotType("point-cloud")}>Change to Points</Button>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    )
})


const PointTweaks = React.memo(function PointTweaks({loc} : {loc:number[]}){
    const {setPointSize, setScaleIntensity, setScalePoints, setPlotType, setValueRange, setTimeScale} = usePlotStore(useShallow(
        (state => ({
            setPointSize: state.setPointSize, 
            setScaleIntensity: state.setScaleIntensity, 
            setScalePoints: state.setScalePoints,
            setPlotType: state.setPlotType,
            setValueRange: state.setValueRange,
            setTimeScale: state.setTimeScale
        }))))

    const {scalePoints, scaleIntensity, pointSize, valueRange, timeScale} = usePlotStore(useShallow(state => ({
      scalePoints: state.scalePoints,
      scaleIntensity: state.scaleIntensity,
      pointSize: state.pointSize,
      valueRange: state.valueRange,
      timeScale: state.timeScale
    })))

    const valueScales = useGlobalStore(useShallow(state => state.valueScales))

    const [isOpen, setIsOpen] = useState(false);
    useEffect(()=>{
        setIsOpen(true)
    },[loc])

    return(
        <div className="nav-dropdown">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger />
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                    <div className='w-full flex justify-between flex-col items-center'>
                    <b>Point Size</b>
                    <input type="range"
                        className='w-full'
                        min={1}
                        max={50}
                        step={1}
                        defaultValue={pointSize} 
                    onChange={e => setPointSize(parseInt(e.target.value))}
                    />
                </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                    <Button variant="destructive" className="w-[100%] h-[20px] cursor-[pointer]" onClick={() => setScalePoints(!scalePoints)}>{scalePoints ? "Remove Scaling" : "Scale By Value" }</Button>
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                    <div className='w-full flex justify-between flex-col items-center'>
                    <b>Scale Intensity</b>
                    <input type="range"
                        className='w-full'
                        min={1}
                        max={100}
                        step={1}
                        defaultValue={scaleIntensity} 
                    onChange={e => setScaleIntensity(parseInt(e.target.value))}
                    />
                </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuGroup>
                    <DropdownMenuLabel>Value Cropping</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                        <MinMaxSlider range={valueRange} setRange={setValueRange} valueScales={valueScales} min={0}/>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                        <div className='w-full flex justify-between flex-col items-center'>
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
                    </DropdownMenuItem>
                </DropdownMenuGroup>
              <DropdownMenuItem onSelect={e=> e.preventDefault()}>
                    <Button variant="destructive" className="w-[100%] h-[20px] cursor-[pointer]" onClick={() => setPlotType("volume")}>Change to Volume</Button>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    )
})

const ContextTweaker = React.memo(function ContextTweaker({loc} : {loc:number[]}){
    const plotType = usePlotStore(state => state.plotType)
    
  return (
    <>
    <div style={{position:'fixed', left:loc[0], top:loc[1]}}>
        {plotType === "volume" && <VolumeTweaks loc={loc} />}
        {plotType === "point-cloud" && <PointTweaks loc={loc} />}
    </div>
    
    </>
  )
})

export {ContextTweaker}
