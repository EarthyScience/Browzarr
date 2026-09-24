import { useColormapStore } from '@/GlobalStates/ColormapStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import React from 'react'

export const useValueScales = () => {
    const valueScales = useGlobalStore(s => s.valueScales);
    const bivariateSelection = useColormapStore(s => s.bivariateSelection)
    const thisScale = valueScales[bivariateSelection]
    return thisScale
}

export const getValueScales = () => {
    const {valueScales} = useGlobalStore.getState()
    const {bivariateSelection} = useColormapStore.getState()
    return valueScales[bivariateSelection]
}