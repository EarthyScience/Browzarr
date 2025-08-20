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

const plotTypes = ['volume', 'point-cloud', 'sphere', 'flat']
const plotIcons = {
  'volume': <PiCubeLight className='panel-item'/>,
  'point-cloud': <CgMenuGridO className='panel-item'/>,
  'sphere':<PiSphereThin className='panel-item'/>,
  'flat':<MdOutlineSquare className='panel-item'/>
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
        <Button
          variant="ghost"
          size="icon"
          className='hover:scale-90 transition-transform duration-100 ease-out'
          tabIndex={0}
          aria-label="Select plot type"
        >
          {plotIcons[plotType as keyof typeof plotIcons]}
        </Button>

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
