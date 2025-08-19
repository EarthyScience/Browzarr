"use client";

import React from 'react'
import { VscGraphLine } from "react-icons/vsc"; //Use this if you hate the svg
import { usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow';
import './css/PlotLineButton.css'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
      style={{display: animate ? 'none' : ''}}
    
    onClick={()=> {setResetAnim(!resetAnim); setSelectTS(!selectTS)}}>
      <Tooltip>
        <TooltipTrigger asChild>
          <VscGraphLine size={32}
            style={{
              color:selectTS ? "gold" : "grey",
              filter: selectTS ? "drop-shadow(0px 0px 10px gold)" : "",
              cursor:'pointer'
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="right" align="start">
          <p style={{ maxWidth: 220 }}>While active, click the volume to view 1D transects through the given dimension.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default PlotLineButton
