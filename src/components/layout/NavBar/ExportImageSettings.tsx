"use client";
import React, {useEffect, useState} from 'react'
import { IoImage } from "react-icons/io5";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input, Hider, Button, Switcher, QuickTip } from "@/components/ui";
import { useImageExportStore } from '@/stores/ImageExportStore';
import { useGlobalStore } from '@/stores/GlobalStore';
import { usePlotStore } from '@/stores/PlotStore';
import { useZarrStore } from '@/stores/ZarrStore';
import { useShallow } from 'zustand/shallow';
import { ChevronRight } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { BsBoxArrowRight } from "react-icons/bs";
import { FaLongArrowAltRight } from "react-icons/fa";
import { FieldLabel, Section, CollapsibleSection, Group, Field, SwitchField } from '@/components/widgets/SettingFields';

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// Label stacked above a full-width input
const StackedInput = ({id, label, ...props} : {id: string, label: string} & React.ComponentProps<typeof Input>) => (
    <div className='flex flex-col gap-1'>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input id={id} className='h-8' {...props} />
    </div>
)

const ExportImageSettings = () => {
    const {
        includeBackground, includeColorbar, doubleSize, cbarLoc, cbarNum,
        useCustomRes, customRes, includeAxis, mainTitle, cbarLabels, cbarUnits, animate, timeRate,
        frames, frameRate, orbit, useTime, loopTime, orbitDeg, orbitDir, preview, pingpong,
        ExportImg, EnableExport, setIncludeBackground, setIncludeColorbar,
        setDoubleSize, setCbarLoc, setCbarNum, setUseCustomRes, setCustomRes, setIncludeAxis,
        setHideAxis, setHideAxisControls, setMainTitle, setCbarLabels, setAnimate,
        setFrames, setFrameRate, setTimeRate, setOrbit, setUseTime, setLoopTime, setKeyFrameEditor,
        setCbarUnits, setPingpong, setPreview, setPreviewExtent, setOrbitDeg
    } = useImageExportStore(useShallow(s => s))

    const {plotType, zSlice} = usePlotStore(useShallow(s => ({ plotType: s.plotType, zSlice: s.zSlice })))
    const {variable, variable2, dimArrays, bivariate, units} = useGlobalStore(useShallow(s => ({
        variable: s.variable, variable2: s.variable2, dimArrays: s.dimArrays, bivariate: s.bivariate, units: s.units
    })))
    const [showAnimation, setShowAnimation] = useState(false)
    const axisMapping = useZarrStore(s => s.axisMapping);
    const cbarLocList = bivariate
        ? ['bottomLeft', 'bottomRight', 'topLeft', 'topRight']
        : ['left', 'right', 'top', 'bottom']

    useEffect(()=>{
        const shapeLength = dimArrays?.length || 3;
        const zIdx = axisMapping?.z >= 0 ? axisMapping.z : Math.max(0, shapeLength - 3);
        const zArray = dimArrays[zIdx];
        const zLength = zArray?.length || 1;
        const sliceDist = zSlice[1] ? zSlice[1] - zSlice[0] : zLength - zSlice[0];
        setFrames(sliceDist);
    },[zSlice, dimArrays, axisMapping])

    const updateCbarLabels = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>): void => {
        const newLabels = [...cbarLabels]
        newLabels[idx] = e.target.value
        setCbarLabels(newLabels)
    }
    const updateCbarUnits = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>): void => {
        const newUnits = [...cbarUnits]
        newUnits[idx] = e.target.value
        setCbarUnits(newUnits)
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <QuickTip message='Export view as Image'>
                    <div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                            onClick={() => EnableExport()} // This just allows exporting to prevent the export module from firing when its loaded
                        >
                            <IoImage className="size-8"/>
                        </Button>
                    </div>
                </QuickTip>
            </PopoverTrigger>
            <PopoverContent
                side="right"
                className="w-[260px] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden select-none"
            >
                <div className='flex flex-col gap-3'>
                    <CollapsibleSection title='Titles'>
                        <StackedInput id='main-title' label='Main title' value={mainTitle} onChange={e => setMainTitle(e.target.value)} />
                        <Hider show={includeColorbar}>
                            <Group>
                                <div className='flex flex-col gap-1'>
                                    <FieldLabel htmlFor='cbar-title'>Colorbar label{bivariate ? 's' : ''}</FieldLabel>
                                    <Input id='cbar-title' className='h-8' placeholder={variable} value={cbarLabels[0]} onChange={updateCbarLabels(0)} />
                                    {bivariate && <Input id='cbar-title2' className='h-8' placeholder={variable2} value={cbarLabels[1]} onChange={updateCbarLabels(1)} />}
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <FieldLabel htmlFor='cbar-units'>Colorbar units</FieldLabel>
                                    <Input id='cbar-units' className='h-8' placeholder={units[0] ?? "undefined"} value={cbarUnits[0]} onChange={updateCbarUnits(0)} />
                                    <Input id='cbar-units2' className='h-8' placeholder={units[1] ?? "undefined"} value={cbarUnits[1]} onChange={updateCbarUnits(1)} />
                                </div>
                            </Group>
                        </Hider>
                    </CollapsibleSection>

                    <CollapsibleSection title='Settings' defaultOpen>
                        <SwitchField id='include-bg' label='Background' checked={includeBackground} onChange={setIncludeBackground} />
                        {plotType != 'sphere' &&
                            <SwitchField id='include-axis' label='Axis' checked={includeAxis} onChange={setIncludeAxis} />
                        }
                        <SwitchField id='include-cbar' label='Colorbar' checked={includeColorbar} onChange={setIncludeColorbar} />
                        <Hider show={includeColorbar}>
                            <Group>
                                <Field label='Location'>
                                    <Select value={cbarLoc} onValueChange={setCbarLoc}>
                                        <SelectTrigger className='h-7 w-full'>
                                            <SelectValue placeholder={cbarLoc}/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cbarLocList.map((val)=>(
                                                <SelectItem key={val} value={val}>{capitalize(val)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label='Ticks' htmlFor='cbar-num'>
                                    <Input className='h-7' id='cbar-num' type="number" min={0} max={20} step={1} value={cbarNum} onChange={e => setCbarNum(parseInt(e.target.value))} />
                                </Field>
                            </Group>
                        </Hider>

                        <SwitchField id='use-custom-res' label='Custom resolution' checked={useCustomRes} onChange={setUseCustomRes} />
                        <Hider show={useCustomRes}>
                            <Group>
                                <div className='grid grid-cols-2 gap-2'>
                                    <StackedInput id='res-width' label='Width' type='number' value={customRes[0]} onChange={e => setCustomRes([parseInt(e.target.value), customRes[1]])} />
                                    <StackedInput id='res-height' label='Height' type='number' value={customRes[1]} onChange={e => setCustomRes([customRes[0], parseInt(e.target.value)])} />
                                </div>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disableRipple
                                    onPointerEnter={()=>setPreviewExtent(true)}
                                    onPointerLeave={()=>setPreviewExtent(false)}
                                >
                                    Hover to preview extent
                                </Button>
                            </Group>
                        </Hider>
                        <Hider show={!useCustomRes}>
                            <SwitchField id='double-size' label='Double resolution' checked={doubleSize} onChange={setDoubleSize} />
                        </Hider>
                    </CollapsibleSection>
                    <Popover open={showAnimation} onOpenChange={setShowAnimation}>
                        <PopoverTrigger asChild>
                            <div className='flex items-center'>
                            <Button variant='secondary' size='sm' className='flex-grow justify-between cursor-pointer'>
                                Animation settings
                            </Button>
                            <ChevronRight className={`size-4 transition-transform duration-200 ${showAnimation ? 'rotate-180' : ''}`} />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent side='right' className='w-[260px] p-1'>
                            <Section title='Animation'>
                                <Field label='Frames' htmlFor='frames'>
                                    <Input className='h-7' id="frames" type='number' step={1} value={frames} onChange={e => setFrames(parseInt(e.target.value))} />
                                </Field>
                                <Field label='FPS' htmlFor='fps'>
                                    <Input className='h-7' id="fps" type='number' step={1} value={frameRate} onChange={e => setFrameRate(parseInt(e.target.value))} />
                                </Field>

                                <SwitchField id='use-orbit' label='Orbit' checked={orbit} onChange={setOrbit} />
                                <Hider show={orbit}>
                                    <Group>
                                        <Field label='Degrees' htmlFor='orbit-deg'>
                                            <Input className='h-7' id="orbit-deg" type='number' step={1} value={orbitDeg} onChange={e => setOrbitDeg(parseInt(e.target.value))} />
                                        </Field>
                                        <Field label='Direction' htmlFor='orbit-dir'>
                                            <Button
                                                id='orbit-dir'
                                                variant='outline'
                                                size='sm'
                                                className='h-7 w-full cursor-pointer'
                                                onClick={()=>useImageExportStore.getState().flipOrbitDir()}
                                            >
                                                <FaLongArrowAltRight style={{ transform: orbitDir ? "rotate(180deg)" : "", transition: ".25s" }} />
                                            </Button>
                                        </Field>
                                        <SwitchField id='pingpong' label='Ping-pong' checked={pingpong} onChange={setPingpong} />
                                    </Group>
                                </Hider>

                                <SwitchField id='use-time' label='Animate time' checked={useTime} onChange={setUseTime} />
                                <Hider show={useTime}>
                                    <Group>
                                        <Field label='Time FPS' htmlFor='time-rate'>
                                            <Input className='h-7' id="time-rate" type='number' step={1} value={timeRate} onChange={e => setTimeRate(parseInt(e.target.value))} />
                                        </Field>
                                        <SwitchField id='loop-time' label='Loop time' checked={loopTime} onChange={setLoopTime} />
                                    </Group>
                                </Hider>

                                <Button size='sm' className='cursor-pointer' onClick={()=>setKeyFrameEditor(true)}>
                                    Keyframe editor <BsBoxArrowRight/>
                                </Button>
                                <div className='flex flex-col gap-2'>
                                    <FieldLabel help='Choose export quality. Preview for fast test renders'>Quality</FieldLabel>
                                    <Switcher className='!mb-0' leftText='Preview' rightText='Final' state={preview} onClick={()=> setPreview(!preview)} />
                                </div>
                            </Section>
                        </PopoverContent>
                    </Popover>

                    <div className='flex flex-col gap-2'>
                        <FieldLabel help='Export as an image or as an animation'>Export as</FieldLabel>
                        <Switcher className='!mb-0' leftText='Image' rightText='Animation' state={!animate} onClick={()=> setAnimate(!animate)} />
                    </div>
                    <Button
                        variant='pink'
                        className='cursor-pointer'
                        onClick={()=>{ExportImg(); setHideAxisControls(true); setHideAxis(!includeAxis)}}
                    >
                        Export
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default ExportImageSettings
