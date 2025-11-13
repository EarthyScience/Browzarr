"use client";
import React, {useState} from 'react'
import { IoImage } from "react-icons/io5";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "./input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGlobalStore, useImageExportStore, usePlotStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from './switch';
import Hider from './Hider';
import { Button } from './button';

const ExportImageSettings = () => {
    const {
        includeBackground, includeColorbar, doubleSize, cbarLoc, cbarNum,
        useCustomRes, customRes, includeAxis, mainTitle, cbarLabel, animate,
        frames, frameRate,
        ExportImg, EnableExport, setIncludeBackground, setIncludeColorbar, 
        setDoubleSize, setCbarLoc, setCbarNum, setUseCustomRes,
        setCustomRes, setIncludeAxis, setHideAxis, setHideAxisControls,
        setMainTitle, setCbarLabel, setAnimate, setFrames, setFrameRate

    } = useImageExportStore(useShallow(state => ({
          includeBackground: state.includeBackground, includeColorbar: state.includeColorbar,
          doubleSize: state.doubleSize, cbarLoc: state.cbarLoc, cbarNum: state.cbarNum, useCustomRes: state.useCustomRes,
          customRes: state.customRes, includeAxis: state.includeAxis, mainTitle: state.mainTitle, cbarLabel: state.cbarLabel,
          animate: state.animate, frames: state.frames, frameRate: state.frameRate,
          ExportImg: state.ExportImg, EnableExport: state.EnableExport, setIncludeBackground: state.setIncludeBackground,
          setIncludeColorbar: state.setIncludeColorbar, setDoubleSize: state.setDoubleSize, setCbarLoc: state.setCbarLoc,
          setCbarNum: state.setCbarNum, setUseCustomRes: state.setUseCustomRes, setCustomRes: state.setCustomRes,
          setIncludeAxis: state.setIncludeAxis, setHideAxis: state.setHideAxis, setHideAxisControls: state.setHideAxisControls,
          setMainTitle: state.setMainTitle, setCbarLabel: state.setCbarLabel, setAnimate: state.setAnimate, setFrames: state.setFrames,
          setFrameRate: state.setFrameRate
      })))

    interface CapitalizeFn {
        (str: string): string;
    }

    const {plotType} = usePlotStore(useShallow(state=>({
        plotType: state.plotType
    })))
    const {variable, metadata} = useGlobalStore(useShallow(state=>({
        variable: state.variable,
        metadata: state.metadata
    })))
    const capitalize: CapitalizeFn = str => str.charAt(0).toUpperCase() + str.slice(1);
    const [showTitles, setShowTitles] = useState(false)
    const [showAnimation, setShowAnimation] = useState(false)
    const [showSettings, setShowSettings] = useState(true)
  return (
    <Popover>
        <PopoverTrigger asChild>
            <div>
            <Tooltip delayDuration={500} >
                <TooltipTrigger asChild>
                <Button 
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer"
                    onClick={e=>EnableExport()} // This just allows exporting to prevent the export module from firing when its loaded
                >
                    <IoImage className="size-8"/>
                </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="start">
                Export view as Image
                </TooltipContent>
            </Tooltip>
            </div>
        </PopoverTrigger>
        <PopoverContent
            side="right"
            className="w-[200px] select-none"
        >
        <div className="grid items-center gap-2">
            {/* TITLES */}
            <button 
                onClick={() => setShowTitles(x=>!x)}
                className="flex items-center gap-2 w-full "
            >
                <b>Titles</b>
                <ChevronDown 
                    className={`h-4 w-4 transition-transform duration-200 ${
                    !showTitles ? 'rotate-180' : ''
                    }`}
                />
            </button>
            <Hider show={showTitles} className='col-span-2'>
                <div className='grid'>
                    <label htmlFor="main-title">Main Title</label>
                    <Input id='main-title' type='string' placeholder={variable} value={mainTitle} onChange={e=> setMainTitle(e.target.value)}/>

                    <label htmlFor="cbar-title">Colorbar Label</label>
                    <Input id='cbar-title' type='string' placeholder={metadata?.units} value={cbarLabel} onChange={e=> setCbarLabel(e.target.value)}/>
                </div>
            </Hider>
            {/* Settings */}
            <button 
                onClick={() => setShowSettings(x=>!x)}
                className="flex items-center gap-2 w-full "
            >
                <b>Settings</b>
                <ChevronDown 
                    className={`h-4 w-4 transition-transform duration-200 ${
                    !showSettings ? 'rotate-180' : ''
                    }`}
                />
            </button>
            <Hider show={showSettings} className='col-span-2'>
                <div className="grid grid-cols-[auto_60px] items-center gap-2">
                    <label htmlFor="includeBG">Include Background</label>
                    <Switch id='includeBG' checked={includeBackground} onCheckedChange={e => setIncludeBackground(e)}/>
                    {plotType != 'sphere' &&
                    <>
                    <label htmlFor="includeBG">Include Axis</label>
                    <Switch id='includeBG'  checked={includeAxis} onCheckedChange={e => setIncludeAxis(e)}/>
                    </>
                    }
                    <label htmlFor="includeCbar">Include Colorbar</label>
                    <Switch id='includeCbar' checked={includeColorbar} onCheckedChange={e => setIncludeColorbar(e)}/>

                    <Hider show={includeColorbar} className='col-span-2'>
                        <div  className='col-span-2 flex justify-between'>
                            <label htmlFor="colorbar-loc ">Colorbar <br/> Location</label>
                            <div id='colorbar-loc'>
                                <Select value={cbarLoc} onValueChange={e=>setCbarLoc(e)}>
                                    <SelectTrigger >
                                        <SelectValue placeholder={cbarLoc}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['left', 'right', 'top', 'bottom'].map((val)=>(
                                            <SelectItem key={val} value={val}>{capitalize(val)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>  
                        <div className="grid grid-cols-[auto_60px] items-center gap-2">
                            <label htmlFor="cbarNum" >Number of Ticks</label>
                            <Input id='cbarNum' type="number" min={0} max={20} step={1} value={cbarNum} onChange={e => setCbarNum(parseInt(e.target.value))}/>    
                        </div>    
                        <div className='border-b my-2' />
                    </Hider>
        
                    <label htmlFor="useCustomRes" >Set Resolution</label>
                    <Switch id='useCustomRes' checked={useCustomRes} onCheckedChange={e => setUseCustomRes(e)}/>
                    
                    <Hider show={useCustomRes} className='col-span-2'>
                        <div className='grid grid-cols-[50%_50%] col-span-2 '>
                            <div className='flex flex-col items-center'>
                                <h1>Width</h1>
                                <Input id='cbarNum' type="number"  value={customRes[0]} onChange={e => setCustomRes([parseInt(e.target.value), customRes[1]])}/>
                            </div>
                            <div className='flex flex-col items-center'>
                                <h1>Height</h1>
                                <Input id='cbarNum' type="number"  value={customRes[1]} onChange={e => setCustomRes([customRes[0], parseInt(e.target.value)])}/>
                            </div>
                        </div>
                    </Hider>

                    <Hider show={!useCustomRes} className='col-span-2' >
                        <div className='grid grid-cols-[auto_60px] items-center gap-2'>
                            <label htmlFor="includeCbar" >Double Resolution</label>
                            <Switch id='includeCbar' checked={doubleSize} onCheckedChange={e => setDoubleSize(e)}/>
                        </div>
                    </Hider>
                </div>
            </Hider>
            {/* ANIMATION */}
            <button 
                onClick={() => setShowAnimation(x=>!x)}
                className="flex items-center gap-2 w-full "
            >
                <b>Animations</b>
                <ChevronDown 
                    className={`h-4 w-4 transition-transform duration-200 ${
                    !showAnimation ? 'rotate-180' : ''
                    }`}
                />
            </button>
            <Hider show={showAnimation} className='grid col-span-2 gap-2'>
                <div className="grid grid-cols-[auto_60px] items-center gap-2">
                    <label htmlFor="useAnimate">Export Animation</label>
                    <Switch id='useAnimate' checked={animate} onCheckedChange={e => setAnimate(e)}/>
                    <Hider show={animate} className='col-span-2 '>
                        <div className="grid grid-cols-[auto_80px] items-center gap-2">
                            <label htmlFor="frames">Frames</label>
                            <Input id="frames" type='number' step={1} value={frames} onChange={e => setFrames(parseInt(e.target.value))} />

                            <label htmlFor="fps">FPS</label>
                            <Input id="fps" type='number' step={1} value={frameRate} onChange={e => setFrameRate(parseInt(e.target.value))} />

                        </div>
                    </Hider>
                </div>
            </Hider>
            <Button
                className="col-span-2"
                variant='pink'
                onClick={e=>{ExportImg(); setHideAxisControls(true); setHideAxis(!includeAxis)}}
            >Export</Button>
        </div>
        
        </PopoverContent>
    </Popover>
  )
}

export default ExportImageSettings
