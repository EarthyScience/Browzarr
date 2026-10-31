"use client";
import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react'
import { useAnalysisStore } from '@/stores/AnalysisStore';
import { useGlobalStore } from '@/stores/GlobalStore';
import { usePlotStore } from '@/stores/PlotStore';
import '../css/MainPanel.css'
import { useShallow } from 'zustand/shallow';
import { SliderThumbs } from '@/components/widgets/SliderThumbs';
import { RxReset } from "react-icons/rx";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input, Hider, Button, Switcher, QuickTip, QuickSelect, SelectItem } from '@/components/ui';
import { parseLoc, normalize, denormalize } from '@/lib/helpers';
import { RiCloseLargeLine } from "react-icons/ri";
import { Reprojection } from '@/components/elements/Reprojection';
import { FaLongArrowAltUp } from "react-icons/fa";
import { HiAdjustmentsHorizontal } from "react-icons/hi2";
import { resetProjection } from '@/gpu/textures/ProjectionTexture';
import {AxisCropper} from '@/components/elements/AxisCropper';
import { Masker } from '@/components/elements/Masker';
import { useColormapStore } from '@/stores/ColormapStore';
import { useValueScales } from '@/hooks';
import { transformedRange } from '@/lib/shaderToJs';
import { PanelButton, usePanelSide } from './PanelButton';
import { FieldLabel, Section, Group, Field, SliderField, SwitchField, ColorField } from '@/components/widgets/SettingFields';

export const MinMaxSlider = React.memo(function MinMaxSlider({range, setRange, valueScales, min=-1, array, units} :
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
        const minIdx = Math.round(normalize(range[0], min, 1) as number * size)
        const maxIdx = Math.round(normalize(range[1], min, 1) as number * size)
        trueMin = array[minIdx]
        trueMax = array[maxIdx-1]
    }
    else {
        trueMin = Math.round(denormalize(range[0], minVal, maxVal) as number*100)/100
        trueMax = Math.round(denormalize(range[1], minVal, maxVal) as number*100)/100
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
            <div className="flex justify-between text-xs mt-2 mb-2">
                <span>Min: {parseLoc(trueMin, units)}</span>
                <span>Max: {parseLoc(trueMax, units)}</span>
            </div>
        </div>
    )
})

const BivariateSelector = () => {
    const {bivariate, variable, variable2} = useGlobalStore(useShallow(s => ({
        bivariate: s.bivariate, variable: s.variable, variable2: s.variable2
    })))
    const {bivariateSelection, setBivariateSelection} = useColormapStore(useShallow(s => ({
        bivariateSelection: s.bivariateSelection, setBivariateSelection: s.setBivariateSelection
    })))
    const variables = [variable, variable2];
    if (!bivariate) return null
    return (
        <div className='grid grid-cols-[auto_1fr] items-center gap-2'>
            <FieldLabel help="Changes will only apply to the selected variable's values">Map to</FieldLabel>
            <QuickSelect
                value={variables[bivariateSelection]}
                onValueChange={(val: string) => setBivariateSelection(variables.indexOf(val))}
                className='w-full min-w-0'
            >
                {variables.map((val, idx)=> (
                    <SelectItem key={idx} value={val as string}>
                        {val}
                    </SelectItem>
                ))}
            </QuickSelect>
        </div>
    )
}

const VolumeOptions = () => {
    const { useRayMarch, volumeMode, quality, transparency, vTransferRange, vTransferScale, interpPixels, revTransparency,
        setQuality, setUseRayMarch, setVolumeMode, setTransparency, setVTransferRange, setVTransferScale, setRevTransparency} = usePlotStore(useShallow(s => s))
    useEffect(()=>{
        if (!useRayMarch && interpPixels) setUseRayMarch(true)
    }, [interpPixels, useRayMarch])
    return (
        <>
            <div className='flex flex-col gap-1'>
                <FieldLabel help={<div className='flex flex-col'>
                    <span>Change between DDA or Raymarching render method.</span>
                    <span><b>DDA</b> is more performant than Raymarching and doesn't produce artifacts.</span>
                    <span><b>Raymarching</b> can interpolate and create softer volumes</span>
                </div>}>
                    Renderer
                </FieldLabel>
                <Switcher
                    className={`!mb-0 ${interpPixels ? 'opacity-40 !cursor-default' : ''}`}
                    leftText='DDA'
                    rightText='Raymarch'
                    state={!useRayMarch}
                    onClick={()=> setUseRayMarch(!useRayMarch)}
                />
            </div>
            <Hider show={useRayMarch}>
                <SliderField
                    label='Quality'
                    help='Increase the accuracy of Raymarching steps. Reduces performance'
                    min={50} max={1000} step={50}
                    value={quality}
                    onChange={setQuality}
                    ends={['Worse', 'Better']}
                />
            </Hider>
            <div className='grid grid-cols-[auto_1fr] items-center gap-2'>
                <FieldLabel>Mode</FieldLabel>
                <QuickSelect
                    value={volumeMode}
                    onValueChange={(val: string) => setVolumeMode(val as typeof volumeMode)}
                    className='w-full min-w-0'
                >
                    <SelectItem value='additive'>Additive</SelectItem>
                    <SelectItem value='max'>Max Intensity</SelectItem>
                    <SelectItem value='min'>Min Intensity</SelectItem>
                </QuickSelect>
            </div>
            <BivariateSelector />
            <SliderField
                label='Transparency'
                min={0} max={10} step={0.2}
                value={transparency}
                onChange={setTransparency}
                action={
                    <QuickTip message='Choose whether to clip higher or lower values first.'>
                        <Button
                            variant='outline'
                            size='sm'
                            className='h-6 w-[50%] px-2 gap-1 text-xs cursor-pointer'
                            onClick={()=>setRevTransparency(!revTransparency)}
                        >
                            <FaLongArrowAltUp style={{ rotate: revTransparency ? '180deg' : '', transition: '0.2s' }} />
                            {`${revTransparency ? 'High' : 'Low'} clip`}
                        </Button>
                    </QuickTip>
                }
            />
            <Field
                label='Transparency scale'
                help='This is the raised power for transparency. Higher values "Squash" lower values while lower values help bring them out. 1 is linear.'
            >
                <Input className='h-7' type='number' value={vTransferScale} step={0.1} min={0} onChange={e => setVTransferScale(parseFloat(e.target.value))} />
            </Field>
            <SwitchField
                id='scale-by-clip'
                label='Scale by clip'
                help='Transparency is scaled from dataset minimum to maximum. Lower values are more transparent. When enabled - transparency scales based on the cropped values below.'
                checked={vTransferRange}
                onChange={setVTransferRange}
            />
        </>
    )
}

const PointOptions = () => {
    const {scalePoints, scaleIntensity, pointSize, timeScale,
        setPointSize, setScaleIntensity, setScalePoints, setTimeScale} = usePlotStore(useShallow(s => s))

    return (
        <>
            <SliderField
                label='Point size'
                min={0.01} max={2} step={0.02}
                value={pointSize}
                onChange={setPointSize}
            />
            <BivariateSelector />
            <SwitchField
                id='scale-by-value'
                label='Scale by value'
                checked={scalePoints}
                onChange={setScalePoints}
            />
            <Hider show={scalePoints}>
                <SliderField
                    label='Scale intensity'
                    min={1} max={100} step={1}
                    value={scaleIntensity}
                    onChange={setScaleIntensity}
                />
            </Hider>
            <SliderField
                label='Time dimension scale'
                min={0.05} max={5} step={0.05}
                value={timeScale}
                onChange={setTimeScale}
                action={timeScale != 1 &&
                    <QuickTip message='Reset'>
                        <Button variant='ghost' size='icon-sm' className='size-6 cursor-pointer' onClick={() => setTimeScale(1)}>
                            <RxReset />
                        </Button>
                    </QuickTip>
                }
            />
        </>
    )
}

const FlatOptions = () => {
    const {displacement, displaceFaces, offsetNegatives, rotateFlat,
        setDisplacement, setDisplaceFaces, setOffsetNegatives, setResetCamera} = usePlotStore(useShallow(s => s))
    return (
        <>
            <Switcher
                className='!mb-0'
                leftText='Flat'
                rightText='Displace'
                state={!displaceFaces}
                onClick={()=>{
                    if (displaceFaces) setResetCamera(!usePlotStore.getState().resetCamera)
                    setDisplaceFaces(!displaceFaces)
                    usePlotStore.setState({rotateFlat: false})
                }}
            />
            <Hider show={displaceFaces}>
                <Group>
                    <BivariateSelector />
                    <SliderField
                        label='Displacement'
                        min={0} max={100} step={2}
                        value={displacement}
                        onChange={setDisplacement}
                    />
                    <SwitchField id='offset-switch' label='Offset negatives' checked={offsetNegatives} onChange={setOffsetNegatives} />
                    <SwitchField id='rotate-switch' label='Rotate' checked={rotateFlat} onChange={e => usePlotStore.setState({rotateFlat: e})} />
                </Group>
            </Hider>
        </>
    )
}

const SphereOptions = () => {
    const {sphereResolution, displacement, displaceFaces, offsetNegatives,
        setSphereResolution, setDisplacement, setDisplaceFaces, setOffsetNegatives} = usePlotStore(useShallow(s => s))
    const maxSurfaceDisp = 2;
    const maxFaceDisplacement = 15*maxSurfaceDisp;

    return (
        <>
            <div className='flex flex-col gap-2'>
                <FieldLabel>Displacement mode</FieldLabel>
                <Switcher
                    className='!mb-0'
                    leftText='Surface'
                    rightText='Faces'
                    state={!displaceFaces}
                    onClick={() => {
                        setDisplaceFaces(!displaceFaces);
                        setDisplacement(displacement * (!displaceFaces ? maxFaceDisplacement/maxSurfaceDisp : maxSurfaceDisp/maxFaceDisplacement))
                    }}
                />
            </div>
            <BivariateSelector />
            <SliderField
                label='Displacement'
                min={0} max={!displaceFaces ? maxSurfaceDisp : maxFaceDisplacement} step={0.2}
                value={displacement}
                onChange={setDisplacement}
            />
            <Hider show={displaceFaces}>
                <SwitchField id='offset-switch' label='Offset negatives' checked={offsetNegatives} onChange={setOffsetNegatives} />
            </Hider>
            <Hider show={!displaceFaces}>
                <SliderField
                    label='Displacement resolution'
                    min={4} max={100} step={4}
                    value={sphereResolution}
                    onChange={setSphereResolution}
                />
            </Hider>
        </>
    )
}

const NumberField = ({label, value, onChange} : {label: string, value: number, onChange: (val: number) => void}) => (
    <div className='flex flex-col gap-1'>
        <span className='text-xs text-muted-foreground'>{label}</span>
        <Input className='h-8' type='number' value={value} onChange={e => onChange(parseFloat(e.target.value))} />
    </div>
)

const SpatialExtent = () => {
    const {lonExtent, latExtent, lonResolution, latResolution, originalExtent,
        setLonExtent, setLatExtent, setLonResolution, setLatResolution} = usePlotStore(useShallow(s => s))
    const isOriginal = originalExtent.slice(0,2).every((val, idx) => val == lonExtent[idx]) &&
        originalExtent.slice(2).every((val, idx) => val == latExtent[idx])
    return (
        <Section title='Spatial Extent' className='p-1'>
            <div className='grid grid-cols-2 gap-2'>
                <NumberField label='Min lon' value={lonExtent[0]} onChange={v => setLonExtent([v, lonExtent[1]])} />
                <NumberField label='Max lon' value={lonExtent[1]} onChange={v => setLonExtent([lonExtent[0], v])} />
                <NumberField label='Min lat' value={latExtent[0]} onChange={v => setLatExtent([v, latExtent[1]])} />
                <NumberField label='Max lat' value={latExtent[1]} onChange={v => setLatExtent([latExtent[0], v])} />
                <NumberField label='Lon resolution' value={lonResolution} onChange={setLonResolution} />
                <NumberField label='Lat resolution' value={latResolution} onChange={setLatResolution} />
            </div>
            <Button
                variant='pink'
                size='sm'
                className='cursor-pointer'
                disabled={isOriginal}
                onClick={()=>{
                    setLonExtent([originalExtent[0], originalExtent[1]])
                    setLatExtent([originalExtent[2], originalExtent[3]])
                }}
            >
                Reset extent
            </Button>
        </Section>
    )
}

const GlobalOptions = () => {
    const {valueRange, showBorders, borderWidth, borderColor, nanColor, nanTransparency, plotType, interpPixels, useBorderTexture,
        setValueRange, setShowBorders, setBorderColor, setNanColor, setNanTransparency, setInterpPixels} = usePlotStore(useShallow(s => s))
    const {analysisMode, analysisDim:axis} = useAnalysisStore(useShallow(s => s))
    const {borderCompatible, transferFunc} = useGlobalStore(useShallow(s => ({
        borderCompatible: s.borderCompatible, transferFunc: s.transferFunc
    })))
    const isPC = plotType == 'point-cloud'
    const valueScales = useValueScales()
    // Slider labels in transferFunc space, matching what the shader thresholds against
    const theseScales = useMemo(() => {
        const trans = transformedRange(transferFunc, valueScales.minVal, valueScales.maxVal)
        return trans ? {...valueScales, ...trans} : valueScales
    }, [transferFunc, valueScales])
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
        <Section title='Global Settings' className='mt-2 bg-[var(--global-settings)]'>
            <div className='flex flex-col gap-2'>
                <FieldLabel>Value cropping</FieldLabel>
                <BivariateSelector />
                <MinMaxSlider
                    range={valueRange}
                    setRange={setValueRange}
                    valueScales={theseScales}
                    min={0}
                />
            </div>
            {!isPC &&
                <>
                    <SliderField
                        label='NaN transparency'
                        min={0} max={1} step={0.05}
                        value={nanTransparency}
                        onChange={setNanTransparency}
                    />
                    <ColorField label='NaN color' defaultValue={nanColor} onChange={handleColorChange(setNanColor)} />
                    <SwitchField id='interpolate-pixels' label='Interpolate pixels' checked={interpPixels} onChange={setInterpPixels} />
                </>
            }
            <Masker/>
            <Reprojection />
            <SwitchField
                id='show-borders'
                label='Show borders'
                help={borderCompatible ? undefined : 'Browzarr was unable to parse spatial extent'}
                checked={showBorders}
                onChange={setShowBorders}
                disabled={!borderCompatible || (analysisMode && Boolean(axis))}
            />
            <Hider show={showBorders && !(analysisMode && !axis)}>
                <Group>
                    <Switcher
                        className='!mb-0'
                        leftText='Texture'
                        rightText='Lines'
                        state={useBorderTexture}
                        onClick={()=>usePlotStore.setState({useBorderTexture:!useBorderTexture})}
                    />
                    <Hider show={useBorderTexture}>
                        <SliderField
                            label='Border width'
                            min={0.01} max={0.4} step={0.01}
                            value={borderWidth}
                            onChange={v => usePlotStore.setState({borderWidth: v})}
                        />
                    </Hider>
                    <ColorField label='Border color' defaultValue={borderColor} onChange={handleColorChange(setBorderColor)} />
                </Group>
            </Hider>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="secondary" size="sm" className='w-full cursor-pointer'>
                        Adjust extent
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="overflow-y-auto p-2 w-[280px] max-h-[70vh]">
                    <SpatialExtent/>
                </PopoverContent>
            </Popover>
        </Section>
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
    })
    resetProjection();
}

const AdjustPlot = () => {
    const popoverSide = usePanelSide();
    const [open, setOpen] = useState(false);
    const plotOn = useGlobalStore(s => s.plotOn)
    const plotType = usePlotStore(s => s.plotType)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <PanelButton
                    icon={<HiAdjustmentsHorizontal className="size-8" />}
                    tooltip="Plot settings"
                    disabled={!plotOn}
                />
            </PopoverTrigger>
            <PopoverContent
                side={popoverSide}
                onInteractOutside={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => e.preventDefault()} // Prevents tooltip from opening automatically
                className={`relative grid w-[260px] mt-2 mr-1 ${popoverSide === 'top' ? 'mb-1' : ''}`}
            >
                <div className='flex justify-between w-full items-center h-6'>
                    <QuickTip message='Reset visual state'>
                        <Button variant='ghost' size='icon' className='cursor-pointer' onClick={resetViz} aria-label='Reset visual state'>
                            <RxReset className='size-5'/>
                        </Button>
                    </QuickTip>
                    <QuickTip message='Close settings'>
                        <Button variant="ghost" size="icon" className='cursor-pointer' onClick={() => setOpen(false)} aria-label="Close settings">
                            <RiCloseLargeLine className="size-5" />
                        </Button>
                    </QuickTip>
                </div>

                <div className={`overflow-y-auto no-scrollbar -mx-4 px-1 pt-2 ${popoverSide === 'top' ? 'max-h-[80vh]' : 'max-h-[70vh]'}`}>
                    <Section title='Plot Settings' className='bg-[var(--plot-settings)]'>
                        {plotType === 'volume' && <VolumeOptions />}
                        {plotType === 'point-cloud' && <PointOptions />}
                        {plotType === 'sphere' && <SphereOptions/>}
                        {(plotType === 'volume' || plotType === 'point-cloud') && <AxisCropper/>}
                        {plotType === 'flat' && <FlatOptions />}
                    </Section>
                    <GlobalOptions />
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default AdjustPlot
