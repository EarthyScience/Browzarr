import { useGlobalStore, useImageExportStore } from '@/utils/GlobalStates'
import React from 'react'
import { useShallow } from 'zustand/shallow'

export const ExportExtent = () => {
    const {customRes, previewExtent} = useImageExportStore(useShallow(state=> ({
        customRes:state.customRes, previewExtent:state.previewExtent
    })))

    const dpr = useGlobalStore.getState().DPR || window.devicePixelRatio || 1;

    const aspectRatio = customRes[0]/customRes[1]
  return (
    <div style={{
            position:'fixed',
            width:`calc(100vh*${aspectRatio})`,
            height:`100%`,
            left:'50%',
            top:'50%',
            transform:'translate(-50%, -50%)',
            display: previewExtent ? '' : "none",
            background:"rgba(200,30,30,0.2)",
            zIndex:4
        }}
    >
        {/* Horizontal */}
        <div
            style={{
                position:"absolute",
                width: '100%',
                top:'50%',
                borderTop:'1px solid black',
                borderBottom:'1px solid black',
            }}
        />
        <div
            style={{
                position:"absolute",
                width: '100%',
                top:'25%',
                borderTop:'1px dashed black',
            }}
        />
        <div
            style={{
                position:"absolute",
                width: '100%',
                top:'75%',
                borderBottom:'1px dashed black',
            }}
        />
        {/* Vertical */}
        <div
            style={{
                position:"absolute",
                height: '100%',
                left:'50%',
                borderLeft:'1px solid black',
                borderRight:'1px solid black',
            }}
        />
        <div
            style={{
                position:"absolute",
                height: '100%',
                left:'25%',
                borderLeft:'1px dashed black',
            }}
        />
        <div
            style={{
                position:"absolute",
                height: '100%',
                left:'75%',
                borderRight:'1px dashed black',
            }}
        />
    </div>

  )
}

