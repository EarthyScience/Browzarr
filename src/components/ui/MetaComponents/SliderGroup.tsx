import React, {useCallback, useRef} from 'react'
import { AxisSlider } from './AxisSlider';

export const SliderGroup = ({ dimCount, collapsed, canShrink, setSelectionInfo} 
  : { dimCount: number, collapsed: boolean, canShrink: boolean, setSelectionInfo: React.Dispatch<React.SetStateAction<Record<number, any>>>}) => {
    const selectionObject = useRef<Record<number, any>>({})
    const updateDimSelection = useCallback((idx:number, dimData: Record<string, number>) => {
        const deReffed = selectionObject.current;
        deReffed[idx] = dimData
        setSelectionInfo({...deReffed})
    }, [setSelectionInfo])

  return (
    <div className='grid gap-2'>
      {Array.from({length:dimCount}).map((_val,idx)=>(
        <AxisSlider key={idx} isSlice={!collapsed} itemIdx={idx} removable={canShrink && idx == dimCount - 1} updateDimSelection={updateDimSelection} />
      ))}
    </div>
  )
}

