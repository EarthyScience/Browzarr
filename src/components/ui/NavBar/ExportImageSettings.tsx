"use client";
import React, {useEffect, useState} from 'react'
import { IoImage } from "react-icons/io5";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input, Switch, Hider, Button, Switcher, QuickTip } from "@/components/ui";
import { useImageExportStore } from '@/GlobalStates/ImageExportStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useShallow } from 'zustand/shallow';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BsBoxArrowRight } from "react-icons/bs";
import { FaLongArrowAltRight } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import { BiExport } from 'react-icons/bi'


const ExportImageSettings = () => {
    const {
        includeBackground, includeColorbar, doubleSize, cbarLoc, cbarNum, keyFrames,
        useCustomRes, customRes, includeAxis, mainTitle, cbarLabel, cbarUnits, animate, timeRate,
        frames, frameRate, orbit, useTime, loopTime, orbitDeg, orbitDir, preview, pingpong  
    } = useImageExportStore(useShallow(s => s))

    const {ExportImg, EnableExport, setIncludeBackground, setIncludeColorbar, 
        setDoubleSize, setCbarLoc, setCbarNum, setUseCustomRes, setCustomRes, setIncludeAxis, 
        setHideAxis, setHideAxisControls, setMainTitle, setCbarLabel, setAnimate, 
        setFrames, setFrameRate, setTimeRate, setOrbit, setUseTime, setLoopTime, setKeyFrameEditor, 
        setCbarUnits, setPingpong, setPreview, setPreviewExtent, setOrbitDeg} = useImageExportStore(useShallow(s => s))

    interface CapitalizeFn {
        (str: string): string;
    }

    const {plotType, zSlice} = usePlotStore( useShallow(s => ({ plotType: s.plotType, zSlice: s.zSlice })))
    const {variable, metadata, dimArrays} = useGlobalStore(useShallow(s => s))
    const capitalize: CapitalizeFn = str => str.charAt(0).toUpperCase() + str.slice(1);
    const [showTitles, setShowTitles] = useState(false)
    const [showAnimation, setShowAnimation] = useState(false)
    const [showSettings, setShowSettings] = useState(true)
	const [previewState, setPreviewState] = useState(false)
    const [copied, setCopied] = useState(false);
    const axisMapping = useZarrStore(s => s.axisMapping);

    useEffect(()=>{
        const shapeLength = dimArrays?.length || 3;
        const zIdx = axisMapping?.z >= 0 ? axisMapping.z : Math.max(0, shapeLength - 3);
        const zArray = dimArrays[zIdx];
        const zLength = zArray?.length || 1;
        const sliceDist = zSlice[1] ? zSlice[1] - zSlice[0] : zLength - zSlice[0];
        setFrames(sliceDist);
    },[zSlice, dimArrays, axisMapping])

	const keyFramesJSON = (): string => {
		const {keyFrames} = useImageExportStore.getState()
		if (!keyFrames) return '';
		const obj = Object.fromEntries(keyFrames)
		return JSON.stringify(obj)
	}

    const copyToClipboard = async () => {
		const keyFramesJson = keyFramesJSON()
        await navigator.clipboard.writeText(JSON.stringify(keyFramesJson));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500); //Use for a pop-up that fades away
    };

	const exportToJson = async () => {
		const keyFramesJson = keyFramesJSON()
		const blob = new Blob([keyFramesJson], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "keyframes.json";

		link.click();
		URL.revokeObjectURL(url)

	}

  return (
    <Popover>
        <PopoverTrigger asChild>
			<QuickTip message='Export view as Image'>
				<Button 
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer"
                    onClick={e=>EnableExport()} // This just allows exporting to prevent the export module from firing when its loaded
                >
                    <IoImage className="size-8"/>
                </Button>
			</QuickTip>
        </PopoverTrigger>
        <PopoverContent
            side="right"
            className="w-[200px] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden select-none"
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
                    <Input id='main-title' type='string' value={mainTitle} onChange={e=> setMainTitle(e.target.value)}/>
                    <Hider show={includeColorbar} >
                        <label htmlFor="cbar-title">Colorbar Label</label>
                        <Input id='cbar-title' type='string' placeholder={variable} value={cbarLabel} onChange={e=> setCbarLabel(e.target.value)}/>
                    
                        <label htmlFor="cbar-title">Colorbar Units</label>
                        <Input id='cbar-title' type='string' placeholder={metadata?.units?? "undefined"} value={cbarUnits} onChange={e=> setCbarUnits(e.target.value)}/>
                    </Hider>
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
                <div className="grid grid-cols-[auto_60px] items-center gap-1">
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
                                <Select  value={cbarLoc} onValueChange={e=>setCbarLoc(e)}>
                                    <SelectTrigger  >
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
                            <Input className='h-[26px]' id='cbarNum' type="number" min={0} max={20} step={1} value={cbarNum} onChange={e => setCbarNum(parseInt(e.target.value))}/>    
                        </div>    
                        <div className='border-b my-2' />
                    </Hider>
        
                    <label htmlFor="useCustomRes" >Set Resolution</label>
                    <Switch id='useCustomRes' checked={useCustomRes} onCheckedChange={e => setUseCustomRes(e)}/>
                    
                    <Hider show={useCustomRes} className='col-span-2'>
                        <div className='grid grid-cols-[50%_50%] col-span-2 '>
                            <div className='flex flex-col items-center'>
                                <h1>Width</h1>
                                <Input className='h-[26px]' id='cbarNum' type="number"  value={customRes[0]} onChange={e => setCustomRes([parseInt(e.target.value), customRes[1]])}/>
                            </div>
                            <div className='flex flex-col items-center'>
                                <h1>Height</h1>
                                <Input className='h-[26px]' id='cbarNum' type="number"  value={customRes[1]} onChange={e => setCustomRes([customRes[0], parseInt(e.target.value)])}/>
                            </div>
							<Button className={`col-span-2 ${previewState ? 'bg-red-600' : ''}`}
								variant='outline'
								disableRipple
								onPointerEnter={()=>setPreviewExtent(true)}
								onPointerLeave={()=>setPreviewExtent(false)}
							>
								Preview Extent
							</Button>
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
            <Popover open={showAnimation} onOpenChange={setShowAnimation}>
                <PopoverTrigger className='col-span-2' asChild>
                    <div className='flex items-center justify-between mb-2'>
                    
                    <Button
                        variant='secondary'
                        className="flex items-center flex-grow justify-center gap-2 h-auto "
                    >
                        <b>Animation Settings</b>
                    </Button>
                    <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${
                        showAnimation ? 'rotate-180' : '' } z-5`} />
                    </div>
                </PopoverTrigger>
                <PopoverContent side='right' className='w-50'>
                    <div className="grid grid-cols-[auto_60px] items-center gap-2">
                        {/* Animation Settings */}
                        <div className='col-span-2 '>
                            <div className="grid grid-cols-[auto_80px] items-center gap-1 mb-2">
                                <label htmlFor="frames">Frames</label>
                                <Input className='h-[26px]' id="frames" type='number' step={1} value={frames} onChange={e => setFrames(parseInt(e.target.value))} />
                                <label htmlFor="fps">FPS</label>
                                <Input className='h-[26px]' id="fps" type='number' step={1} value={frameRate} onChange={e => setFrameRate(parseInt(e.target.value))} />
                            </div>
                            <div className="grid grid-cols-[auto_60px] items-center gap-2">
                                
                                <label htmlFor="useOrbit">Orbit</label>
                                <Switch id="useOrbit" checked={orbit} onCheckedChange={e=> setOrbit(e)} />
                                
                                <Hider show={orbit} className='col-span-2'>
                                    <div className="grid grid-cols-[auto_80px] items-center gap-2 mb-2">
                                        <label htmlFor="orbitDeg">Orbit Degrees</label>
                                        <Input id="orbitDeg" type='number' step={1} value={orbitDeg} onChange={e => setOrbitDeg(parseInt(e.target.value))} />
                                    </div>
                                    <div className="grid grid-cols-[auto_60px] items-center gap-2 mb-2">
                                        <label htmlFor="orbitDir">Direction</label>
                                        <FaLongArrowAltRight id='orbitDir' onClick={()=>useImageExportStore.getState().flipOrbitDir()}
                                            style={{
                                                transform: `${orbitDir ? "rotate(180deg)" : ""}`,
                                                transition: ".25s",
                                                cursor:"pointer"
                                            }}      
                                            size={26}
                                        />
                                        <label htmlFor="useOrbit">Ping-Pong</label>
                                        <Switch id="useOrbit" checked={pingpong} onCheckedChange={e=> setPingpong(e)} />
                                    </div>

                                    <div className='border-b my-2' />
                                </Hider>
                                
                                <label htmlFor="useTime">Animate Time</label>
                                <Switch id="useTime" checked={useTime} onCheckedChange={e=> setUseTime(e)} />
                                <Hider show={useTime} className='col-span-2'>
                                    <div className="grid grid-cols-[auto_80px] items-center gap-2 mb-2">
                                        <label htmlFor="timeRate">Time FPS</label>
                                        <Input id="timeRate" type='number' step={1} value={timeRate} onChange={e => setTimeRate(parseInt(e.target.value))} />
                                    </div> 
                                    <div className="grid grid-cols-[auto_60px] items-center gap-2">
                                        <label htmlFor="loopTime">Loop Time</label>
                                        <Switch id="loopTime" checked={loopTime} onCheckedChange={e=> setLoopTime(e)} />
                                    </div>
                                    <div className='border-b my-2' />
                                </Hider>

                                <Button
                                    className='col-span-2 cursor-pointer'
                                    onClick={()=>setKeyFrameEditor(true)}
                                >
                                    Keyframe Editor <BsBoxArrowRight/>
                                </Button>
                                {keyFrames &&
                                <div className='col-span-2 text-center'>
                                    <b>Export Keyframes</b>
                                    <div className='grid grid-cols-2 items-center'>
                                        <div>
                                            <QuickTip message='Copy the current keyframes to JSON for use in a coding environment'>
                                                <Button
                                                    className='p-2'
                                                    variant='ghost'
                                                    onClick={copyToClipboard}
                                                >
                                                    <FiCopy className='size-4'/><span className='text-xs'>Copy</span>
                                                </Button>
                                            </QuickTip>
                                        </div>
                                        <div>
                                            <QuickTip message='Export the current keyframes to JSON for use in a coding environment'>
                                                <Button
                                                    className='p-2'
                                                    variant='ghost'
                                                    onClick={exportToJson}
                                                >
                                                    <BiExport className='size-4'/><span className='text-xs'>Export</span>
                                                </Button>
                                            </QuickTip>
                                        </div>
                                    </div>
                                </div>
                                }
                            </div>
                            <div className='my-2'/>
                            <QuickTip message='Chose export quality. Preview for fast test renders' asChild>
                                <div className='col-span-2'>
                                <Switcher leftText='Preview' rightText='Final' state={preview} onClick={()=> setPreview(!preview)} />
                                </div>
                            </QuickTip>
                            
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
            <b className='col-span-2 text-center'><u>Export As</u></b>
            <QuickTip message='Export as an image or as an animation' asChild>
                <div className='col-span-2'>
                <Switcher leftText='Image' rightText='Animation' state={!animate} onClick={()=> setAnimate(!animate)} />
                </div>
            </QuickTip>
            
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
