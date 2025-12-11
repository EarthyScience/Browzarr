"use client";
import React, {useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { useImageExportStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { Slider } from './slider'
import './css/KeyFrames.css'
import { TbDiamondsFilled } from "react-icons/tb";
import { Input } from './input';
import { IoCloseCircleSharp } from "react-icons/io5";

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Pick<T, K>);
}

const SetKeyFrame = (frame: number) =>{
    const {plotType} = usePlotStore.getState()
    const {addKeyFrame} = useImageExportStore.getState()
    let vizStates = []
    if (plotType === "volume"){
        vizStates=["transparency", "vTransferRange", "vTransferScale"];
    } else if (plotType === "point-cloud"){
        vizStates=["scaleIntensity", "pointSize", "timeScale"];
    } else {
        vizStates=["displacement"]
    }
    if (["point-cloud", "volume"].includes(plotType)){
        vizStates.push("valueRange", "xRange", "yRange", "zRange")
    }
    if (plotType != "pointCloud") {
        vizStates.push("nanColor", "nanTransparency")
    }
    const currentVizState = usePlotStore.getState()
    const keyState = pick(currentVizState, vizStates as (keyof typeof currentVizState)[])
    const currentCamState = useImageExportStore.getState().cameraRef?.current?.clone()
    const cameraState = {
        position: currentCamState?.position,
        rotation:currentCamState?.rotation,
    }
    const thisState = {
        visual : keyState,
        camera: cameraState
    }
    addKeyFrame(frame, thisState)
}

const KeyFrames = () => {

    const {animProg, setAnimProg} = usePlotStore(useShallow(state => ({
        animProg:state.animProg, setAnimProg:state.setAnimProg
    })))

    const {keyFrames, frames, useTime, frameRate, timeRate, currentFrame, setCurrentFrame} = useImageExportStore(useShallow(state=>({
        keyFrames:state.keyFrames, frames:state.frames, currentFrame:state.currentFrame,
        useTime:state.useTime, frameRate:state.frameRate, timeRate:state.timeRate, setCurrentFrame:state.setCurrentFrame
    })))
    const timeRatio = timeRate/frameRate
    const keyFrameList = keyFrames ? Array.from(keyFrames.keys()).sort((a, b) => a - b) : null;
    const originalAnimProg = useRef<number | null>(null)

	useEffect(()=>{ // Clear KeyFrames if it is empty. 
		if (keyFrameList && keyFrameList.length == 0){
			useImageExportStore.setState({keyFrames: undefined})
		}
	},[keyFrameList])

    useEffect(()=>{
        originalAnimProg.current = animProg;
        return ()=>{
            if (originalAnimProg.current){
                setAnimProg(originalAnimProg.current) // Reset animProg when done monkeying with values
            }
        }
    },[])

  return (
    <div className='keyframes-container'>
		<IoCloseCircleSharp 
			style={{
				position:'absolute',
				top:'10px',
				left:'10px',
				cursor:'pointer'
			}}
			size={20}
			color='var(--play-background)'
			onClick={()=>useImageExportStore.getState().setKeyFrameEditor(false)}
		/>
        <div className='flex justify-center items-center'>
			<Button 
                className='cursor-pointer'
                onClick={()=>{SetKeyFrame(currentFrame)}}
            >Add Keyframe
            </Button>
            <Button 
                disabled={!keyFrameList}
                className='cursor-pointer'
                onClick={()=>{useImageExportStore.setState({keyFrames: undefined})}}
            >Clear Keyframes
            </Button>
            <Button 
                disabled={!keyFrameList}
                className='cursor-pointer'
                onClick={()=>{useImageExportStore.getState().PreviewKeyFrames()}}
            >Preview Full Animation
            </Button>
		</div>
        <div className="relative w-full my-2 px-2 bg-[var(--background)] drop-shadow-[0_0_4px_var(--notice-shadow)] rounded-lg">
            {keyFrameList?.map((frame) => {
                const thumbRadius = 8 + 8; //Thumbradius plus padding
                const percent = ((frame - 1 )/(frames - 1)) * 100; 
                return (
                <TbDiamondsFilled
                    key={frame}
                    style={{
                    position: "absolute",
                    left: `calc(${percent}% + ${thumbRadius}px - ${thumbRadius * 2 * percent / 100}px)`,
					top:0,
                    transform:"translate(-50%, -50%)",
                    zIndex: 0, 
                    cursor:"pointer"
                    }}
					color='red'
					size={18}
					onClick={()=>setCurrentFrame(frame)}
					onDoubleClick={()=>{
						useImageExportStore.getState().removeKeyFrame(frame)
					}}
                />
                );
            })}
            <Slider
                value={[currentFrame]}
                min={1}
                max={frames}
                step={1}
                className='flex-1 my-2'
                onValueChange={(vals: number[]) => {
                const v = Array.isArray(vals) ? vals[0] : 0
                setCurrentFrame(v)
                if (useTime && originalAnimProg.current){
                    setAnimProg(originalAnimProg.current + (v / frames)*timeRatio)
                }
                }}
            />
		</div>
		<div className='flex justify-end items-center absolute top-[8px] right-[8px]'>
            <b >Frame:</b>
			<Input value={currentFrame} type='number' 
				className='w-[80px] ml-2'
				min={1} 
				step={1} 
				onChange={e =>parseInt(e.target.value) ? setCurrentFrame(Math.max(parseInt(e.target.value), 1)) : 1}
			/>
        </div>
    </div>
  )
}

export default KeyFrames
