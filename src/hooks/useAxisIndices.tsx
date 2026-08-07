import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { useZarrStore } from '@/GlobalStates/ZarrStore'
import React from 'react'
import { useShallow } from 'zustand/shallow'


export const useAxisIndices = () => {
	const { axisMapping } = useZarrStore(useShallow(s => s))
	const { dimArrays } = useGlobalStore(useShallow(s => s))
	const shapeLength = dimArrays.length;
    const xIdx = (axisMapping.x >= 0 && axisMapping.x < shapeLength) ? axisMapping.x : Math.max(0, shapeLength - 1);
    const yIdx = (axisMapping.y >= 0 && axisMapping.y < shapeLength) ? axisMapping.y : Math.max(0, shapeLength - 2);
    const zIdx = (axisMapping.z >= 0 && axisMapping.z < shapeLength) ? axisMapping.z : Math.max(0, shapeLength - 3);

    return {
		xIdx, yIdx, zIdx
	}
}

export const getAxisIndices = () => {
	const { axisMapping } = useZarrStore.getState()
	const { dimArrays } = useGlobalStore.getState()
	const shapeLength = dimArrays.length;
	const xIdx = (axisMapping.x >= 0 && axisMapping.x < shapeLength) ? axisMapping.x : Math.max(0, shapeLength - 1);
	const yIdx = (axisMapping.y >= 0 && axisMapping.y < shapeLength) ? axisMapping.y : Math.max(0, shapeLength - 2);
	const zIdx = (axisMapping.z >= 0 && axisMapping.z < shapeLength) ? axisMapping.z : Math.max(0, shapeLength - 3);
	return {
		xIdx, yIdx, zIdx
	}
}
