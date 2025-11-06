"use client";

import React from 'react'
import { VscGraphLine } from "react-icons/vsc"; //Use this if you hate the svg
import { useErrorStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow';
import './css/PlotLineButton.css'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

const PlotLineButton = () => {
    const {selectTS, resetAnim, animate, plotType, displaceSurface, setSelectTS, setResetAnim} = usePlotStore(useShallow(state => ({
        selectTS: state.selectTS,
        resetAnim: state.resetAnim,
        animate: state.animate,
        plotType: state.plotType,
        displaceSurface: state.displaceSurface,
        setSelectTS: state.setSelectTS,
        setResetAnim: state.setResetAnim
    })))
    const exception = plotType === 'sphere' && !displaceSurface
    const {setError} = useErrorStore.getState()
  return (
    <div className='selectTS' 
      style={{display: animate ? 'none' : ''}}
      onClick={()=>setError(exception ? 'tsException' : null)}
    >
      <Tooltip delayDuration={500} >
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="right" align="start">
          <p style={{ maxWidth: 220 }}>While active, click the volume to view 1D transects through the given dimension.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default PlotLineButton
