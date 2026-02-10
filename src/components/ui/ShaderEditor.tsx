import React, { useState } from 'react'
import Editor from '@monaco-editor/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createShaders } from '../computation/WGSLShaders';

const boilerplates = createShaders("f16")['boilerPlates']

export const ShaderEditor = () => {
    const [shader, setShader] = useState<string | undefined>()
    const [boilerPlate, setBoilerPlate] = useState()

    return (
        <div
            className='flex fixed flex-col items-center w-[80%] h-[100%] z-10  left-1/2 -translate-x-1/2 bg-black'
        >
            <div className='mt-8'>
                This is some text to introduce the editor and available variables
                <Select>
                    <SelectTrigger style={{ width: '175px', marginLeft: '18px' }}>
                        <SelectValue placeholder={ "Include Boilderplate"} />
                    </SelectTrigger>
                    <SelectContent>
                        {["None", "Reduction", "Convolution"].map((val,idx)=>(
                            <SelectItem key={idx} value={val.toLowerCase()}>
                                {val}
                            </SelectItem>
                        ))}
                    </SelectContent>

                </Select>
            </div>
            <Editor 
                height="60%" 
                width="50%" 
                defaultLanguage="wgsl" 
                defaultValue="// some comment" 
                theme="vs-dark"
                onChange={e=>setShader(e)}
            />;
        </div>
    )
}

