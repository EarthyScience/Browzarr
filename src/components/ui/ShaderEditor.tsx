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
import { Button } from './button';
import { useAnalysisStore, useGlobalStore } from '@/GlobalStates';
import { IoCloseCircleSharp } from "react-icons/io5";
import { useShallow } from 'zustand/shallow';
import {Hider, Input, Switcher} from '../ui';
import { templates } from './ShaderTemplates';

const selectedPlates = {
    None: " ",
    Reduction:"ReductionBoilerPlate",
    Convolution3D: "ConvolutionBoilerPlate",
    Convolution2D: "ConvolutionBoilerPlate2D"
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
    const {dimNames, dataShape, variable} = useGlobalStore(useShallow(state=>({
        dimNames: state.dimNames,
        dataShape: state.dataShape,
        variable: state.variable
    })))
    const [outputShape, setOutPutShape] = useState(dataShape)

    useEffect(()=>{
        if (boilerPlate != "None")setShader(templates[boilerPlate as keyof typeof templates])
        else setShader("")
    }, [boilerPlate])

    useEffect(()=>{
        if (reduceOnAxis){
            const newShape = dataShape.filter((_val,idx) => idx != newDim)
            setOutPutShape(newShape)
        } else{
            setOutPutShape(dataShape)
        }
    },[reduceOnAxis, newDim, dataShape])
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
                    <p>This is the input array</p>
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
            <div className='mt-8 mb-2 flex gap-4 items-center w-[60%]'> 
                <div className='flex flex-col items-center self-end'> 
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

