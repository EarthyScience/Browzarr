import { usePlotStore } from '@/GlobalStates/PlotStore';
import React, { useMemo } from 'react'
import * as THREE from 'three';
import { useShallow } from 'zustand/shallow';

export const TransformAxis = () => {
    const {showTransformAxis} = usePlotStore(useShallow(state => ({
        showTransformAxis: state.showTransformAxis
    })))
    const geom = useMemo(()=>new THREE.CylinderGeometry(.02, .02, 3),[])
    const material = useMemo(() => new THREE.MeshBasicMaterial({color:'red'}) , [])

    return (
        <mesh 
            geometry={geom}
            material={material}
            rotation={[Math.PI/2, 0, 0]}
            visible={showTransformAxis}
            renderOrder={10}
        />
    )
}
