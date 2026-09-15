import React, {useCallback, useRef} from 'react'
import { AxisSlider } from './';

export const SliderGroup = ({ dimCount, collapsed, canShrink, updateSelectionInfo} 
  : { dimCount: number, collapsed: boolean, canShrink: boolean, updateSelectionInfo: (dim:string, dimObj: Record<string,any>) => void}) => {
    const updateDimSelection = useCallback((dim:string, dimData: Record<string, number>) => {
        updateSelectionInfo(dim, dimData)
    }, [updateSelectionInfo])

    const axisStyling= dimCount == 3
		? [{name: 'z',color: 'blue-500'}, {name: 'y',color: 'green-500' },{name: 'x',color: 'pink-500'}]
		: [{name: 'y',color: 'green-500' },{name: 'x',color: 'pink-500'}]

  return (
    <div className='grid gap-2'>
      {Array.from({length:dimCount}).map((_val,idx)=>(
        <AxisSlider 
			key={idx} 
			isSlice={!collapsed} 
			itemIdx={idx} 
			removable={canShrink && idx == dimCount - 1} 
			style={axisStyling[idx]}
			updateDimSelection={updateDimSelection} 
		/>
      ))}
    </div>
  )
}

