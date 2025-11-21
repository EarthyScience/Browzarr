"use client";
import React, { useEffect, useRef, useState } from 'react'
import { MdOutlineRocketLaunch } from "react-icons/md";
import { Potato } from './Icons';
import { FaCarSide } from "react-icons/fa6";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useGlobalStore } from '@/utils/GlobalStates';
import { Button } from "@/components/ui/button"

const icons = {
    "fast": <MdOutlineRocketLaunch className='size-8'/>,
    "slow": <FaCarSide className='size-8'/>,
    "potato": <Potato className='size-8'/>
}

const PerformanceMode = () => {
    const {setDPR} = useGlobalStore.getState()
    const [currentIcon, setCurrentIcon] = useState<string>("fast")
    const dpr = useRef(1)

    useEffect(()=>{ // Moved this logic to useeffect cause useless Next doesn't recognize window
        dpr.current = window.devicePixelRatio || 1;
    },[])


  return (
    <Popover
    >
        <PopoverTrigger
         asChild
        >
            <Button
                variant="ghost"
                size="icon"
                className="size-10 cursor-pointer"
            >
                {icons[currentIcon as keyof typeof icons]}
            </Button>
        </PopoverTrigger>
        <PopoverContent
            side='right'
            className="flex items-center p-2 w-auto"
        >
            {Object.keys(icons).map((val, idx)=>(
                <Button
                variant="ghost"
                size="icon"
                className="size-10 cursor-pointer"
                onClick={()=>{setCurrentIcon(val); setDPR(dpr.current/2**idx)}}
                key={`performance_${idx}`}
            >
                {icons[val as keyof typeof icons]}
            </Button>
            ))}            
        </PopoverContent>
    </Popover>
  )
}

export default PerformanceMode
