import React, { useState } from 'react'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useZarrStore } from '@/GlobalStates/ZarrStore'
import { BiExport } from "react-icons/bi";
import { FiCopy } from "react-icons/fi";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from '../button';

function pick(obj: Record<string, any>, keys: string[]) {
    return Object.fromEntries(
        keys.map((k) => [k, obj[k]])
    )
}
const globalValues = [
    'initStore',
    'storeFromURL',
    'variable',
]

const plotValues = [
    'plotType',
    'pointSize',
    'scalePoints',
    'scaleIntensity',
    'timeScale',
    'valueRange',
    'xRange',
    'yRange',
    'zRange',
    'showPoints',
    'linePointSize',
    'lineWidth',
    'lineColor',
    'pointColor',
    'useLineColor',
    'lineResolution',
    'cOffset',
    'cScale',
    'useFragOpt',
    'useCustomColor',
    'useCustomPointColor',
    'transparency',
    'nanTransparency',
    'nanColor',
    'showBorders',
    'borderColor',
    'lonExtent',
    'latExtent',
    'originalExtent',
    'lonResolution',
    'latResolution',
    'colorIdx',
    'vTransferRange',
    'vTransferScale',
    'sphereResolution',
    'displacement',
    'displaceSurface',
    'offsetNegatives',
    'zSlice',
    'ySlice',
    'xSlice',
    'interpPixels',
    'useOrtho',
    'rotateFlat',
    'fillValue',
    'coarsen',
    'kernel',
    'useBorderTexture',
    'maskValue',
    'borderWidth',
    'cameraPosition',
    'disablePointScale',
]

const zarrValues = [
    'zSlice',
    'ySlice',
    'xSlice',
    'compress',
    'useNC', // This one is more static and so toggling switch doesn't break all other logic
    'fetchNC',
    'coarsen',
    'kernelSize',
    'kernelDepth',
    'icechunkOptions',
    'fetchOptions',
    'fetchKey',
    'blobKey'
]


export const ParameterExport = () => {
    const [copied, setCopied] = useState(false);

    function generateURL(){
        const {camera} = usePlotStore.getState()
        usePlotStore.setState({cameraPosition:camera?.position}) // Set Camera position first to copy visual state
        const fullObj = {
            globalState: pick(useGlobalStore.getState(), globalValues),
            plotState: pick(usePlotStore.getState(), plotValues),
            zarrState: pick(useZarrStore.getState(), zarrValues),
        }
        const jString = JSON.stringify(fullObj, (_, v) => typeof v === 'bigint' ? v.toString() : v)
        const params = `https://browzarr.io/latest/?data=${encodeURIComponent(jString)}` 
        return params
    }

    const copyToClipboard = async () => {
        const url = generateURL()
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500); //Use for a pop-up that fades away
    };
    
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer" 
                >
                    <BiExport className='size-8'/>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                side="right"
                className='w-[200px]'
            >
                <div
                    className='flex items-center'
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer" 
                        onClick={copyToClipboard}
                    >
                        <FiCopy className='size-5'/>
                    </Button>
                        <div
                            style={{
                                opacity:copied ? 1 : 0,
                                transition:'0.75s'
                            }}
                        >
                            Copied!
                        </div>
                </div> 
            </PopoverContent>
        </Popover>
    )
}


