"use client";

import React from 'react'
import { VscGraphLine } from "react-icons/vsc"; //Use this if you hate the svg
import { usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow';
import './css/PlotLineButton.css'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

const PlotLineButton = () => {
    const {selectTS, resetAnim, animate, setSelectTS, setResetAnim} = usePlotStore(useShallow(state => ({
        selectTS: state.selectTS,
        resetAnim: state.resetAnim,
        animate: state.animate,
        setSelectTS: state.setSelectTS,
        setResetAnim: state.setResetAnim
    })))

  return (
    <div className='selectTS' 
      style={{display: animate ? 'none' : ''}}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 cursor-pointer"
            onClick={() => {setResetAnim(!resetAnim); setSelectTS(!selectTS)}}
          >
            <VscGraphLine
              className="size-6"
              style={{
              color: selectTS ? "gold" : "grey",
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
