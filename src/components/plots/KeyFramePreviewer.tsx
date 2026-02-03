"use client";
import { useGlobalStore, useImageExportStore, usePlotStore } from '@/GlobalStates'
import { invalidate, useThree } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { lerp } from 'three/src/math/MathUtils.js';
import { deg2rad } from '@/utils/HelperFuncs';

export const KeyFramePreviewer = () => {
    const {keyFrames, currentFrame, previewKeyFrames, frames, 
        frameRate, useTime, timeRate, orbit, orbitDeg, orbitDir, loopTime,} = useImageExportStore(useShallow(state => ({
        keyFrames:state.keyFrames, currentFrame:state.currentFrame, previewKeyFrames:state.previewKeyFrames,
        frames:state.frames, frameRate:state.frameRate, useTime:state.useTime, timeRate:state.timeRate, 
        orbit:state.orbit, orbitDeg:state.orbitDeg, orbitDir:state.orbitDir, loopTime:state.loopTime
    })))

    const {camera} = useThree();
    const isAnimating = useRef(false)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const originalAnimProg = useRef<number>(0)
    const { originalAngle, radius } = useMemo(()=>{
        isAnimating.current = false; // End animation if Keyframes change
        clearTimeout(intervalRef.current as NodeJS.Timeout)
        if (!keyFrames){
            return { radius:0, originalAngle:0}
        };
        const keyFrameList = Array.from(keyFrames.keys()).sort((a, b) => a - b)
        if(keyFrameList.length === 0){
            return { radius:0, originalAngle:0}
        }
        const origCamera = keyFrames.get(keyFrameList[0]).camera
        const originalPos = {
                    x: origCamera.position.x,
                    y: origCamera.position.y,
                    z: origCamera.position.z
                };
        const radius = Math.sqrt(originalPos.x ** 2 + originalPos.z ** 2);
        const originalAngle = Math.atan2(originalPos.x, originalPos.z);
        return { radius, originalAngle}
    },[keyFrames])
    const timeRatio = timeRate/frameRate;

    const KeyFrameLerper = (startState: Record<string,any>, endState:Record<string,any>, alpha:number, useCamera=true) => {
        const startVizState = startState["visual"]
        const endVizState = endState["visual"]
        const startTime = startState["time"]
        const endTime = endState["time"]
        const lerpedVizState: Record<string, any> = {};
        const lerpedCamState: Record<string, any> = {};   

        Object.keys(startVizState).forEach(key => {
            const sourceValue = startVizState[key];
            const targetValue = endVizState[key];
            
            // Check if both values are numbers
            if (typeof sourceValue === 'number' && typeof targetValue === 'number') {
                lerpedVizState[key] = lerp(sourceValue, targetValue, alpha);
            }
            else if (sourceValue.length){ // If Array
                lerpedVizState[key] = []
                for (let i = 0; i < sourceValue.length; i++){
                    lerpedVizState[key][i] = lerp(sourceValue[i], targetValue[i], alpha);
                }
            }
            // Handle Vector3, arrays, or other lerpable objects
            else if (sourceValue?.lerp && typeof sourceValue.lerp === 'function') {
                lerpedVizState[key] = sourceValue.clone().lerp(targetValue, alpha);
            }
            // For non-numeric values, just copy from target
            else {
                lerpedVizState[key] = targetValue;
            }
        });
        usePlotStore.setState(lerpedVizState)
        if (!useTime){
            const newTime = lerp(startTime, endTime, alpha)
            usePlotStore.setState({animProg: newTime})
        }

        if (useCamera){ // Don't lerp camera if orbiting
            const startCamState = startState["camera"]
            const endCamState = endState["camera"]
            Object.keys(startCamState).forEach(key => {
                const sourceValue = startCamState[key];
                const targetValue = endCamState[key];
                if (sourceValue.isEuler){
                    const startQuat = new THREE.Quaternion().setFromEuler(sourceValue);
                    const endQuat   = new THREE.Quaternion().setFromEuler(targetValue);

                    const resultQuat = new THREE.Quaternion().copy(startQuat).slerp(endQuat, alpha);
                    lerpedCamState[key]= new THREE.Euler().setFromQuaternion(resultQuat);

                } else{
                    lerpedCamState[key] = sourceValue.clone().lerp(targetValue,alpha)
                }
            });
            camera.position.copy(lerpedCamState.position)
            camera.rotation.copy(lerpedCamState.rotation)
            camera.updateProjectionMatrix();
            invalidate();
        }
    }

    // ----- PREVIEW FUNCTIONS ---- //

    // PREVIEW KEYFRAME
    useEffect(()=>{
        if (!keyFrames || isAnimating.current) return;
        const keyFrameList = Array.from(keyFrames.keys()).sort((a, b) => a - b)
        if (keyFrameList.length == 0) return;
        const keyFrameIdx = Math.max(keyFrameList.findLastIndex(n => n <= currentFrame), 0)
        const startFrame = keyFrameList[keyFrameIdx]
        if (keyFrameIdx+1 < keyFrameList.length){
            const endFrame = keyFrameList[keyFrameIdx+1]
            const thisFrames = endFrame-startFrame;
            const alpha = Math.max(currentFrame-startFrame, 0)/thisFrames;
            const startState = keyFrames?.get(startFrame)
            const endState = keyFrames?.get(endFrame)
            KeyFrameLerper(startState, endState, alpha, !orbit)
        } else {
            const {visual, camera:cameraState} = keyFrames.get(startFrame)
            usePlotStore.setState(visual)
            if (!orbit){
                camera.position.copy(cameraState.position)
                camera.rotation.copy(cameraState.rotation)
                camera.updateProjectionMatrix();
                invalidate();
            }
        }   
        if (useTime) { 
            //This is currently incongruent with the export. This uses the timestep at the first keyframe as the intital progress
            //whereas export uses the current timestep at time of export. If the first keyframe is not on the first frame export will look different than preview. 
            //Will come back to this
            const animProg = keyFrames?.get(keyFrameList[0]).time
            const {dataShape} = useGlobalStore.getState()
            const timeFrames = dataShape[dataShape.length-3]
            const dt = 1/timeFrames
            let newProg = dt * Math.floor(currentFrame * timeRatio) + animProg;
            newProg = loopTime ? newProg - Math.floor(newProg) : Math.min(newProg, 1);
            usePlotStore.setState({animProg:newProg})
        }
        if (orbit){
            const angle = (currentFrame / (frames+1)) * deg2rad(orbitDeg);
            const newAngle = originalAngle + (orbitDir ? -angle : angle);
            camera.position.x = radius * Math.sin(newAngle);
            camera.position.z = radius * Math.cos(newAngle);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
            invalidate();
        }
    },[currentFrame])

    // PREVIEW ANIMATION
    useEffect(()=>{
        if (!keyFrames || isAnimating.current) return;
        const {animProg, setAnimProg} = usePlotStore.getState()
        originalAnimProg.current = animProg
        const keyFrameList = Array.from(keyFrames.keys()).sort((a, b) => a - b)
        const {dataShape} = useGlobalStore.getState()
        const timeFrames = dataShape[dataShape.length-3]
        const dt = 1/timeFrames

        let keyFrameIdx = 0;
        let frame = 0;
        intervalRef.current = setInterval(()=>{
            if (frame > frames) {
                clearInterval(intervalRef.current as NodeJS.Timeout);
                isAnimating.current = false;
                setAnimProg(originalAnimProg.current)
                return;
            }
            useImageExportStore.getState().setCurrentFrame(frame)
            const startFrame = keyFrameList[keyFrameIdx];
            if (keyFrameIdx + 1 < keyFrameList.length) {
                const endFrame = keyFrameList[keyFrameIdx + 1];
                const thisFrames = endFrame - startFrame;
                const alpha = Math.max(frame - startFrame, 0) / thisFrames;
                const startState = keyFrames.get(startFrame);
                const endState = keyFrames.get(endFrame);
                KeyFrameLerper(startState, endState, alpha, !orbit); // Don't lerp camera if orbiting
                if (frame >= endFrame) keyFrameIdx++;
            } else {
                const { visual, camera: cameraState } = keyFrames.get(startFrame);
                usePlotStore.setState(visual);
                if (!orbit){  // Don't lerp camera if orbiting
                    camera.position.copy(cameraState.position);
                    camera.rotation.copy(cameraState.rotation);
                    camera.updateProjectionMatrix();
                    invalidate();
                }
            }
            if (useTime) {
                let newProg = dt * Math.floor(frame * timeRatio) + animProg;
                newProg = loopTime ? newProg - Math.floor(newProg) : Math.min(newProg, 1);
                setAnimProg(newProg);
            }
            if (orbit){
                const angle = (frame / (frames+1)) * deg2rad(orbitDeg);
                const newAngle = originalAngle + (orbitDir ? -angle : angle);
                camera.position.x = radius * Math.sin(newAngle);
                camera.position.z = radius * Math.cos(newAngle);
                camera.lookAt(0, 0, 0);
                camera.updateProjectionMatrix();
                invalidate();
            }
            frame ++;
        }, 1000/frameRate)

        isAnimating.current= true;

        return () => clearInterval( intervalRef.current as NodeJS.Timeout);;

    },[previewKeyFrames])
  return null
}

 
