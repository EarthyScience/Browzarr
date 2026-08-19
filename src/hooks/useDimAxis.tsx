import React, { useMemo } from 'react'
import { getAxisIndices, useAxisIndices } from './useAxisIndices'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useShallow } from 'zustand/shallow'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'

export const useDimAxis = () => {
    const {axisDimArrays} = useGlobalStore(useShallow(s => s));
    const {zSlice, ySlice, xSlice} = usePlotStore(useShallow(s => s));
    const {zIdx, yIdx, xIdx} = useAxisIndices();
    const arrays = useMemo(()=>{
        const zArray = axisDimArrays[zIdx].slice(zSlice[0], zSlice[1]?? undefined);
        const yArray = axisDimArrays[yIdx].slice(ySlice[0], ySlice[1]?? undefined);
        const xArray = axisDimArrays[xIdx].slice(xSlice[0], xSlice[1]?? undefined);
        return {
            zArray,
            yArray,
            xArray
        }
    },[axisDimArrays,zSlice,ySlice,xSlice, zIdx, yIdx, xIdx])

    return arrays
}

export const getDimAxis = () => {
    const {dimArrays} = useGlobalStore.getState();
    const {zSlice, ySlice, xSlice} = usePlotStore.getState();
    const {zIdx, yIdx, xIdx} = getAxisIndices();
    const zArray = dimArrays[zIdx].slice(zSlice[0], zSlice[1]?? undefined);
    const yArray = dimArrays[yIdx].slice(ySlice[0], ySlice[1]?? undefined);
    const xArray = dimArrays[xIdx].slice(xSlice[0], xSlice[1]?? undefined);
    return {
        zArray,
        yArray,
        xArray
    }
}
