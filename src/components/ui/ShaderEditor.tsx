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
import { createShaders } from '../computation/WGSLShaders';
import { useAnalysisStore } from '@/GlobalStates';
import { IoCloseCircleSharp } from "react-icons/io5";

const boilerplates = createShaders("f16")['boilerPlates']

const selectedPlates = {
    None: " ",
    Reduction:"ReductionBoilerPlate",
    Convolution3D: "ConvolutionBoilerPlate",
    Convolution2D: "ConvolutionBoilerPlate2D"
}

const kernelLoop3D = /* WGSL */`
    for (var kx: i32 = xy_start; kx < xy_end; kx++) {
        for (var ky: i32 = xy_start; ky < xy_end; ky++) {
            for (var kz: i32 = z_start; kz < z_end; kz++){
                let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);
                if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                    in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                    in_coord.z >= 0 && in_coord.z < i32(zSize)) { //Ensure the sampled point is within dataspace
                    let xOffset = kx * i32(xStride);
                    let yOffset = ky * i32(yStride);
                    let zOffset = kz * i32(zStride);
                    let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;

                    //Write your Kernel Code here
                }
            }
        }
    }
`
const kernelLoop2D = /* WGSL */`
     for (var kx: i32 = -xy_radius; kx <= xy_radius; kx++) {
        for (var ky: i32 = -xy_radius; ky <= xy_radius; ky++) {
            let in_coord = vec2<i32>(i32(global_id.x), i32(global_id.y)) + vec2<i32>(kx, ky);
            if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                in_coord.y >= 0 && in_coord.y < i32(ySize)) { //Ensure the sampled point is within dataspace
                let xOffset = kx * i32(xStride);
                let yOffset = ky * i32(yStride);
                let newIdx = i32(globalIdx) + xOffset + yOffset;
                
                //Write your Kernel Code here
            }
        }
    }
    
`

const GenBoilerPlat = (boilerPlate: string) =>{
    let header =  boilerplates[boilerPlate as keyof typeof boilerplates]?.replace("    ", "")?? "" 
    function convolution (boilerPlate: string){
        switch ( boilerPlate ){
        case "ConvolutionBoilerPlate":
            return kernelLoop3D;
        case "ConvolutionBoilerPlate2D":
            return kernelLoop2D;
        default:
            return ""
    }
    }
    const codeRegion = `
    //WRITE YOUR CODE HERE

    ${convolution(boilerPlate)}
}
`
    return header ? header + codeRegion : ""
}

export const ShaderEditor = ({visible} : {visible: boolean}) => {
    const [shader, setShader] = useState<string | undefined>()
    const [boilerPlate, setBoilerPlate] = useState("")
    const {resolvedTheme} = useTheme()
    
    useEffect(()=>{
        if (boilerPlate != "None")setShader(GenBoilerPlat(boilerPlate))
        else setShader("")
    }, [boilerPlate])

    return (
        <div
            className='flex fixed flex-col items-center w-[100%] h-[100%] z-10  left-1/2 -translate-x-1/2'
            style={{
                backdropFilter:'blur(20px)',
                borderRadius:'10px',
                boxShadow: "0 0 30px rgba(0,0,0,0.2)",
                WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                display: visible ? "" : "none"
            }}
        >
            
            <div className='mt-8 mb-2 flex justify-start items-center'>
                <Select onValueChange={e=>setBoilerPlate(e)}>
                    <SelectTrigger style={{ width: '175px', marginLeft: '18px' }}>
                        <SelectValue placeholder={ "Include Boilderplate"} />
                    </SelectTrigger>
                    <SelectContent>
                        {["None", "Reduction", "Convolution3D", "Convolution2D"].map((val,idx)=>(
                            <SelectItem key={idx} value={selectedPlates[val as keyof typeof selectedPlates]}>
                                {val}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <b>Get started with presets</b>
            </div>
            <div className='w-[60%] h-[70%] relative'>
                <IoCloseCircleSharp 
                    size={40}
                    style={{
                        position:'absolute',
                        left:0,
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
                    useAnalysisStore.setState({customShader:shader})
                }}
            >
                Inject
            </Button>
        </div>

    )
}

