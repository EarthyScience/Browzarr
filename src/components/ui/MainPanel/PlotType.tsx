"use client";

import React, { useEffect, useState } from 'react'
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
  const { plotType, setPlotType } = usePlotStore(useShallow(state => ({
    plotType: state.plotType,
    setPlotType: state.setPlotType
  })))
  const isFlat = useGlobalStore(state => state.isFlat)
  // Responsive popover side
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
  
  useEffect(() => {
    const handleResize = () => {
      setPopoverSide(window.innerWidth < 768 ? "top" : "left");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <Tooltip delayDuration={500} >
            <TooltipTrigger asChild>
              <div>
                <Button
                variant="ghost"
                size="icon"
                className='cursor-pointer hover:scale-90 transition-transform duration-100 ease-out'
                tabIndex={0}
                aria-label="Select plot type"
              >
                {plotIcons[plotType as keyof typeof plotIcons]}
              </Button>
            </div>
            </TooltipTrigger>
            {popoverSide === "left" ? (
              <TooltipContent side="left" align="start">
                <span>Change plot type</span>
              </TooltipContent>
            ) : (
              <TooltipContent side="top" align="center">
                <span>Change plot type</span>
              </TooltipContent>
            )}
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
            return <Button
            key={val}
            variant={plotType === val ? "default" : "ghost"}
            className="mb-2 w-12 h-12 flex items-center cursor-pointer justify-center transform transition-transform duration-100 ease-out hover:scale-90"
              onClick={() => {
              setPlotType(val);
            }}
            aria-label={`Select ${val}`}
          >
            {plotIcons[val as keyof typeof plotIcons]}
          </Button>
          }
          }
        )}
      </PopoverContent>
    </Popover>
  )
}

export default PlotType
