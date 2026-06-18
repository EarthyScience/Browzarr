"use client";

import React, { useEffect } from 'react'
import { VscGraphLine } from "react-icons/vsc"; //Use this if you hate the svg
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { useShallow } from 'zustand/shallow';
import '../css/PlotLineButton.css'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button-enhanced"
import { useGlobalStore } from '@/GlobalStates/GlobalStore';

const PlotLineButton = () => {
    const {selectTS, resetAnim, animate, displaceSurface, setSelectTS, setResetAnim} = usePlotStore(useShallow(state => ({
        selectTS: state.selectTS,
        resetAnim: state.resetAnim,
        animate: state.animate,
        plotType: state.plotType,
        displaceSurface: state.displaceSurface,
        setSelectTS: state.setSelectTS,
        setResetAnim: state.setResetAnim
    })))
    const {isFlat} = useGlobalStore(useShallow(state => ({isFlat: state.isFlat})))
    const exception = !displaceSurface || isFlat
    const {setError} = useErrorStore.getState()
    useEffect(()=>{//Disable TS mode if switching to Flat mode and already enabled
      if (isFlat && selectTS){
        setSelectTS(false)
      }
    },[isFlat])

    const tooltipMsg = () =>{
      if (isFlat){
        return "Data is flat. No timeseries available"
      } else if (!displaceSurface){
        return "Transect select doesn't work when using instancing (Displacement of faces)"
      } else{
        return "While active, click the volume to view 1D transects through the given dimension."
      }
    }
  return (
      <Tooltip delayDuration={500} >
        <TooltipTrigger asChild>
          {/* Move button into Div so that cursor events are passed to the tooltip trigger when disabled*/}
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
        </TooltipTrigger>
        <TooltipContent side="right" align="start">
          {tooltipMsg()}
        </TooltipContent>
      </Tooltip>
  )
}

export default PlotLineButton
