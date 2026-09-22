import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { useZarrStore } from '@/GlobalStates/ZarrStore'
import React from 'react'

export const useAxisIndices = () => {
	const axisMapping = useZarrStore(s => s.axisMapping)
	const dimArrays = useGlobalStore(s => s.dimArrays)
	const shapeLength = dimArrays.length;
    const xIdx = (axisMapping.x >= 0 && axisMapping.x < shapeLength) ? axisMapping.x : Math.max(0, shapeLength - 1);
    const yIdx = (axisMapping.y >= 0 && axisMapping.y < shapeLength) ? axisMapping.y : Math.max(0, shapeLength - 2);
    const zIdx = (axisMapping.z >= 0 && axisMapping.z < shapeLength) ? axisMapping.z : Math.max(0, shapeLength - 3);
	const dimIdx = { xIdx, yIdx, zIdx }
    return dimIdx
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
