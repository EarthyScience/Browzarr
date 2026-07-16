import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { useZarrStore } from '@/GlobalStates/ZarrStore'
import React from 'react'
import { useShallow } from 'zustand/shallow'



export const useAxisIndices = () => {
	const { axisMapping } = useZarrStore(useShallow(state => ({
		  axisMapping: state.axisMapping
	})))
	const { dimArrays } = useGlobalStore(useShallow(state => ({
		dimArrays: state.dimArrays
	})))
	const shapeLength = dimArrays.length;
    const xIdx = axisMapping.x >= 0 ? axisMapping.x : shapeLength - 1;
    const yIdx = axisMapping.y >= 0 ? axisMapping.y : shapeLength - 2;
    const zIdx = axisMapping.z >= 0 ? axisMapping.z : shapeLength - 3;

    return {
		xIdx, yIdx, zIdx
	}
}


