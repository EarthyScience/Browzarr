import React from 'react'
import "../css/AxisBars.css"
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'

export const AxisBars = () => {
    const {setCameraPosition} = usePlotStore(useShallow(state =>({
        setCameraPosition: state.setCameraPosition
    })))

  return (
    <div className="axis-panel">
        <div className="origin"/>

        <div className="axis axis-x"
            onClick={()=>setCameraPosition(new THREE.Vector3(5, 0, 0))}
            onDoubleClick={()=>setCameraPosition(new THREE.Vector3(-5, 0, 0))}
        >
            <div className="shaft"/>
            <div className="arrow"/>
            <span className="axis-label">X</span>
        </div>

        <div className="axis axis-y"
            onClick={()=>setCameraPosition(new THREE.Vector3(0, 5, 0))}
            onDoubleClick={()=>setCameraPosition(new THREE.Vector3(0, -5, 0))}
        >
            <div className="shaft"/>
            <div className="arrow"/>
            <span className="axis-label">Y</span>
        </div>

        <div className="axis axis-z"
            onClick={()=>setCameraPosition(new THREE.Vector3(0, 0, 5))}
            onDoubleClick={()=>setCameraPosition(new THREE.Vector3(0, 0, -5))}
        >
            <div className="shaft"/>
            <div className="arrow"/>
            <span className="axis-label">Z</span>
        </div>
</div>
  )
}


