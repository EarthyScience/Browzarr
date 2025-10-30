'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAnalysisStore, useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import '../css/MainPanel.css';
import { PiMathOperationsBold } from "react-icons/pi";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '../input';
import { Button } from '../button';
import { CiUndo } from "react-icons/ci";
import {KernelVisualizer} from "@/components/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BsFillQuestionCircleFill } from "react-icons/bs";
import { Switch } from '../switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const {plotOn, variable, variables, dimNames, initStore, isFlat, setTimeSeries, setValueScales} = useGlobalStore(useShallow(state => ({
    plotOn: state.plotOn, 
    variable: state.variable,
    variables: state.variables,
    dimNames: state.dimNames,
    initStore: state.initStore,
    isFlat: state.isFlat,
    setTimeSeries: state.setTimeSeries,
    setValueScales: state.setValueScales
  })));

  const previousStore = useRef<string>(initStore)
  const [incompatible, setIncompatible] = useState(false); 
  
  const {
    execute, operation, useTwo, kernelSize, kernelDepth,
    kernelOperation, axis, variable2, analysisMode,
    reverseDirection, valueScalesOrig,
    setExecute, setAxis, setOperation, setUseTwo,
    setVariable2, setKernelSize, setKernelDepth,
    setKernelOperation, setAnalysisMode,
    setReverseDirection, setAnalysisStore,
    setAnalysisDim
  } = useAnalysisStore(useShallow(state => ({
    execute: state.execute, operation: state.operation,
    useTwo: state.useTwo, kernelSize: state.kernelSize,
    kernelDepth: state.kernelDepth, kernelOperation: state.kernelOperation,
    axis: state.axis, variable2: state.variable2, valueScalesOrig: state.valueScalesOrig,
    analysisMode: state.analysisMode, reverseDirection: state.reverseDirection,
    setExecute: state.setExecute, setAxis: state.setAxis,
    setOperation: state.setOperation, setUseTwo: state.setUseTwo,
    setVariable2: state.setVariable2, setKernelSize: state.setKernelSize,
    setKernelDepth: state.setKernelDepth, setKernelOperation: state.setKernelOperation,
    setAnalysisMode: state.setAnalysisMode, setReverseDirection: state.setReverseDirection,
    setAnalysisStore: state.setAnalysisStore, setAnalysisDim: state.setAnalysisDim
    })));

  const {reFetch} = useZarrStore(useShallow(state => ({
    reFetch: state.reFetch,
  })))

  const [showError, setShowError] = useState<boolean>(false);
  
  useEffect(() => {
    const checkWebGPU = async () => {
      if (!navigator.gpu) {
          setShowError(true);
          return;
      }
      try {
          await navigator.gpu.requestAdapter();
          setShowError(false);
      } catch {
          setShowError(true);
      }
    };
    checkWebGPU();
  }, [plotOn]);


  useEffect(()=>{ // Changing stores makes it so you can't use two variable operations. 
    if(initStore != previousStore.current){
      setIncompatible(true)
    }
    else{
      setIncompatible(false)
    }
  },[initStore])

  useEffect(()=>{ // When data is downloaded (indicated by changes in refetch) The newly plotted and any future variables are compatible until initStore changes. 
    setIncompatible(false);
    previousStore.current = initStore
    setAnalysisStore(initStore)
  },[reFetch])

  useEffect(()=>{
    if (isFlat){
      setKernelDepth(1)
    }else{
      setKernelDepth(3)
    }
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

  function HandleKernelNums(e: string){
    const newVal = parseInt(e);
    if (newVal % 2 == 0){
      return Math.max(1, newVal - 1)
    }
    else{
      return newVal
    }
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <div style={plotOn ? {} : { pointerEvents: 'none' } }>
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div>
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
                </div>
              </TooltipTrigger>
              {popoverSide === "left" ? (
                <TooltipContent side="left" align="start">
                  <span>Apply operations</span>
                </TooltipContent>
              ) : (
                <TooltipContent side="top" align="center">
                  <span>Apply operations</span>
                </TooltipContent>
              )}
            </Tooltip>
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

              <table style={{ textAlign: 'right' }}>
                <tbody>
                  {/* Current Plotted Variable */}
                  <tr>
                    <th>Current Variable</th>
                    <td className="text-center w-[100%] align-middle justify-center content-center">
                      <div className='grid grid-cols-[65%_auto] w-[90%] mx-auto'>
                        {analysisMode &&
                        <div className='rounded-[6px] self-center mx-2 relative border border-gray-150 py-[5px] px-1'>
                          <div className='flex justify-around'>
                          Current
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <BsFillQuestionCircleFill/>
                              </TooltipTrigger>
                              <TooltipContent>
                                Operations will be applied to the newly generated data. 
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          
                        </div>}
                        <button 
                          className={`rounded-[6px] self-center ${analysisMode ? null : 'col-span-2'} w-[100%] pl-2 relative border border-gray-150 py-[5px] ${analysisMode ?'hover:scale-[0.95]' : ''} transition-[0.2s]`}
                          style={{
                            cursor: analysisMode ? 'pointer' : '',
                          }}
                          disabled={!analysisMode}
                          onClick={e=>{useAnalysisStore.setState({ analysisMode: false, analysisDim: null, variable2: 'Default' }); if(valueScalesOrig){setValueScales(valueScalesOrig)}}}
                        >
                          {analysisMode && <CiUndo 
                            size={20}
                            style={{
                              position:'absolute',
                              left:'0%',
                              top:'10%'
                            }}
                          />}
                          {analysisMode ? 'Reset' : variable}
                        </button>
                      </div>
                    </td>
                  </tr>
              {useTwo && <>
              <tr>
                <th>Second Variable</th>
                <td>
                    <Select onValueChange={setVariable2}>
                      <SelectTrigger style={{ width: '175px', marginLeft: '18px' }}>
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
                </td>
              </tr>
              </>}
              
              <tr>
                <th>Operation</th>
                {!useTwo && (
                  <td>
                    <Select value={operation} onValueChange={setOperation}>
                      <SelectTrigger style={{ width: '175px', marginLeft: '18px' }}>
                        <SelectValue
                          placeholder='Select...'
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!isFlat &&
                          <SelectGroup>
                          <SelectLabel>Dimension Reduction</SelectLabel>
                          {singleVarReductionOps.map((op, idx) => (
                            <SelectItem key={idx} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>}
                        <SelectGroup>
                          <SelectLabel>{isFlat ? '' : 'Three Dimensional'}</SelectLabel>
                          <SelectItem value="Convolution">Convolution</SelectItem>
                          {!isFlat && !analysisMode &&<SelectItem value="CUMSUM3D">CUMSUM</SelectItem>}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </td>
                )}
                {useTwo && (
                  <td>
                    <Select 
                      value={operation} 
                      onValueChange={setOperation}>
                      <SelectTrigger style={{ width: '175px', marginLeft: '18px' }}>
                        <SelectValue
                          placeholder='Select...'
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Dimension Reduction</SelectLabel>
                          {multiVar2DOps.map((op, idx) => (
                            <SelectItem key={idx} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>

                        <SelectGroup>
                          <SelectLabel>Three Dimensional</SelectLabel>
                          <SelectItem value="Convolution">Convolution</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </td>
                )}
              </tr>
                  {[...singleVarReductionOps.map(op => op.value), ...multiVar2DOps.map(op => op.value), 'CUMSUM3D'].includes(operation) && !isFlat &&
                    (
                      <tr>
                        <th>Axis</th>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <Select onValueChange={e => setNewDim(parseInt(e))}>
                            <SelectTrigger style={{ width: ['CUMSUM3D', 'LinearSlope'].includes(operation) ? '50%' : '175px', marginLeft: '18px' }}>
                              <SelectValue placeholder={dimNames[newDim]} />
                            </SelectTrigger>
                            <SelectContent>
                              {dimNames.map((dimName, idx) => (
                                <SelectItem key={idx} value={String(idx)}>
                                  {dimName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {['CUMSUM3D'].includes(operation) && 
                          <Tooltip delayDuration={300}>
                            <div style={{width:'90%', display:'flex', justifyContent:'space-around', alignItems:'center', alignContent:'center'}}>
                              <label htmlFor="reverse-axis" style={{textAlign:'left'}}>Rev.</label>
                              <TooltipTrigger >  
                                <Switch id='reverse-axis' checked={reverseDirection == 1} onCheckedChange={e=> {setReverseDirection(e ? 1 : 0)}}/>
                              </TooltipTrigger>
                            </div>
                            <TooltipContent side='bottom'>
                              Reverse the direction of the operation along the axis
                            </TooltipContent>
                          </Tooltip>
                          }
                        </td>
                      </tr>
                    )
                  }
                  {operation == 'Convolution' &&
                    <>
                    <tr>
                      <th>Kernel Op.</th>
                      <td>
                        <Select onValueChange={setKernelOperation}>
                          <SelectTrigger style={{ width: '175px', marginLeft: '18px' }}>
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
                      </td>
                    </tr>
                  
                    <tr>
                      <th style={{padding:'0px 12px'}}>Kernel Size</th>
                      <td>
                        <table style={{ width: '100%', tableLayout: 'fixed' }}>
                          <tbody>
                            {!isFlat &&<tr>
                              <td style={{ textAlign: 'center' }}>Size</td>
                                <td style={{ textAlign: 'center' }}>Depth</td>
                            </tr>}
                            <tr>
                              <td style={{ textAlign: 'center', padding:'0px 12px'}}>
                                <Input type='number' min='1' step='2' value={String(kernelSize)} 
                                  onChange={e=>setKernelSize(parseInt(e.target.value))}
                                  onBlur={e=>setKernelSize(HandleKernelNums(e.target.value))}
                                />
                              </td>
                              {!isFlat &&
                                <td  style={{ textAlign: 'center', padding:'0px 12px' }}>
                                <Input type='number' min='1' step='2' value={String(kernelDepth)} 
                                  onChange={e=>setKernelDepth(parseInt(e.target.value))}
                                  onBlur={e=>setKernelDepth(HandleKernelNums(e.target.value))}
                                />
                              </td>}
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr >
                      <td/>
                      <th >
                            <KernelVisualizer size={Math.min(kernelSize,15)} depth={Math.min(kernelDepth, 15)} />
                      </th>
                    </tr>
                    </>
                  }
                </tbody>
              </table>

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
                  setExecute(!execute);
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