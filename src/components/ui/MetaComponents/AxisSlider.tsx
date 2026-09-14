import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider, Button } from '@/components/ui';
import { InputSelector } from './InputSelector';
import { useDimContext } from '../MainPanel/MetaData';
import { Trash2 } from 'lucide-react';
import { FaListOl } from "react-icons/fa";
import { IoMdList, IoMdSwap } from "react-icons/io";
interface SliderProps {
    isSlice: boolean;
    itemIdx: number;
    removable: boolean;
    style:{name:string, color:string};
    updateDimSelection: (dim: string, oldDim: string, dimData: Record<string, number>) => void
}

export const AxisSlider = React.memo(({isSlice, itemIdx, removable, style, updateDimSelection} : SliderProps) => {
    const {dimArrays, dimNames, dimUnits, setActiveDims, setDeactiveDims} = useDimContext();
    const [plotIndex, setPlotIndex] = useState(itemIdx);
    const lastIndex = useRef<number>(itemIdx)
    const array = dimArrays[plotIndex];
    const maxIndex = array.length-1;
    const [startIndex, setStartIndex] = useState(0);
    const [stopIndex, setStopIndex] = useState(maxIndex);
    const [useRawIndex, setUseRawIndex] = useState(false);

    const updateDimCount = useCallback(()=>{
        const offset = isSlice ? -1 : 1;
        setActiveDims(x => x + offset)
        setDeactiveDims(x => x - offset)
    },[setActiveDims, setDeactiveDims])

    const  updateSelection = useCallback((e: number[]) => {
        setStartIndex(e[0])
        if (isSlice) setStopIndex(e[1])
    },[setStartIndex, setStopIndex])
    useEffect(()=>{
        const selectionObject = {
            plotDim: isSlice ? itemIdx : -1,
            dataDim: plotIndex,
            start: startIndex,
            stop: isSlice ? stopIndex : startIndex + 1
        }
        updateDimSelection(dimNames[plotIndex], dimNames[lastIndex.current], selectionObject)
    },[startIndex, stopIndex, plotIndex, itemIdx, updateDimSelection])

    // --- Reset to max when maxIndex changes --- //
    useEffect(()=>{
        setStartIndex(0);
        isSlice && setStopIndex(maxIndex)
    }, [maxIndex])

    const updatePlotIndex = useCallback((val: string) => {lastIndex.current = plotIndex; setPlotIndex(dimNames.indexOf(val))}, [setPlotIndex])
    return (
        <div className={`relative border border-l-2 rounded-md px-2 py-1.5 space-y-2 bg-muted/20 transition-colors 
                        ${isSlice ? 'border-l-[#644FF0]' : 'border-l-teal-700'}`}>
            <div className='flex justify-between w-full'>
                <Select
                    value={dimNames[plotIndex]}
                    onValueChange={updatePlotIndex}
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
                <Button
                    variant='ghost'
                    onClick={()=> setUseRawIndex(x => !x)}
                >
                    <FaListOl className='text-muted-foreground/80'/>
                    <IoMdSwap className='size-7'/>
                    <IoMdList className='text-muted-foreground/80'/>
                </Button>
                <div className='flex'>
                    {removable && <Trash2 
                        className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        onClick={updateDimCount}
                    />}
                    {isSlice && <span className={`text-xs font-bold px-2 py-1 h-6 flex items-center border rounded-md text-${style.color}`}>
                    {style.name}
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
            <div className={`flex w-full items-center ${isSlice ? "justify-between" : "justify-around"} gap-2`}>
                <InputSelector array={array as number[]} idx={startIndex} units={dimUnits[plotIndex]??''} useRaw={useRawIndex} setIdx={setStartIndex} />
                {isSlice && <InputSelector array={array as number[]} idx={stopIndex} units={dimUnits[plotIndex]??''} useRaw={useRawIndex} setIdx={setStopIndex} />}
            </div>
        </div>
    )
})

