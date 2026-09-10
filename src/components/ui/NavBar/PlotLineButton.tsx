"use client";

import React, { useEffect } from 'react'
import { VscGraphLine } from "react-icons/vsc"; //Use this if you hate the svg
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import '../css/PlotLineButton.css'
import { Button } from "@/components/ui/button-enhanced"
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { QuickTip } from '../Widgets/QuickTip';

const PlotLineButton = () => {
    const {selectTS, resetAnim, displaceFaces, plotType, setSelectTS, setResetAnim} = usePlotStore(useShallow(s => s))
    const isFlat = useGlobalStore(s => s.isFlat)
    const instanced = ['sphere','flatMap'].includes(plotType) && displaceFaces
    const exception = instanced || isFlat
    useEffect(()=>{//Disable TS mode if switching to Flat mode and already enabled
      if (isFlat && selectTS){
        setSelectTS(false)
      }
    },[isFlat])
    const tooltipMsg = () =>{
      if (isFlat){
        return "Data is flat. No timeseries available"
      } else if (instanced){
        return "Transect select doesn't work when using instancing (Displacement of faces)"
      } else{
        return "While active, click the volume to view 1D transects through the given dimension."
      }
    }
  return (
    <QuickTip message={tooltipMsg()} >
      <div> 
        <Button
          variant="ghost"
          size="icon"
          className="size-10 cursor-pointer"
          disabled={exception}
          onClick={() => {setResetAnim(!resetAnim); setSelectTS(!selectTS)}}
        >
          <VscGraphLine
            className="size-6"
            style={{
            color: selectTS ? "gold" : "var(--text-plot)",
            filter: selectTS ? "drop-shadow(0px 0px 10px gold)" : "",
          }}/>
        </Button>
      </div>
    </QuickTip>
  )
}

export default PlotLineButton
