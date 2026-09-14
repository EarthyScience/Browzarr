import React, { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { InputSelector } from './InputSelector';
import { useDimContext } from '../MainPanel/MetaData';
import { Trash2 } from 'lucide-react';

interface SliderProps {
    isSlice: boolean;
    itemIdx: number;
    removable: boolean;
    updateDimSelection: (idx: number, dimData: Record<string, number>) => void
}

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

export const AxisSlider = React.memo(({isSlice, itemIdx, removable, updateDimSelection} : SliderProps) => {
    const {dimArrays, dimNames, dimUnits, setActiveDims, setDeactiveDims} = useDimContext()
    const [plotIndex, setPlotIndex] = useState(itemIdx)
    const array = dimArrays[plotIndex]
    const maxIndex = array.length-1
    const [startIndex, setStartIndex] = useState(0)
    const [stopIndex, setStopIndex] = useState(maxIndex)

    function updateDimCount(){
        const offset = isSlice ? -1 : 1;
        setActiveDims(x => x + offset)
        setDeactiveDims(x => x - offset)
    }

    function updateSelection(e: number[]){
        setStartIndex(e[0])
        if (isSlice) setStopIndex(e[1])
    }
    useEffect(()=>{
        const selectionObject = {
            plotDim: isSlice ? itemIdx : -itemIdx,
            dataDim: plotIndex,
            start: startIndex,
            stop: isSlice ? stopIndex : startIndex + 1
        }
        updateDimSelection(isSlice ? itemIdx : -itemIdx, selectionObject)
    },[startIndex, stopIndex, plotIndex, updateDimSelection])

    // --- Reset to max when maxIndex changes --- //
    useEffect(()=>{
        setStartIndex(0);
        isSlice && setStopIndex(maxIndex)
    }, [maxIndex])
    return (
        <div className={`relative border border-l-2 rounded-md px-2 py-1.5 space-y-2 bg-muted/20 transition-colors 
                        ${isSlice ? 'border-l-[#644FF0]' : 'border-l-teal-700'}`}>
            <div className='flex justify-between w-full'>
                <Select
                    value={dimNames[plotIndex]}
                    onValueChange={(val) => setPlotIndex(dimNames.indexOf(val))}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {dimNames.map((val, idx) => (
                            <SelectItem key={idx} value={val}>
                                {val}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className='flex'>
                    {removable && <Trash2 
                        className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        onClick={updateDimCount}
                    />}
                    {isSlice && <span className={`text-xs font-bold px-2 py-1 h-6 flex items-center border rounded-md text-${axisStyling[itemIdx].color}`}>
                    {axisStyling[itemIdx].name}
                    </span>}
                </div>
                
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
                <InputSelector array={array} idx={startIndex} units={dimUnits[plotIndex]??''} setIdx={setStartIndex} />
                {isSlice && <InputSelector array={array} idx={stopIndex} units={dimUnits[plotIndex]??''} setIdx={setStopIndex} />}
            </div>
        </div>
    )
})

