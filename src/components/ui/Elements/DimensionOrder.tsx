import React, {useRef, useState, useEffect} from 'react'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const DimensionOrder = ({dimNames, setDuplicateDims}: {dimNames: string[], setDuplicateDims: React.Dispatch<React.SetStateAction<boolean>>}) => {
    const {permute} = useGlobalStore.getState() // Just need the value on mount to set initial <select> values
    const slotCount = Math.min(3, dimNames.length); 
    const permuteRef = useRef<number[]>(
        Array.from({ length: slotCount }, (_, i) => i)
    )
    const [warnDuplicates, setWarnDuplicates] = useState(false);
    const handleChange = (slotIdx: number, dimIdx: number) => {
        permuteRef.current[slotIdx] = dimIdx;
        useGlobalStore.setState({ permute: [...permuteRef.current] });
        const permuteArray = permuteRef.current;
        const hasDupes = permuteArray.length != new Set(permuteArray).size
        setWarnDuplicates(hasDupes)
        setDuplicateDims(hasDupes)
    };

    useEffect(()=>{ //The first render didn't have dimNames and used default value. UseEffect updates after fetch. Also updates when switching to variable with diff Dims
        // At the moment it resets each time because of the double click issue with menus that got introduced in 0.3.0. 
        permuteRef.current = Array.from({ length: slotCount }, (_, i) => i)
        useGlobalStore.setState({ permute: [...permuteRef.current] });
    },[slotCount])
    return (
        <>
        <div className="flex gap-2">
            {Array.from({ length: slotCount }).map((_, slotIdx) => (
                <Select
                    key={slotIdx}
                    value={String(permute?.[slotIdx])}
                    onValueChange={(v) => handleChange(slotIdx, Number(v))}
                >
                    <SelectTrigger className='flex-1 min-w-0 truncate'>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {dimNames.map((dim, dimIdx) => (
                            <SelectItem key={dimIdx} value={String(dimIdx)}>
                                {dim}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}
        </div>
        {warnDuplicates && <p className='text-red-500 font-bold'>
            DUPLICATE DIMENSION USED
        </p>}
        </>
    );
};


