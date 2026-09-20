import React, {useState} from 'react'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useShallow } from 'zustand/shallow'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { useDimAxis, useAxisIndices, useIsMobile } from '@/hooks'
import { ChevronLeft } from 'lucide-react'
import { MinMaxSlider } from '../MainPanel/AdjustPlot'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from '@/components/ui';

export const AxisCropper = () => {
  	const {xRange, yRange, zRange, setXRange, setYRange, setZRange} = usePlotStore(useShallow(s => ({
		xRange:s.xRange, yRange:s.yRange, zRange:s.zRange,
		setXRange:s.setXRange, setYRange:s.setYRange, setZRange:s.setZRange
	})))
	const defaultScales = {minVal: 0, maxVal: 0} //This is fed into MinMax as it is required but overwritten if an array is present
	const {xArray, yArray, zArray} = useDimAxis()
	const {axisDimNames, axisDimUnits} = useGlobalStore(useShallow(s => ({
		axisDimNames: s.axisDimNames, axisDimUnits:s.axisDimUnits
	})))
	const {xIdx, yIdx, zIdx} = useAxisIndices()
    const [showCrop, setShowCrop] = useState(false)
	const isMobile = useIsMobile();
	const popoverSide = isMobile ? "top" : "left";
  return (
    <Popover open={showCrop} onOpenChange={setShowCrop}>
		<PopoverTrigger asChild>
			<div className='flex items-center justify-between mb-2'>
			<ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${
				showCrop ? '' : 'rotate-180'} z-5`} />
			<Button
				variant='secondary'
				className="flex items-center flex-grow justify-center gap-2 my-[-10px] p-1 h-auto border-solid border-gray border-[1px]"
			>
				Axis Cropping
			</Button>
			</div>
		</PopoverTrigger>
		<PopoverContent side={popoverSide}>
			<div className="flex flex-col gap-6 items-center mx-2">
				<div className="flex flex-col w-full">
					<div className="flex flex-col items-center gap-2">
						<div className='grid w-[100%] place-items-center'>
							<h2>{axisDimNames[xIdx]}</h2>
							<MinMaxSlider 
							range={xRange} 
							setRange={setXRange} 
							valueScales={defaultScales} 
							array={xArray} 
							units={axisDimUnits[xIdx]}
							/>
						</div>
						<div className='grid w-[100%] place-items-center'>
							<h2>{axisDimNames[yIdx]}</h2>
							<MinMaxSlider 
							range={yRange} 
							setRange={setYRange} 
							valueScales={defaultScales} 
							array={yArray} 
							units={axisDimUnits[yIdx]}
							/>
						</div>
						<div className='grid w-[100%] place-items-center'>
							<h2>{axisDimNames[zIdx]}</h2>
							<MinMaxSlider 
							range={zRange} 
							setRange={setZRange} 
							valueScales={defaultScales} 
							array={zArray} 
							units={axisDimUnits[zIdx]}
							/>
						</div>
					</div>
				</div>
			</div>
		</PopoverContent>
	</Popover>
  )
}
