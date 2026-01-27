import React, {useEffect, useMemo} from 'react'
import './Plots.css'
import { useAnalysisStore, useGlobalStore } from '@/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { parseLoc } from '@/utils/HelperFuncs'


const AnalysisInfo = ({loc, show, info, } : {loc: number[], show: boolean, info: number[]}) => {
    const {dimNames, dimUnits} = useGlobalStore(useShallow(state=>({dimNames: state.dimNames, dimUnits: state.dimUnits})))
    const axis = useAnalysisStore(state=> state.axis)
    const plotNames = useMemo(()=>{
        if (dimNames.length < 3){
            return [dimNames[0], dimNames[1]]
        }
        else{
            return dimNames.filter((_val,idx)=> idx != axis)
        }
    },[dimNames,  axis]) 

    const plotUnits = useMemo(()=>{
        if (dimNames.length < 3){
            return [dimUnits[0], dimUnits[1]]
        }
        else{
            return dimUnits.filter((_val,idx)=> idx != axis)
        }
    },[dimUnits, axis])

  return (
    <div className='analysis-overlay'
        style={{
            left:`${loc[0]+10}px`,
            top:`${loc[1]+10}px`,
            display: show ? '' : 'none'
        }}
    >
        {`${plotNames[0]}: ${show && parseLoc(info[0],plotUnits[0])}`}<br/>
        {`${plotNames[1]}: ${show && parseLoc(info[1],plotUnits[1])}`}<br/>
        {`Value: ${Math.round(info[2] * 100)/100}`}
    </div>
    )
}

export default AnalysisInfo
