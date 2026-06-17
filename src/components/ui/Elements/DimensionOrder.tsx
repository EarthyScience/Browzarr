import React, {useRef, useState} from 'react'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const DimensionOrder = ({dimNames}: {dimNames: string[]}) => {
    const slotCount = Math.min(3, dimNames.length);
    const permuteRef = useRef<number[]>(
        Array.from({ length: slotCount }, (_, i) => i)
    );
    const [warnDuplicates, setWarnDuplicates] = useState(false);

    const handleChange = (slotIdx: number, dimIdx: number) => {
        permuteRef.current[slotIdx] = dimIdx;
        useGlobalStore.setState({ permute: [...permuteRef.current] });
        const permuteArray = permuteRef.current;
        setWarnDuplicates(permuteArray.length != new Set(permuteArray).size)
    };
    
    return (
        <>
        <div className="flex gap-2">
            {Array.from({ length: slotCount }).map((_, slotIdx) => (
                <Select
                    key={slotIdx}
                    defaultValue={String(slotIdx)}
                    onValueChange={(v) => handleChange(slotIdx, Number(v))}
                >
                    <SelectTrigger>
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


