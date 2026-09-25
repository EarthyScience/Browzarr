
"use client";
import { FaPlus, FaMinus } from "react-icons/fa";
import React, {useRef, useEffect, useMemo, useState} from 'react'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow'
import './css/Colorbar.css'
import Metadata from "./MetaData";
import { LuSettings } from "react-icons/lu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import ColorAdjuster from "./Elements/ColorAdjuster";
import {Button} from '@/components/ui'
import { PiSwap } from "react-icons/pi";
import { UnivariateColorbar } from "./Elements/UnivariateColorbar";
import { operationMap } from "./Elements/colorbarUtils";
import { BivariateColorbar } from "./Elements/BivariateColorbar";
import { useIsMobile } from "@/hooks";

const Colorbar = ({metadata} : { metadata: Record<string, any>}) => {
    const {variable, variable2, bivariate, units:unitList} = useGlobalStore(useShallow(s => ({
        variable:s.variable, variable2: s.variable2, bivariate: s.bivariate, units: s.units
    })));
    const colorScale = usePlotStore(s => s.colorScale);
    const {variable2:analysisVar2, analysisMode, analysisInfo, execute} = useAnalysisStore(useShallow(s => s));
    const {operation, kernelOp} = analysisInfo?? {operation:undefined, kernelOp:undefined};
    const [bivariateSelection, setBivariateSelection] = useState(0);
    const thisVariable = [variable, variable2][bivariateSelection];
    const units = unitList[bivariateSelection];
    // --- Tick State --- //
    const [tickCount, setTickCount] = useState<number>(5)
    // --- Title States --- //
    const colorString = colorScale ? `(${colorScale?.slice(0,-1)})` : ''
    const analysisString = useMemo(()=>{
        if (analysisMode){
            const twoVar = Boolean(analysisVar2);
            const thisOperation = (operation === "Convolution") ? kernelOp : operation
            const theseUnits = operationMap[thisOperation as keyof typeof operationMap] 
            const string = twoVar ? `+ ${analysisVar2} (${theseUnits})` : `[${units}] (${theseUnits})`
            return string
        } else{
            return units ? `[${units}]` : ''
        }
    },[analysisMode, execute, units, kernelOp, operation, analysisVar2])
    const isMobile = useIsMobile();
    const thisWidth = isMobile ? 200 : 512
    useEffect(()=>{
        // Reset color states when new variable or bivariate changes
        usePlotStore.setState({
            cScale: 1,
            cOffset: 0,
            colorScale: undefined
        })
    },[variable, variable2, bivariate])
    return (
        <>
        <div className='colorbar place-items-center' >
            <p className="colorbar-title"
                style={{
                    position:'absolute',
                    top:'-30px',
                    left:'50%',
                    transform:'translateX(-50%)',
            }}>
                {bivariate &&
                    <Button
                        className="p-0 py-0 my-0 "
                        onClick={()=>setBivariateSelection(x => (x + 1) % 2)}
                        variant={'ghost'}
                        size={'sm'}
                    >
                        <PiSwap className="m-0 p-0"/>
                    </Button>
                }
                {<Metadata data={metadata} variable={thisVariable} isMobile={true} />}
                {`${analysisString}`}
                {`${colorString}`}
            </p>
            {bivariate 
                ? <BivariateColorbar width={thisWidth} height={24} 
                    bivariateSelection={bivariateSelection} 
                    tickCount={tickCount}
                    />
                : <UnivariateColorbar width={thisWidth} height={24} tickCount={tickCount}/>}
        <div
            style={{
                position:'absolute',
                right:'0%',
                bottom:'100%',
                display:'flex',
                width:'10%',
                justifyContent:'space-around'
            }}
        >
            <FaMinus className='cursor-pointer' onClick={()=>setTickCount(Math.max(tickCount-1, 2))}/>
            <FaPlus className='cursor-pointer' onClick={()=>setTickCount(Math.min(tickCount+1, 10))}/>
        </div>
        {!bivariate && <Popover>
            <PopoverTrigger asChild>
                <LuSettings 
                    style={{
                        position:'absolute',
                        right: '101%',
                        bottom:'50%',
                        cursor:'pointer',
                        transform:'translatey(50%)'
                    }}
                    size={20}
                />
            </PopoverTrigger>
            <PopoverContent>
                <ColorAdjuster />
            </PopoverContent>
        </Popover>
        }
        </div>
        </>
        
    )
}

export default React.memo(Colorbar)