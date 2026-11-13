import React, { useRef, useState } from 'react'
import { useGlobalStore } from '@/stores/GlobalStore'
import { usePlotStore } from '@/stores/PlotStore'
import { useZarrStore } from '@/stores/ZarrStore'
import { BiExport } from "react-icons/bi";
import { FiCopy } from "react-icons/fi";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from '@/components/ui/button';
import { useImageExportStore } from '@/stores/ImageExportStore';
import { useColormapStore } from '@/stores/ColormapStore';
import { useGraphStore } from '@/stores/GraphStore';
import { Select, SelectValue, SelectItem, SelectContent, SelectTrigger, QuickTip } from '@/components/ui'
import { BsFiletypeJson } from "react-icons/bs";
import { IoLink } from "react-icons/io5";
import { createPortal } from 'react-dom';

function pick(obj: Record<string, any>, keys: string[]) {
    return Object.fromEntries(
        keys.map((k) => [k, obj[k]])
    )
}
const bigintReplacer = (_: string, v: any) => typeof v === 'bigint' ? v.toString() : v;
const globalValues = [
    'initStore',
    'storeFromURL',
    'variable',
]

const colormapValues = [
    'colormapName',
    'flipColormap',
]

const graphValues = [
    'showPoints',
    'lineWidth',
    'lineColor',
    'pointColor',
    'useLineColor',
    'lineResolution',
    'useCustomColor',
    'useCustomPointColor',
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
    'cOffset',
    'cScale',
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
            colormapState: pick(useColormapStore.getState(), colormapValues),
            graphState: pick(useGraphStore.getState(), graphValues),
        }
		return JSON.stringify(fullObj, bigintReplacer);
	}

	// Flat key=value params, matching what StoreInitializer reads
	const getFlatParams = () => {
		const {cameraRef} = useImageExportStore.getState();
		usePlotStore.setState({cameraPosition:cameraRef?.current?.position})
		const params = new URLSearchParams();
		const flat = {
			...pick(useZarrStore.getState(), zarrValues),
			...pick(usePlotStore.getState(), plotValues),
			...pick(useGraphStore.getState(), graphValues),
			...pick(useColormapStore.getState(), colormapValues),
			...pick(useGlobalStore.getState(), globalValues),
		}
		for (const [key, val] of Object.entries(flat)) {
			if (val === undefined || val === null) continue;
			if (key === 'initStore') {
				// StoreInitializer re-adds the "local:" prefix; browser-uploaded stores (local_*) can't be restored
				if (typeof val !== 'string' || !val || val.startsWith('local_')) continue;
				params.set(key, val.replace(/^local:/, ''));
			} else {
				params.set(key, JSON.stringify(val, bigintReplacer));
			}
		}
		return params;
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
		let params: URLSearchParams;
		if (exportVal === "Full State") params = getFlatParams();
		else {
			params = new URLSearchParams();
			const {cameraPosition} = usePlotStore.getState();
			if (cameraPosition) params.set('cameraPosition', JSON.stringify(cameraPosition));
		}
		return `https://browzarr.io/latest/?${params.toString()}`;
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


