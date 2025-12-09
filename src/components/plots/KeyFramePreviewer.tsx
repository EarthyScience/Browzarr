"use client";
import { useImageExportStore, usePlotStore } from '@/utils/GlobalStates'
import { invalidate, useThree } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/shallow'


export const KeyFramePreviewer = () => {
    const {keyFrames, viewFrame, previewKeyFrames, frames, 
        frameRate, useTime, timeRate, orbit, loopTime,} = useImageExportStore(useShallow(state => ({
        keyFrames:state.keyFrames, viewFrame:state.viewFrame, previewKeyFrames:state.previewKeyFrames,
        frames:state.frames, frameRate:state.frameRate, useTime:state.useTime, timeRate:state.timeRate, 
        orbit:state.orbit, loopTime:state.loopTime
    })))

    const {camera} = useThree();
    const isAnimating = useRef(false)

    // PREVIEW KEYFRAME
    useEffect(()=>{
        if (!viewFrame || !keyFrames) return;
        const {visual, camera:cameraState} = keyFrames.get(viewFrame)
        usePlotStore.setState(visual)
        camera.position.copy(cameraState.position)
        camera.rotation.copy(cameraState.rotation)
        camera.updateProjectionMatrix();
        invalidate();
    },[viewFrame])

    // PREVIEW ANIMATION
    useEffect(()=>{

    },[previewKeyFrames])
  return null
}

 
