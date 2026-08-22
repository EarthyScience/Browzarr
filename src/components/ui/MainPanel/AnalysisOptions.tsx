'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useShallow } from 'zustand/shallow';
import '../css/MainPanel.css';
import { PiMathOperationsBold } from "react-icons/pi";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {Hider, KernelVisualizer, QuickTip, Button, Input} from "@/components/ui";
import { BsFillQuestionCircleFill } from "react-icons/bs";
import { Switch } from '../switch';
import { HandleKernelNums } from '@/utils/HelperFuncs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BsBoxArrowLeft } from "react-icons/bs";
import { RxReset } from "react-icons/rx";

const singleVarReductionOps = [
  { value: 'Mean', label: 'Mean' },
  { value: 'Min', label: 'Min' },
  { value: 'Max', label: 'Max' },
  { value: 'StDev', label: 'Standard Deviation' },
  { value: 'LinearSlope', label: 'Linear Slope' },
];

const singleVar3DOps = [
  { value: 'Mean3D', label: 'Mean' },
  { value: 'Min3D', label: 'Min' },
  { value: 'Max3D', label: 'Max' },
  { value: 'StDev3D', label: 'Standard Deviation' },
];

const singleVar2DOps = [
  { value: 'Mean2D', label: 'Mean' },
  { value: 'Min2D', label: 'Min' },
  { value: 'Max2D', label: 'Max' },
  { value: 'StDev2D',label: 'Standard Deviation' },
];

const multiVar2DOps = [
    { value: 'Correlation2D', label: 'Correlation' },
    { value: 'TwoVarLinearSlope2D', label: 'Linear Slope' },
    { value: 'Covariance2D', label: 'Covariance' },
];

const multiVar3DOps = [
    { value: 'Correlation3D', label: 'Correlation' },
    { value: 'TwoVarLinearSlope3D', label: 'Linear Slope' },
    { value: 'Covariance3D', label: 'Covariance' },
];


const webGPUError = <div className="m-0 p-5 font-sans flex-column justify-center items-center">
    <span className="text-5xl mb-4 block self-center">⚠️</span>
    <h1 className="text-2xl font-bold mb-4">WebGPU Not Available</h1>
    <p className="text-base leading-relaxed mb-1 opacity-95">
      WebGPU is not supported or enabled in your current browser. This feature is required for GPU-accelerated computing.
    </p>

    <div className="bg-[--card] bg-opacity-15 rounded-xl border border-[--secondary] p-3 border-opacity-20">
      <h3 className="m-0 mb-4 text-lg font-semibold">Try These Solutions:</h3>
      <ul className="suggestion-list">
        <li>Switch to a Chrome-based browser (Chrome, Edge, Brave)</li>
        <li>Use Safari on macOS (version 14.1 or later)</li>
        <li>Enable WebGPU in your browser&apos;s experimental features</li>
        <li>Update your browser to the latest version</li>
      </ul>
    </div>
  </div>

const AnalysisOptions = () => {
	const {plotOn, variable, variables, dimNames, activeIndices, initStore, isFlat, setTimeSeries, setValueScales} = useGlobalStore(useShallow(s => s));

	const previousStore = useRef<string>(initStore)
	const [incompatible, setIncompatible] = useState(false); 
	const [operation, setComponentOperation] = useState(useAnalysisStore.getState().operation)
	const operationString = useRef('') // #vars:#dims:operation
	const {
		useTwo, kernelSize, kernelDepth,
		kernelOperation, axis, variable2, analysisMode,
		reverseDirection, valueScalesOrig,
		setAxis, setOperation, setUseTwo,
		setVariable2, setKernelSize, setKernelDepth,
		setKernelOperation, setAnalysisMode,
		setReverseDirection, setAnalysisStore,
		setAnalysisDim
	} = useAnalysisStore(useShallow(s => s));
	const reFetch = useZarrStore(s => s.reFetch)
	const setOpString = (operation: string) => {
		operationString.current = operation
		setComponentOperation(operation.split(':').at(-1) as string)
	};
	const [showError, setShowError] = useState<boolean>(false);
	useEffect(() => {
		const checkWebGPU = async () => {
			if (!navigator.gpu){
				setShowError(true);
				return;
			}
			try {
				await navigator.gpu.requestAdapter();
				setShowError(false);
			} catch {setShowError(true);}
		};
		checkWebGPU();
	}, [plotOn]);

	useEffect(()=>{ // Changing stores makes it so you can't use two variable operations. 
		if(initStore != previousStore.current)setIncompatible(true)
		else setIncompatible(false)
	},[initStore])

	useEffect(()=>{ // When data is downloaded (indicated by changes in refetch) The newly plotted and any future variables are compatible until initStore changes. 
		setIncompatible(false);
		previousStore.current = initStore
		setAnalysisStore(initStore)
	},[reFetch])

	useEffect(()=>{
		if (isFlat)setKernelDepth(1)
		else setKernelDepth(3)
	},[isFlat])

	useEffect(()=>{
		setKernelOperation("Default")
		setOperation("Default")
		setAnalysisMode(false)
	},[variable])

	const [newDim, setNewDim] = useState(0)
	useEffect(()=>{
		setNewDim(axis)
	},[axis])

	const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
	useEffect(() => {
		const handleResize = () => {
		setPopoverSide(window.innerWidth < 768 ? "top" : "left");
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <div style={plotOn ? {} : { pointerEvents: 'none' } }>
           <QuickTip message='Apply operations'>
				<Button
                  variant="ghost"
                  size="icon"
                  className="size-10 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
                  style={{
                      color: plotOn ? '' : 'var(--text-disabled)'
                    }}
                >
					<PiMathOperationsBold className="size-8"/>
                </Button>
		   </QuickTip>
          </div>
        </PopoverTrigger>
        <PopoverContent
          side={popoverSide}
          className="analysis-info select-none"
          >
          {showError ? (
            webGPUError
          ) : (
            <>
              {/*  */}
              {!isFlat && 
                <Button
                className="cursor-pointer active:scale-[0.95] bg-gray-500"
                disabled={incompatible}
                onClick={() => {
                  setUseTwo(!useTwo);
                  setOperation('Default');
                }}
              >
                {useTwo ? 'Use One \n Variable' : 'Use Two Variables'}
              </Button>}

			  {/* MAIN GRID */}
              <div className='grid grid-cols-[70px_auto] place-items-center gap-2'>
				{/* CURRENT VARIABLE */}
                <h1>Current Variable</h1>
				<div className='flex w-full'>
					{analysisMode ?
					<>
					<div className='rounded-[6px] self-center relative border border-gray-150 py-[5px] px-1'>
						<div className='flex px-4 items-center'>
							<span className='pr-2'>Current</span> 
							<QuickTip message='Operations will be applied to the newly generated data. '>
							<BsFillQuestionCircleFill/>
							</QuickTip>
						</div>
					</div>
					<Button
						variant='ghost'
						className='pl-4 ml-4'
						onClick={e=>{useAnalysisStore.setState({ analysisMode: false, analysisDim: null, variable2: 'Default' }); if(valueScalesOrig){setValueScales(valueScalesOrig)}}}
					>
						<RxReset />
					</Button>
					</>
					:
					<div className='rounded-[6px] w-full border border-grey-150 py-[5px] justify-center px-2'>
						{variable}
					</div>					
					}
				</div>
				<Hider className='col-span-2 w-full' show={useTwo}>
					<div className='grid grid-cols-[70px_auto] place-items-center gap-2'>
						<h1>Second Variable</h1>
						<Select 
							onValueChange={setVariable2}
						>
						<SelectTrigger className='w-full'>
							<SelectValue placeholder={ "Select..."} />
						</SelectTrigger>
						<SelectContent>
							{variables.map((iVar, idx) => { //Dont allow correlation of two variables
							if (iVar == variable){
								return null;
							}
							return (
							<SelectItem key={idx} value={iVar}>
								{iVar}
							</SelectItem>)
						})}
						</SelectContent>
						</Select>
					</div>
				</Hider>
				{/* OPERATION TYPE */}
				<h1>Operation</h1>
				{useTwo ? 
				<Select 
					defaultValue={operation} 
					onValueChange={setOpString}
				>
					<SelectTrigger className='w-full'>
						<SelectValue
						placeholder='Select...'
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
						<SelectLabel>Dimension Reduction</SelectLabel>
						{multiVar2DOps.map((op, idx) => (
							<SelectItem key={idx} value={`2:2:${op.value}`}>
							{op.label}
							</SelectItem>
						))}
						</SelectGroup>

						<SelectGroup>
						<SelectLabel>Three Dimensional</SelectLabel>
						<SelectItem value="2:3:Convolution">Convolution</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
				:
				<Select defaultValue={operation} onValueChange={setOpString}>
					<SelectTrigger className='w-full'>
						<SelectValue
						placeholder='Select...'
						/>
					</SelectTrigger>
					<SelectContent>
						{!isFlat &&
						<SelectGroup>
						<SelectLabel>Dimension Reduction</SelectLabel>
						{singleVarReductionOps.map((op, idx) => (
							<SelectItem key={idx} value={`1:2:${op.value}`}>
							{op.label}
							</SelectItem>
						))}
						</SelectGroup>}
						<SelectGroup>
						<SelectLabel>{isFlat ? '' : 'Three Dimensional'}</SelectLabel>
						<SelectItem value="1:3:Convolution">Convolution</SelectItem>
						{!isFlat && !analysisMode &&<SelectItem value="1:3:CUMSUM3D">CUMSUM</SelectItem>}
						</SelectGroup>
					</SelectContent>
				</Select>
				}
				{(operation != 'Convolution') && <>
					<h1>Axis</h1>
					<div className='flex justify-between w-full'>
						<Select onValueChange={e => setNewDim(parseInt(e))}>
							<SelectTrigger className='w-full' style={{ width: ['CUMSUM3D', 'LinearSlope'].includes(operation) ? '50%' : '100%'}}>
								<SelectValue placeholder={dimNames[activeIndices[newDim]] ?? "Select Axis"} />
							</SelectTrigger>
							<SelectContent>
								{activeIndices.map((origIdx, dataShapeIdx) => (
								<SelectItem key={dataShapeIdx} value={String(dataShapeIdx)}>
									{dimNames[origIdx]}
								</SelectItem>
								))}
							</SelectContent>
						</Select>
						{['CUMSUM3D', 'LinearSlope'].includes(operation) && 
						<QuickTip message='Swap direction of operation'>
							<div className='flex justify-around w-[50%] items-center '>
								<label htmlFor="reverse-axis" style={{textAlign:'left'}}>Rev.</label>
								<Switch id='reverse-axis' checked={reverseDirection == 1} onCheckedChange={e=> {setReverseDirection(e ? 1 : 0)}}/>
							</div>
						</QuickTip>
						}
					</div>
				</>}
				{operation == 'Convolution' &&
				<>
				<h1>Kernel Op.</h1>
				<Select onValueChange={setKernelOperation}>
					<SelectTrigger className='w-full'>
					<SelectValue
						placeholder={
						kernelOperation === 'Default' ? 'Select...' : kernelOperation
						}
					/>
					</SelectTrigger>
					<SelectContent>
					{useTwo && multiVar3DOps.map((op, idx) =>  (
						<SelectItem key={idx} value={op.value}>
							{op.label}
						</SelectItem>
						)
					)}
					{!useTwo && isFlat ? 
						singleVar2DOps.map((op, idx) =>  (
							<SelectItem key={idx} value={op.value}>
							{op.label}
							</SelectItem>
						)) 
						:
						singleVar3DOps.map((op, idx) =>  (
							<SelectItem key={idx} value={op.value}>
							{op.label}
							</SelectItem>
						))
					}
					</SelectContent>
				</Select>
				<h1>Kernel Size</h1>
				<div className={`grid grid-cols-${isFlat ? 1 : 2} w-full`}>
					<div>
						<h2>Size</h2>
						<Input type='number' min='1' step='2' value={String(kernelSize)} 
							onChange={e=>setKernelSize(parseInt(e.target.value))}
							onBlur={e=>setKernelSize(HandleKernelNums(e.target.value))}
						/>
					</div>
					{!isFlat && <div>
						<h2>Depth</h2>
						<Input type='number' min='1' step='2' value={String(kernelDepth)} 
							onChange={e=>setKernelDepth(parseInt(e.target.value))}
							onBlur={e=>setKernelDepth(HandleKernelNums(e.target.value))}
						/>
					</div>}
				</div>
				<div className='col-span-2 w-full place-items-center'>
					<KernelVisualizer size={Math.min(kernelSize,15)} depth={Math.min(kernelDepth, 15)} />
				</div>
				</> }
			</div>
              <Button
                onClick={()=>{
                  useAnalysisStore.setState({useEditor:true})
                }}
                className='cursor-pointer'
              >
                <BsBoxArrowLeft /> Open Shader Editor
              </Button>
              <Button
                className="cursor-pointer active:scale-[0.95]"
                disabled={
                  operation === 'Default' ||
                  (operation === 'Convolution' && kernelOperation === 'Default') ||
                  (useTwo && variable2 === 'Default')
                }
                variant='pink'
                onClick={() => {
                  setAxis(newDim)
                  setAnalysisDim(operation == 'CUMSUM3D' ? null : newDim)
                  setTimeSeries({});
                }}
              >
                Execute
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
};

export default AnalysisOptions;