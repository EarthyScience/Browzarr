"use client";

import React, { useMemo } from 'react'
import '../css/MainPanel.css'
import { useGlobalStore } from '@/stores/GlobalStore';
import { usePlotStore } from '@/stores/PlotStore';
import { useShallow } from 'zustand/shallow';
import { PiSphereThin } from "react-icons/pi";
import { CgMenuGridO } from "react-icons/cg";
import { PiCubeLight } from "react-icons/pi";
import { MdOutlineSquare } from "react-icons/md";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button-enhanced"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PanelButton, usePanelSide } from './PanelButton';

const plotTypes = ['volume', 'point-cloud', 'sphere', 'flat']
const plotIcons = {
  'volume': <PiCubeLight className="size-8"/>,
  'point-cloud': <CgMenuGridO className="size-8"/>,
  'sphere':<PiSphereThin className="size-8"/>,
  'flat':<MdOutlineSquare className="size-8"/>
}

const PlotType = () => {
  const { plotType, setPlotType, setUseOrtho } = usePlotStore(useShallow(s => ({
    plotType: s.plotType, setPlotType: s.setPlotType, setUseOrtho: s.setUseOrtho
  })))
  const {isFlat, variable, dataShape, is4D} = useGlobalStore(useShallow(s => ({
    isFlat: s.isFlat, variable: s.variable, dataShape: s.dataShape, is4D: s.is4D
  })))
  const popoverSide = usePanelSide();
  const dataSize = useMemo(()=>{
    const product = dataShape.reduce((accum, val) => accum * val, 1)
    return is4D ? product / dataShape[0] : product
  },[dataShape, is4D])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <PanelButton
          icon={plotIcons[plotType as keyof typeof plotIcons]}
          tooltip="Change plot type"
          disabled={variable === 'Default'}
        />
      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        className="flex flex-col items-center min-w-[48px] max-w-[72px] w-[56px] p-2 mb-1"
      >
        {plotTypes.map((val, idx) => {
          if (idx < 2 && isFlat) return null // Volume/point-cloud unavailable for flat data
          const isLargePointCloud = val == 'point-cloud' && dataSize > 30e6;
          const button = <Button
            key={val}
            variant={plotType === val ? "default" : "ghost"}
            className={`mb-2 w-12 h-12 flex items-center justify-center cursor-pointer transition-transform duration-100 ease-out hover:scale-90 ${isLargePointCloud ? 'bg-amber-400 hover:bg-amber-200' : ''}`}
            onClick={() => {
              setPlotType(val);
              if (val == "flat") setUseOrtho(true)
            }}
            aria-label={`Select ${val}`}
          >
            {plotIcons[val as keyof typeof plotIcons]}
          </Button>

          if (!isLargePointCloud) return button
          return <Tooltip key='pc-warning' open={true}>
            <TooltipTrigger asChild>
              <div>{button}</div>
            </TooltipTrigger>
            <TooltipContent side='left'>
              Expect poor performance
            </TooltipContent>
          </Tooltip>
        })}
      </PopoverContent>
    </Popover>
  )
}

export default PlotType
