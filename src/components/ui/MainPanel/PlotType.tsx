"use client";

import React, { useEffect, useMemo, useState } from 'react'
import '../css/MainPanel.css'
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { PiSphereThin } from "react-icons/pi";
import { CgMenuGridO } from "react-icons/cg";
import { PiCubeLight } from "react-icons/pi";
import { MdOutlineSquare } from "react-icons/md";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const plotTypes = ['volume', 'point-cloud', 'sphere', 'flat']
const plotIcons = {
  'volume': <PiCubeLight className="size-8"/>,
  'point-cloud': <CgMenuGridO className="size-8"/>,
  'sphere':<PiSphereThin className="size-8"/>,
  'flat':<MdOutlineSquare className="size-8"/>
}

const PlotType = () => {
  const { plotType, setPlotType, setUseOrtho } = usePlotStore(useShallow(state => ({
    plotType: state.plotType,
    setPlotType: state.setPlotType,
    setUseOrtho: state.setUseOrtho
  })))
  const {isFlat, variable} = useGlobalStore(useShallow(state => ({
    isFlat: state.isFlat,
    variable: state.variable
  })))
  // Responsive popover side
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
  const {dataShape, is4D} = useGlobalStore(useShallow(state => ({
    dataShape: state.dataShape,
    is4D: state.is4D
  })))
  const dataSize = useMemo(()=>{
    if (is4D){
      const product = dataShape.reduce((accum, val) => accum * val, 1)
      return product / dataShape[0]
    } else {
      return dataShape.reduce((accum, val) => accum * val, 1)
    }
  },[dataShape, is4D])

  useEffect(() => {
    const handleResize = () => {
      setPopoverSide(window.innerWidth < 768 ? "top" : "left");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <Popover >
      <PopoverTrigger asChild >
        <div
          style={variable === 'Default' ? { pointerEvents: 'none' } : {}} // Since disabled from PopoverTrigger isn't used by div we just set it here isntead
        >
          <Tooltip delayDuration={500} >
            <TooltipTrigger asChild>
              <div>
                <Button
                variant="ghost"
                size="icon"
                className='cursor-pointer hover:scale-90 transition-transform duration-100 ease-out'
                tabIndex={0}
                aria-label="Select plot type"
                style={{
                color: variable == 'Default' ? 'var(--text-disabled)' :''
              }}
              >
                {plotIcons[plotType as keyof typeof plotIcons]}
              </Button>
            </div>
            </TooltipTrigger>
            <TooltipContent
              side={popoverSide === "left" ? "left" : "top"}
              align={popoverSide === "left" ? "start" : "center"}
            >
              <span>Change plot type</span>
            </TooltipContent>
          </Tooltip>
      </div>
      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        className="flex flex-col items-center min-w-[48px] max-w-[72px] w-[56px] p-2 mb-1"
      >
        {plotTypes.map((val, idx) => {    
          if (idx < 2 && isFlat){ //Hide options not available when flat data
            return null
          }      
          else{
            const isLargePointCloud = val == 'point-cloud' && dataSize > 30e6;
            const button = <Button
            key={val}
            variant={plotType === val ? "default" : "ghost"}
            className={`mb-2 w-12 h-12 flex items-center ${isLargePointCloud ? 'bg-amber-400 hover:bg-amber-200' : null} cursor-pointer justify-center transform transition-transform duration-100 ease-out hover:scale-90`}
            onClick={() => {
              setPlotType(val);
              if(val == "flat"){
                setUseOrtho(true)
              }
            }}
            aria-label={`Select ${val}`}
            >
              {plotIcons[val as keyof typeof plotIcons]}
            </Button>

            if (isLargePointCloud){
              return <Tooltip key={'pc-warning-tooltip'} open={true}>
                <TooltipTrigger asChild>
                  <div key={'pc-warning'}>
                    {button}
                  </div>
                </TooltipTrigger>
                <TooltipContent side='left'>
                  Expect poor performance
                </TooltipContent>
              </Tooltip>
            }
            return button
            }
          }
        )}
      </PopoverContent>
    </Popover>
  )
}

export default PlotType
