import React, { useState } from 'react'
import {Select, SelectTrigger, SelectContent, SelectItem, SelectValue, Input, Button} from '@/components/ui'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {normalize, denormalize} from '@/utils/HelperFuncs'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useShallow } from 'zustand/shallow'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { useIsMobile } from '@/hooks'
import { ChevronLeft } from 'lucide-react'
export const Masker = () => {
    const {fillValue, setFillValue} = usePlotStore(useShallow(s => ({
        fillValue: s.fillValue, setFillValue: s.setFillValue
    })))
    const {valueScales} = useGlobalStore(useShallow(s => ({valueScales: s.valueScales})))
    const [thisFillVal, setThisFillValue] = useState(denormalize(fillValue, valueScales.minVal, valueScales.maxVal))
    const [showMasks, setShowMasks] = useState(false)
    const masks = ["None", "Land", "Water"]
    const isMobile = useIsMobile();
    const popoverSide = isMobile ? "top" : "left";

    return (
        <Popover open={showMasks} onOpenChange={setShowMasks}>
            <PopoverTrigger>
                <div className='flex items-center justify-between my-2'>
			<ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${
				showMasks ? '' : 'rotate-180'} z-5`} />
			<Button
				variant='secondary'
				className="flex items-center flex-grow justify-center gap-2 my-[-10px] p-1 h-auto border-solid border-gray border-[1px]"
			>
				Masking
			</Button>
			</div>
            </PopoverTrigger>
            <PopoverContent side={popoverSide}>
                <h1>Mask Value</h1>
                <div className='grid grid-cols-[auto_60%] items-center gap-2 mt-2 text-left'>
                    <Input
                    type='number'
                    defaultValue={denormalize(fillValue, valueScales.minVal, valueScales.maxVal)}
                    onChange={e=> setThisFillValue(parseFloat(e.target.value))}
                    />
                    <Button
                        disabled={normalize(thisFillVal, valueScales.minVal, valueScales.maxVal) === fillValue}
                        className='cursor-pointer'
                        onClick={()=>setFillValue(normalize(thisFillVal, valueScales.minVal, valueScales.maxVal))}
                    >Set Value
                    </Button>
                    <h1>Mask Feature</h1>
                    <Select 
                        onValueChange={e=>{
                            const idx = masks.indexOf(e)
                            usePlotStore.setState({maskValue:idx})
                        }}
                        value={masks[usePlotStore.getState().maskValue]}
                    >
                    <SelectTrigger className='w-[100%]'>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {masks.map((val,idx)=>(
                        <SelectItem value={val} key={idx}>
                            {val}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
            </PopoverContent>
        </Popover>
        
    )
}


