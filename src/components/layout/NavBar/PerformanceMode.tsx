"use client";
import React, { useEffect, useRef, useState } from 'react'
import { MdOutlineRocketLaunch } from "react-icons/md";
import { FaCarSide } from "react-icons/fa6";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useGlobalStore } from '@/stores/GlobalStore';
import { Button } from "@/components/ui/button-enhanced"
import { QuickTip } from '@/components/widgets/QuickTip';
import { Switch } from '@/components/ui';
import { LuSnail } from "react-icons/lu";

const icons = {
    "fast": <MdOutlineRocketLaunch className='size-8'/>,
    "slow": <FaCarSide className='size-8'/>,
    "snail": <LuSnail className='size-8'/>
}

const PerformanceMode = () => {
    const {setDPR} = useGlobalStore.getState()
    const [currentIcon, setCurrentIcon] = useState<string>("fast")
	const [onlyWhenMoving, setOnlyWhenMoving] = useState<boolean>(false)
	const cameraMoving = useGlobalStore(s => onlyWhenMoving && s.cameraMoving) // Only subscribe while the switch is on
    const dpr = useRef(1)

    useEffect(()=>{ // Moved this logic to useeffect cause useless Next doesn't recognize window
        dpr.current = window.devicePixelRatio || 1;
    },[])

	const getDPR = (icon: string) => dpr.current / 2**Object.keys(icons).indexOf(icon)

	useEffect(()=>{ // Keep DPR=1 at rest, use the selected DPR only while the camera moves
		if (onlyWhenMoving) setDPR(cameraMoving ? getDPR(currentIcon) : 1)
	},[onlyWhenMoving, cameraMoving, currentIcon])

  return (
    <Popover
    >
        <PopoverTrigger
         asChild
        >
            <QuickTip message='Set render/performance mode'>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 cursor-pointer"
                >
                    {icons[currentIcon as keyof typeof icons]}
                </Button>
            </QuickTip>
        </PopoverTrigger>
        <PopoverContent
            side='right'
			className="flex flex-col items-center gap-2 p-2 w-auto"
        >
			<div className="flex items-center">
            {Object.keys(icons).map((val, idx)=>(
                <Button
                variant="ghost"
                size="icon"
                className="size-10 cursor-pointer"
				onClick={()=>{setCurrentIcon(val); if (!onlyWhenMoving) setDPR(getDPR(val))}}
                key={`performance_${idx}`}
            >
                {icons[val as keyof typeof icons]}
            </Button>
            ))}
			</div>
			<div className="flex items-center gap-2 text-sm">
				<label htmlFor="dpr-only-moving">Only while moving</label>
				<Switch id="dpr-only-moving" checked={onlyWhenMoving} onCheckedChange={e => {setOnlyWhenMoving(e); if (!e) setDPR(getDPR(currentIcon))}}/>
			</div>
        </PopoverContent>
    </Popover>
  )
}

export default PerformanceMode
