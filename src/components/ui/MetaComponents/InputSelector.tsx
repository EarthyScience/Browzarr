import React, { useEffect, useState, useRef } from 'react'
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button-enhanced';
import { ButtonGroup } from '@/components/ui/button-group';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { clamp, findClosest, findClosestBigInt, parseLoc, parseTimeScale } from '@/utils/HelperFuncs';
import { parse } from 'date-fns';

interface InputProps{
    array: (number | bigint)[];
    idx: number;
    units:string;
    setIdx: React.Dispatch<React.SetStateAction<number>>
}

function dateToNumber(dateString: string, unit:string) {
    const [timeScale, referenceDate] = parseTimeScale(unit)
    try{
        const newDate = parse(dateString, 'dd-MM-yyyy' , new Date())
        const timeDifference = newDate.getTime() - new Date(referenceDate).getTime();
        switch (timeScale) {
            case 'milliseconds':
                return timeDifference;
            case 'seconds':
                return Math.floor(timeDifference / 1000);
            case 'minutes':
                return Math.floor(timeDifference / (1000 * 60));    
            case 'hours':
                return Math.floor(timeDifference / (1000 * 60 * 60));
            case 'days':
                return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            default:
                throw new Error(`Unsupported time scale: ${timeScale}`);
        }
    } catch {
        throw new Error(`Unable to parse date for scale: ${dateString} with scale ${unit}`);
    }
}

export const InputSelector = ({array, idx, units, setIdx} : InputProps) => {
    const isTime = units.includes('since')
    const [localValue, setLocalValue] = useState(String(array[idx]))
    const rootRef = useRef<HTMLDivElement>(null);
    const setLocal = (val: number | string) => setLocalValue(String(val))
    const [expanded, setExpanded] = useState(false);
    function commitValue(e: React.FocusEvent<HTMLInputElement>){
        const val = e.target.value
        if (!isTime){
            const numberVal = parseFloat(val)
            const [nearestVal, newIdx] = findClosest(array as number[], numberVal);
            setLocal(nearestVal);
            setIdx(newIdx);
        } else {
            const numberVal = dateToNumber(val, units)
            const [nearestVal, newIdx] = findClosestBigInt(array as bigint[], BigInt(numberVal));
            setLocal(parseLoc(nearestVal, units));
            setIdx(newIdx);
        }
    }
    function increment(increase: boolean){
        const newIdx = clamp(idx + (increase ? 1 : -1), 0, array.length - 1);
        setIdx(newIdx);
    }
    useEffect(()=>{
        const newVal = isTime ? parseLoc(array[idx], units) : array[idx];
        setLocal(newVal)
    }, [idx])
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);
    return (
    <div ref={rootRef}>
        <ButtonGroup>
            <Input
                type={isTime ? "string" : "number"}
                value={localValue}
                defaultValue={localValue}
                onChange={e => setLocal(e.target.value)}
                onBlur={commitValue}
                onClick={() => setExpanded(false)}
                className="no-spinner h-7 text-xs w-16 text-center appearance-none"
            />
            {expanded ? (
                <ButtonGroup orientation="horizontal" className="h-fit">
                    <Button variant="outline" size="icon-sm" className="h-7 w-7 p-0 cursor-pointer" onClick={() => increment(false)}>
                        <MinusIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon-sm" className="h-7 w-7 p-0 cursor-pointer" onClick={() => increment(true)}>
                        <PlusIcon className="h-4 w-4" />
                    </Button>
                </ButtonGroup>
            ) : (
                <Button
                    variant="outline"
                    size="icon-sm"
                    className="h-7 w-7 p-0 cursor-pointer shrink-0"
                    onClick={() => setExpanded(true)}
                >
                ±
                </Button>
            )}
        </ButtonGroup>
    </div>
    )
}

