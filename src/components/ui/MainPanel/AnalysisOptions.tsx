'use client';

import React, { useEffect, useState } from 'react';
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

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const operations = ['Mean', 'Min', 'Max', 'StDev'];
const kernelOperations = ['Mean', 'Min', 'Max', 'StDev'];

const webGPUError = (
  <div className="m-0 p-5 font-sans flex-column justify-center items-center">
    <span className="text-5xl mb-4 block self-center">⚠️</span>
    <h1 className="text-2xl font-bold mb-4">WebGPU Not Available</h1>
    <p className="text-base leading-relaxed mb-1 opacity-95">
      WebGPU is not supported or enabled in your current browser. This feature is required for GPU-accelerated computing.
    </p>

    <div className="bg-white bg-opacity-15 rounded-xl border border-white border-opacity-20">
      <h3 className="m-0 mb-4 text-lg font-semibold">Try These Solutions:</h3>
      <ul className="suggestion-list">
        <li>Switch to a Chrome-based browser (Chrome, Edge, Brave)</li>
        <li>Use Safari on macOS (version 14.1 or later)</li>
        <li>Enable WebGPU in your browser&apos;s experimental features</li>
        <li>Update your browser to the latest version</li>
      </ul>
    </div>
  </div>
);

const AnalysisOptions = () => {
  const {plotOn, variable} = useGlobalStore(useShallow(state => ({plotOn: state.plotOn, variable: state.variable})));
  
  const {
    execute,
    operation,
    useTwo,
    kernelSize,
    kernelDepth,
    kernelOperation,
    axis,
    variable2,
    analysisMode,
    setExecute,
    setAxis,
    setOperation,
    setUseTwo,
    setVariable2,
    setKernelSize,
    setKernelDepth,
    setKernelOperation,
    setAnalysisMode
  } = useAnalysisStore(useShallow(state => ({
    execute: state.execute,
    operation: state.operation,
    useTwo: state.useTwo,
    kernelSize: state.kernelSize,
    kernelDepth: state.kernelDepth,
    kernelOperation: state.kernelOperation,
    axis: state.axis,
    variable2: state.variable2,
    analysisMode: state.analysisMode,
    setExecute: state.setExecute,
    setAxis: state.setAxis,
    setOperation: state.setOperation,
    setUseTwo: state.setUseTwo,
    setVariable2: state.setVariable2,
    setKernelSize: state.setKernelSize,
    setKernelDepth: state.setKernelDepth,
    setKernelOperation: state.setKernelOperation,
    setAnalysisMode: state.setAnalysisMode
    })));

  const { variables, dimNames } = useGlobalStore(useShallow(state => ({
    variables: state.variables,
    dimNames: state.dimNames
  })));
  
  const {reFetch, setReFetch} = useZarrStore(useShallow(state => ({
    reFetch: state.reFetch,
    setReFetch: state.setReFetch
  })))
  const [showError, setShowError] = useState<boolean>(false);
  useEffect(() => {
    const checkWebGPU = async () => {
    if (!navigator.gpu) {
        setShowError(true);
        return;
    }

    try {
        const _adapter = await navigator.gpu.requestAdapter();
        setShowError(false);
    } catch {
        setShowError(true);
    }
    };

    checkWebGPU();
    }, [plotOn]);

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
      {plotOn ? (
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
                  >
                    <PiMathOperationsBold className="size-8"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="flex flex-col">
                  <span>Available <strong>analysis:</strong></span>
                  <span className="ml-1">• Dimensional Reduction</span>
                  <span className="ml-3">- <strong>Mean, Min, Max, StDev</strong></span>
                  <span className="ml-1">• 3D Operations</span>
                  <span className="ml-3">- <strong>Convolution</strong></span>
                  <span className="ml-1">• Two Variables</span>
                  <span className="ml-3">- 2D/3D <strong>Correlation</strong></span>
                </TooltipContent>
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
                <Button
                  className="cursor-pointer active:scale-[0.95]"
                  onClick={() => {
                    setUseTwo(!useTwo);
                    setOperation('Default');
                  }}
                >
                  {useTwo ? 'Use One \n Variable' : 'Use Two Variables'}
                </Button>

                <table style={{ textAlign: 'right' }}>
                  <tbody>
                    <tr>
                      
                      <th>Current Variable</th>
                      <td className="text-center w-[100%] align-middle justify-center content-center">
                        <button 
                          className={`rounded-[6px] self-center w-[80%] mx-auto relative border border-gray-150 py-[5px] ${analysisMode ?'hover:scale-[0.95]' : ''} transition-[0.2s]`}
                          style={{
                            cursor: analysisMode ? 'pointer' : '',
                            background: analysisMode ? '#b6d1ddff' : '#f8f8f8',
                          }}
                          disabled={!analysisMode}
                          onClick={e=>{setReFetch(!reFetch);setAnalysisMode(false)}}
                        >
                          {analysisMode && <CiUndo 
                            size={20}
                            style={{
                              position:'absolute',
                              left:'0%',
                              top:'10%'
                            }}
                          />}
                          {variable}
                        </button>

                      </td>
                    </tr>
                    {useTwo && <>
                    <tr>
                      <th>Second Variable</th>
                      <td>
                          <Select onValueChange={setVariable2}>
                            <SelectTrigger style={{ width: '175px', marginLeft: '10px' }}>
                              <SelectValue placeholder={variable2 == 'Default' ? "Select..." : variable2} />
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
                          <Select onValueChange={setOperation}>
                            <SelectTrigger style={{ width: '175px', marginLeft: '10px' }}>
                              <SelectValue
                                placeholder={operation === 'Default' ? 'Select...' : operation}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Dimension Reduction</SelectLabel>
                                {operations.map((op, idx) => (
                                  <SelectItem key={idx} value={op}>
                                    {op}
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
                      
                      {useTwo && (
                        <td>
                          <Select onValueChange={setOperation}>
                            <SelectTrigger style={{ width: '175px', marginLeft: '10px' }}>
                              <SelectValue
                                placeholder={operation === 'Default' ? 'Select...' : operation}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Dimension Reduction</SelectLabel>
                                <SelectItem value="Correlation2D">Correlation</SelectItem>
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel>Three Dimensional</SelectLabel>
                                <SelectItem value="Correlation3D">Correlation</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </td>
                      )}
                    </tr>

                    {operation !== 'Convolution' &&
                      operation !== 'Correlation3D' &&
                      operation !== 'Default' && (
                        <tr>
                          <th>Axis</th>
                          <td>
                            <Select onValueChange={e => setAxis(parseInt(e))}>
                              <SelectTrigger style={{ width: '175px', marginLeft: '10px' }}>
                                <SelectValue placeholder={dimNames[axis]} />
                              </SelectTrigger>
                              <SelectContent>
                                {dimNames.map((dimName, idx) => (
                                  <SelectItem key={idx} value={String(idx)}>
                                    {dimName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      )}

                    {(operation === 'Convolution' || operation === 'Correlation3D') && (
                      <>
                        {operation === 'Convolution' && (
                          <tr>
                            <th>Kernel Op.</th>
                            <td>
                              <Select onValueChange={setKernelOperation}>
                                <SelectTrigger style={{ width: '175px', marginLeft: '10px' }}>
                                  <SelectValue
                                    placeholder={
                                      kernelOperation === 'Default' ? 'Select...' : kernelOperation
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {kernelOperations.map((kernelOp, idx) => (
                                    <SelectItem key={idx} value={kernelOp}>
                                      {kernelOp}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        )}

                        <tr>
                          <th style={{padding:'0px 12px'}}>Kernel Size</th>
                          <td>
                            <table style={{ width: '100%', tableLayout: 'fixed' }}>
                              <tbody>
                                <tr>
                                  <td style={{ textAlign: 'center' }}>Size</td>
                                  <td style={{ textAlign: 'center' }}>Depth</td>
                                </tr>
                                <tr>
                                  <td style={{ textAlign: 'center', padding:'0px 12px'}}>
                                    <Input type='number' min='1' step='2' value={String(kernelSize)} onChange={e=>setKernelSize(HandleKernelNums(e.target.value))}/>
                                  </td>
                                  <td style={{ textAlign: 'center', padding:'0px 12px' }}>
                                    <Input type='number' min='1' step='2' value={String(kernelDepth)} onChange={e=>setKernelDepth(HandleKernelNums(e.target.value))}/>
                                  </td>
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
                    )}
                  </tbody>
                </table>

                <Button
                  className="cursor-pointer active:scale-[0.95]"
                  disabled={
                    operation === 'Default' ||
                    (operation === 'Convolution' && kernelOperation === 'Default') ||
                    (useTwo && variable2 === 'Default')
                  }
                  onClick={() => {
                    setExecute(!execute);
                    setAnalysisMode(true);
                  }}
                >
                  Execute
                </Button>
              </>
            )}
          </PopoverContent>
        </Popover>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          disabled
          style={{
            color: 'var(--text-disabled)',
            transform: 'scale(1)'
          }}
        >
          <PiMathOperationsBold className="size-8"/>
        </Button>
      )}
    </>
  );
};

export default AnalysisOptions;