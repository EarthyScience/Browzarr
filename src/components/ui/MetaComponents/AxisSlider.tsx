import React, { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { InputSelector } from './InputSelector';

interface SliderProps {
    array: number[];
    isSlice: boolean;
    dimList: string[];
    itemIdx: number;
    units: string;
    updateDimSelection: () => void
}

const MODE_ACCENT: Record<SelectionMode, string> = {
  scalar: 'border-l-teal-700',
  slice: 'border-l-[#644FF0]',
};

const tempDims = ['time','lat', 'lon'] // Delete later

const axisStyling: Record<number, { name: string; color: string }> = {
    0: {
        name: 'z',
        color: 'blue-500'
    },
    1: {
        name: 'y',
        color: 'green-500'
    },
    2: {
        name: 'x',
        color: 'pink-500'
    },
}

export const AxisSlider = ({array, isSlice, dimList, itemIdx, units, updateDimSelection} : SliderProps) => {
    const maxIndex = array.length-1;
    const [startIndex, setStartIndex] = useState(0)
    const [stopIndex, setStopIndex] = useState(maxIndex)

    function updateSelection(e: number[]){
        setStartIndex(e[0])
        if (isSlice) setStopIndex(e[1])
    }
    return (
        <div className={`relative border border-l-2 rounded-md px-2 py-1.5 space-y-2 bg-muted/20 transition-colors border-l-teal-700`}>
            <div className='flex justify-between w-full'>
                <Select value={tempDims[itemIdx]} onValueChange={(val) => { /* update tempDims[itemIdx] = val */ }}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {tempDims.map((val, idx) => (
                            <SelectItem key={idx} value={val}>
                                {val}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className={`text-xs font-bold px-2 py-1 h-6 flex items-center border rounded-md text-${axisStyling[itemIdx].color}`}>
                {axisStyling[itemIdx].name}
                </span>
            </div>
            <div className="space-y-2 pb-0.5">
                <Slider
                    min={0}
                    max={maxIndex}
                    step={1}
                    value={isSlice ? [startIndex, stopIndex] : [startIndex]}
                    onValueChange={updateSelection}
                    className="w-full cursor-pointer [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3"
                />
            </div>
            <div className="flex w-full items-center justify-between gap-2">
                <InputSelector array={array} idx={startIndex} units={units} setIdx={setStartIndex} />
                {isSlice && <InputSelector array={array} idx={stopIndex} units={units} setIdx={setStopIndex} />}
            </div>
        </div>
    )
}

