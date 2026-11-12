"use client";
import { useImageExportStore } from '@/stores/ImageExportStore';
import { usePlotStore } from '@/stores/PlotStore';
import { invalidate, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/shallow'
import { applyAnimationFrame, createAnimationPlan } from '@/lib/keyFrames';

export const KeyFramePreviewer = () => {
    const {keyFrames, currentFrame, previewKeyFrames} = useImageExportStore(useShallow(s => ({
        keyFrames: s.keyFrames,
        currentFrame: s.currentFrame,
        previewKeyFrames: s.previewKeyFrames,
    })))

    const {camera} = useThree();
    const isAnimating = useRef(false)

    // Stop a running preview if the keyframes change underneath it
    useEffect(()=>{
        if (useImageExportStore.getState().previewKeyFrames){
            useImageExportStore.setState({previewKeyFrames: false})
        }
    },[keyFrames])

    // ----- PREVIEW FUNCTIONS ---- //

    // PREVIEW KEYFRAME
    useEffect(()=>{
        if (!keyFrames || isAnimating.current) return;
        const plan = createAnimationPlan(camera)
        if (plan.keyFrameList.length === 0) return;
        applyAnimationFrame(plan, currentFrame, camera)
        camera.updateProjectionMatrix();
        invalidate();
    },[currentFrame])

    // PREVIEW ANIMATION
    useEffect(()=>{
        if (!keyFrames || !previewKeyFrames) return;
        const plan = createAnimationPlan(camera)
        if (plan.keyFrameList.length === 0){
            useImageExportStore.setState({previewKeyFrames: false})
            return;
        }
        const {animProg: originalAnimProg, setAnimProg} = usePlotStore.getState()
        const {frameRate, setCurrentFrame} = useImageExportStore.getState()
        isAnimating.current = true;

        let frame = 1;
        const interval = setInterval(()=>{
            if (frame > plan.frames) {
                useImageExportStore.setState({previewKeyFrames: false}) // Cleanup below stops the interval
                return;
            }
            setCurrentFrame(frame)
            applyAnimationFrame(plan, frame, camera)
            camera.updateProjectionMatrix();
            invalidate();
            frame++;
        }, 1000/frameRate)

        return () => {
            clearInterval(interval);
            isAnimating.current = false;
            setAnimProg(originalAnimProg)
        };
    },[previewKeyFrames])
  return null
}
