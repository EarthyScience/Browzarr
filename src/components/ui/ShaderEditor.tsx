import React, { useEffect, useState } from 'react'
import { useTheme } from "next-themes";
import Editor from '@monaco-editor/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import './css/ShaderEditor.css'
import { Button } from './button';
import { useAnalysisStore, useGlobalStore } from '@/GlobalStates';
import { IoCloseCircleSharp } from "react-icons/io5";
import { useShallow } from 'zustand/shallow';
import {Hider, Input, Switcher} from '../ui';
import { templates } from './ShaderTemplates';
import { HiMiniWrench } from "react-icons/hi2";
import { Popover, PopoverContent, PopoverTrigger } from '../ui';
import { HandleKernelNums } from '@/utils/HelperFuncs';

const selectedPlates = {
    None: " ",
    Reduction:"ReductionBoilerPlate",
    Convolution3D: "ConvolutionBoilerPlate",
    Convolution2D: "ConvolutionBoilerPlate2D"
}

const ConfigureUniforms = ({variables} : {variables:string[]})=>{
    const {reduceOnAxis, axis, setKernelDepth, setKernelSize, setVariable2, setReduceOnAxis, setAxis} = useAnalysisStore(useShallow(state => ({
        reduceOnAxis: state.reduceOnAxis,
        axis: state.axis,
        variable2: state.variable2,
        setKernelDepth: state.setKernelDepth,
        setKernelSize: state.setKernelSize,
        setVariable2: state.setVariable2,
        setReduceOnAxis: state.setReduceOnAxis,
        setAxis: state.setAxis,
    })))
    const {dimNames, variable} = useGlobalStore(useShallow(state => ({dimNames: state.dimNames, variable:state.variable})))
    const [thisKernelSize, setThisKernelSize] = useState(String(useAnalysisStore.getState().kernelSize))
    const [thisKernelDepth, setThisKernelDepth] = useState(String(useAnalysisStore.getState().kernelDepth))

    return(
        <Popover>
            <PopoverTrigger>
                <div className='configure-uniforms'>
                    <HiMiniWrench size={26}/>
                </div>
            </PopoverTrigger>
            <PopoverContent>
                <div className='grid grid-cols-2 gap-2'>
                    <Switcher leftText='Remain' rightText='Reduce' state={!reduceOnAxis} onClick={()=>setReduceOnAxis(!reduceOnAxis)} className='col-span-2'/>
                    <div className='col-span-2 flex items-center justify-center'>
                        <p>Use <code>workgroup_size({reduceOnAxis ? "16, 16, 1" : "4, 4, 4"  })</code></p>
                    </div>
                    <b>Reduction Axis</b>
                    <Select onValueChange={e=> setAxis(parseInt(e))}>
                        <SelectTrigger>
                            <SelectValue placeholder={dimNames[axis]} />
                        </SelectTrigger>
                        <SelectContent>
                            {dimNames.map((val, idx) =>(
                                <SelectItem key={idx} value={String(idx)}>
                                    {val}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div>
                        kernelSize
                        <Input type='number' value={thisKernelSize} 
                            onChange={e=> setThisKernelSize(e.target.value)}
                            onBlur={e=>{
                                const newVal = HandleKernelNums(e.target.value)
                                setThisKernelSize(String(newVal))
                                setKernelSize(newVal)
                            }}
                        />
                    </div>
                    <div>
                        kernelDepth
                        <Input type='number' value={thisKernelDepth} 
                            onChange={e=> setThisKernelDepth(e.target.value)}
                            onBlur={e=>{
                                const newVal = HandleKernelNums(e.target.value)
                                setThisKernelDepth(String(newVal))
                                setKernelDepth(newVal)
                            }}
                        />
                    </div>
                    <div className='col-span-2 flex flex-col items-center'>
                        <b>Second Variable</b>
                        <Select onValueChange={e=> setVariable2(e)}>
                            <SelectTrigger>
                                <SelectValue placeholder={"Select variable"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem key={"empty"} value={"Default"}>
                                        No Variable
                                </SelectItem>
                                {variables.map((val, idx) =>(
                                    val != variable && 
                                    <SelectItem key={idx} value={val}>
                                        {val}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                </div>
            </PopoverContent>
        </Popover>
    )
}

export const ShaderEditor = ({visible} : {visible: boolean}) => {
    const [shader, setShader] = useState<string | undefined>()
    const [showUniforms, setShowUniforms] = useState(false)
    const [newDim, setNewDim] = useState(0)
    const [boilerPlate, setBoilerPlate] = useState("")
    const {resolvedTheme} = useTheme()
    const {executeCustom, kernelDepth, kernelSize, axis, reduceOnAxis, variable2, setKernelDepth, setKernelSize, setReduceOnAxis} = useAnalysisStore(useShallow(state => ({
        executeCustom: state.executeCustom,
        kernelSize: state.kernelSize,
        kernelDepth: state.kernelDepth,
        reduceOnAxis: state.reduceOnAxis,
        axis: state.axis,
        variable2: state.variable2,
        setKernelDepth: state.setKernelDepth,
        setKernelSize: state.setKernelSize,
        setReduceOnAxis: state.setReduceOnAxis
    })))
    const {dimNames, dataShape, variable, variables,} = useGlobalStore(useShallow(state=>({
        dimNames: state.dimNames,
        dataShape: state.dataShape,
        variable: state.variable,
        variables: state.variables
    })))
    const [outputShape, setOutPutShape] = useState(dataShape)

    useEffect(()=>{
        if (boilerPlate != "None")setShader(templates[boilerPlate as keyof typeof templates])
        else setShader("")
    }, [boilerPlate])

    useEffect(()=>{
        if (reduceOnAxis){
            const newShape = dataShape.filter((_val,idx) => idx != axis)
            setOutPutShape(newShape)
        } else{
            setOutPutShape(dataShape)
        }
    },[reduceOnAxis, axis, dataShape])

    return (
        <div
            className='fixed flex flex-col items-center w-[100%] h-[100%] z-10 left-1/2 -translate-x-1/2'
            style={{
                backdropFilter:'blur(20px)',
                borderRadius:'10px',
                boxShadow: "0 0 30px rgba(0,0,0,0.2)",
                WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                display: visible ? "" : "none"
            }}
        >
            <Hider className='w-[60%] mt-4' show={showUniforms}>
                <div style={{
                    all: "unset",
                    display: "grid",
                    gridTemplateColumns: "0.5fr 1.33fr 0.5fr 1.33fr 0.5fr 1.33fr",
                    gap: "2px",
                    borderRadius:'12px',
                    padding: "8px",
                    placeItems:'center',
                    background:'var(--modal-shadow)',
                    border: "1px solid var(--border)"
                    }}
                >
                    <b>reduceDim</b>
                    <p>This is the dimension kernels will move alonge. It is currently set to <b>{axis}({dimNames[axis]})</b></p>
                    <b>kernelSize</b>
                    <p>This is the spatial radius of the kernel for convolution operations. It is currently set to <b>{kernelSize}</b></p>
                    <b>inputData</b>
                    <p>This is the input array when using one variable</p>
                    <b>dimLength</b>
                    <p>This is the length of the dimension being reduced. It is currently <b>{dataShape[axis]}</b></p>
                    <b>kernelDepth</b>
                    <p>This is the depth radius of the kernel for convolution operations. It is currently set to <b>{kernelDepth}</b></p>
                    <b>outputData</b>
                    <p>This is the array computations are written to</p>  
                    <b>firstData</b>
                    <p>When using two inputs, this is the first array. It is currently set to <b>{variable}</b></p>
                    <b>secondData</b>
                    <p>When using two inputs, this is the second array. It is currently set to <b>{variable2}</b></p>
                </div>
            </Hider>   
            <div className='mt-8 mb-2 flex gap-4 items-center w-[60%] h-[50px]'> 
                <div className='flex flex-col items-center self-end '> 
                    <b>Get started with presets</b>
                    <Select onValueChange={setBoilerPlate}>
                        <SelectTrigger style={{ width: '175px', marginLeft: '18px' }}>
                            <SelectValue placeholder={ "Select Template"} />
                        </SelectTrigger>
                        <SelectContent>
                            {["None", "Reduction", "Convolution3D", "Convolution2D"].map((val,idx)=>(
                                <SelectItem key={idx} value={selectedPlates[val as keyof typeof selectedPlates]}>
                                    {val}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={()=>setShowUniforms(x=> !x)}
                >
                    {(showUniforms ? 'Hide' : 'Show') + ' Uniforms'}
                </Button>
                <ConfigureUniforms variables={variables}/>
                <div>
                    Reduction:  
                    <span style={{ color: reduceOnAxis ? "#44ef91" : "#ef4444" }}>
                        {reduceOnAxis ? " True" : " False"}
                    </span>
                </div>
                <div>
                    Using Two Variables:  
                    <span style={{ color: variable2 != "Default" ? "#44ef91" : "#ef4444" }}>
                        {variable2 != "Default" ? "  True" : "  False"}
                    </span>
                </div>
            </div>
            <div className='w-[60%] h-[70%] relative'>
                <IoCloseCircleSharp 
                    size={40}
                    style={{
                        position:'absolute',
                        right:0,
                        bottom:"100%",
                        zIndex:6,
                        cursor:'pointer'
                    }}
                    onClick={()=>useAnalysisStore.setState({useEditor:false})}
                />
                <Editor 
                    className='border-6 rounded-lg'
                    height="100%" 
                    width="100%" 
                    defaultValue={"//Write your code here"}
                    value={shader}
                    language='wgsl'
                    theme={`vs-${resolvedTheme}`}
                    onChange={(value) => setShader(value)}
                />
            </div>
            
            <Button 
                className='mt-4 cursor-pointer'
                onClick={()=>{
                    useAnalysisStore.setState({customShader:shader, executeCustom:!executeCustom, axis:newDim, outputShape})
                }}
            >
                Inject
            </Button>
        </div>

    )
}

