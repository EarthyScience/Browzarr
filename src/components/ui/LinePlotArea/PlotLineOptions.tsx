import React from 'react'
import { Button } from "@/components/ui/button"
import '../css/PlotLineOptions.css'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { Slider } from "@/components/ui/slider"

// Memoized Point Options
const PointOptions = React.memo(function PointOptions(){
  const { showPoints, linePointSize, pointColor, useCustomPointColor, setLinePointSize, setPointColor, setUseCustomPointColor } = usePlotStore(useShallow(state => ({
    showPoints: state.showPoints,
    linePointSize: state.linePointSize,
    pointColor: state.pointColor,
    useCustomPointColor: state.useCustomPointColor,
    setLinePointSize: state.setLinePointSize,
    setPointColor: state.setPointColor,
    setUseCustomPointColor: state.setUseCustomPointColor
  })))
  if (!showPoints) return null
  return (
    <>
      <div className='w-full flex items-center mb-2'>
        <div className='w-[40%]'><b>Point Size</b></div>
        <Slider
          min={1}
          max={10}
          step={0.1}
          value={[linePointSize]}
          className='flex-1 my-2'
          onValueChange={(vals: number[]) => setLinePointSize(vals[0])}
        />
      </div>
      <div className='w-full flex items-center mb-2'>
        <div className='w-[40%]'><b>Point Color</b></div>

        {useCustomPointColor && <input
          type='color'
          title='Point Color'
          value={pointColor}
          onChange={e => setPointColor(e.target.value)}
        />}
        <Button
          className="h-8 px-2 py-1"
          variant='outline'
          onClick={() => setUseCustomPointColor(!useCustomPointColor)}
        >
          Use  
          {useCustomPointColor ? " Browzarr Color" : " Custom Color"}
        </Button>
      </div>
    </>
  )
})

// Memoized Line Options
const LineOptions = React.memo(function LineOptions(){
  const { lineWidth, lineColor, useLineColor, lineResolution, useCustomColor, 
    setLineWidth, setLineColor, setUseLineColor, setLineResolution, setUseCustomColor,  } = usePlotStore(useShallow(state => ({
    lineWidth: state.lineWidth,
    lineColor: state.lineColor,
    useLineColor: state.useLineColor,
    lineResolution: state.lineResolution,
    useCustomColor: state.useCustomColor,
    setLineWidth: state.setLineWidth,
    setLineColor: state.setLineColor,
    setUseLineColor: state.setUseLineColor,
    setLineResolution: state.setLineResolution,
    setUseCustomColor: state.setUseCustomColor,
  })))
  return (
    <>
      <div className='w-full flex items-center mb-2'>
        <div className='w-[40%]'><b>Line Width</b></div>
        <Slider
          min={1}
          max={10}
          step={0.2}
          value={[lineWidth]}
          className='flex-1 my-2'
          onValueChange={(vals: number[]) => setLineWidth(vals[0])}
        />
      </div>
      <div className='w-full flex items-center mb-2'>
        <div className='w-[40%]'><b>Line Resolution</b></div>
        <Slider
          min={1}
          max={10}
          step={1}
          value={[lineResolution]}
          className='flex-1 my-2'
          onValueChange={(vals: number[]) => setLineResolution(vals[0])}
        />
      </div>
      <div className='w-full flex items-center'>
        <div className='w-[40%]'><b>Line Color</b></div>
        {useCustomColor && (
          <input
            type='color'
            title='Line Color'
            value={lineColor}
            onChange={e => setLineColor(e.target.value)}
          />
        )}
        {!useCustomColor && 
        <Button
          className="h-8 px-2 py-5"
          variant='outline'
          onClick={() => setUseLineColor(!useLineColor)}
        >
          Use <br/>
          {useLineColor ? "Individual Color" : "Plot Color"}
        </Button>}
        <Button
          className="h-8 px-2 py-5"
          variant='outline'
          onClick={() => setUseCustomColor(!useCustomColor)}
        >
          Use <br/>
          {useCustomColor ? "Browzarr Color" : "Custom Color"}
        </Button>
      </div>
    </>
  )
})

const PlotLineOptions = React.memo(function PlotLineOptions(){
  const { showPoints, setShowPoints } = usePlotStore(useShallow(state => ({
    showPoints: state.showPoints,
    setShowPoints: state.setShowPoints,
  })))

  return (
    <div className='plotline-options'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="cursor-pointer" variant="outline">Line Options</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 items-center" align="center">
          <DropdownMenuGroup onClick={e => e.preventDefault()}>
            <DropdownMenuItem>
              <Button
                variant="outline"
                onClick={e => {
                  e.preventDefault()
                  setShowPoints(!showPoints)
                }}
              >
                {showPoints ? "Hide Points" : "Show Points"}
              </Button>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <PointOptions />
          <DropdownMenuSeparator />
          <LineOptions />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

export default PlotLineOptions