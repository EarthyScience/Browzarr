import React, { useRef, useState } from 'react'
import { useGlobalStore, defaultGlobals } from '@/GlobalStates/GlobalStore'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useZarrStore } from '@/GlobalStates/ZarrStore'
import { BiExport } from "react-icons/bi";
import { FiCopy } from "react-icons/fi";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from '../button';
import { useImageExportStore } from '@/GlobalStates/ImageExportStore';
import { Select, SelectValue, SelectItem, SelectContent, SelectTrigger, QuickTip } from '@/components/ui'
import { BsFiletypeJson } from "react-icons/bs";
import { IoLink } from "react-icons/io5";
import { createPortal } from 'react-dom';

function pick(obj: Record<string, any>, keys: string[]) {
    return Object.fromEntries(
        keys.map((k) => [k, obj[k]])
    )
}
const globalValues = [
    'initStore',
    'storeFromURL',
    'variable',
    'colormapName',
    'flipColormap',
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
    'is360Deg',
]

const zarrValues = [
    'zSlice',
    'ySlice',
    'xSlice',
    'ndSlices',
    'axisMapping',
    'compress',
    'useNC', // This one is more static and so toggling switch doesn't break all other logic
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
	const [copiedLoc, setCopiedLoc] = useState([0,0])
	const [exportVal, setExportVal] = useState("Full State");
	const states = ['Full State', 'Keyframes', 'Camera'];

	const getGlobalStateJSON = () =>{
		const {cameraRef} = useImageExportStore.getState();
        usePlotStore.setState({cameraPosition:cameraRef?.current?.position}) // Set Camera position first to copy visual state
        const fullObj = {
            globalState: pick(useGlobalStore.getState(), globalValues),
            plotState: pick(usePlotStore.getState(), plotValues),
            zarrState: pick(useZarrStore.getState(), zarrValues),
        }
		return JSON.stringify(fullObj, (_, v) => typeof v === 'bigint' ? v.toString() : v);;
	}

	const getJSON = () =>{
		if (exportVal === "Full State"){
			return getGlobalStateJSON()
		} else if (exportVal === "Camera"){
			const {cameraRef} = useImageExportStore.getState();
			const position = cameraRef?.current?.position;
			//@ts-ignore zoom does exist
			const zoom = cameraRef?.current?.zoom;
			const cameraObj = {
				position,
				...(zoom && { zoom })
			};
			return JSON.stringify(cameraObj, null, 2);
		} else {
			const {keyFrames} = useImageExportStore.getState();
			return JSON.stringify(keyFrames?? {}, null, 2)
		}
	}

    function generateURL(){
        let jString;
		if (exportVal === "Full State")jString = getGlobalStateJSON();
		else jString = JSON.stringify(
			{plotState: {cameraPosition: usePlotStore.getState().cameraPosition}}, null, 2
		);
        const params = `https://browzarr.io/latest/?data=${encodeURIComponent(jString)}`;
        return params;
    }

	const copyToClipboard = async (e: React.MouseEvent<HTMLButtonElement>, text:string) => {
		const {pageX, pageY} = e
		setCopiedLoc([pageX, pageY])
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500); //Use for a pop-up that fades away
    };

	const copyJSON = (e:React.MouseEvent<HTMLButtonElement>) => copyToClipboard(e, getJSON());
	const copyURL = (e: React.MouseEvent<HTMLButtonElement>) => copyToClipboard(e, generateURL());

	const exportToJSON = () => {
		const blob = new Blob([getJSON()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = `${exportVal}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	}

    const isKeyframes = exportVal == 'Keyframes';
    return (
        <Popover>
            <PopoverTrigger asChild>
				<QuickTip message='Export parameters as JSON or a sharable URL'>
					<div>
					<Button 
						variant="ghost"
						size="icon"
						className="cursor-pointer" 
					>
						<BiExport className='size-8'/>
					</Button>
					</div>
				</QuickTip>
            </PopoverTrigger>
            <PopoverContent
                side="right"
            >
                <div
                    className='flex items-center'
                >
					<div className='flex flex-col items-center'>
					<b className='mb-2'>Export State</b>
                    <Select value={exportVal} onValueChange={e=> setExportVal(e)}>
						<SelectTrigger>
							<SelectValue defaultValue={exportVal}/>
						</SelectTrigger>
                        <SelectContent>
                            {states.map((val, idx) => (
                                <SelectItem key={idx} value={val}>
                                    {val}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
					</div>
					<div className='flex items-center'>
						{/* JSON Options */}
						<div className='flex py-1 px-3 bg-[#0055aa44] rounded-md mx-2'>
							<div className='flex flex-col align-center items-center'>
								<Button
									id='copy2'
									variant="ghost"
									size="icon"
									onClick={copyJSON}
								>
									<FiCopy className='size-5'/>
								</Button>
								<label className='text-[10px]' htmlFor="copy2">Copy</label>
							</div>
							<div className='flex flex-col align-center items-center'>
								<Button
									id='export2'
									variant='ghost'
									size="icon"
									onClick={exportToJSON}
								>
									<BsFiletypeJson className='size-5'/>
								</Button>
								<label className='text-[10px]' htmlFor="export2">Save</label>
							</div>
						</div>
						<div className='flex flex-col align-center items-center'
							style={{
								visibility: isKeyframes ? 'hidden' : 'visible'
							}}
						>
							<Button
								id='2url'
								variant='ghost'
								size="icon"
								onClick={copyURL}
							>
								<IoLink className='size-5'/>
							</Button>
							<label className='text-[10px]' htmlFor="2url">URL</label>
						</div>
					</div>

					
                </div> 
			{createPortal(<div
				style={{
					left:`${copiedLoc[0]}px`,
					top:`${copiedLoc[1]}px`,
					position:'fixed',
					transform:'translateY(-100%)',
					zIndex:100
				}}
			>
				<div
					style={{
						opacity:copied ? 1 : 0,
						transition:'0.75s',
					}}
				>
					Copied!
				</div>
			</div>, document.body)
			}
            </PopoverContent>
        </Popover>
    )
}


