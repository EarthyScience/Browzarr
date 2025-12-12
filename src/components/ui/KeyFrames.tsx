"use client";
import React, {useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { ButtonGroup } from "@/components/ui/button-group"
import { useImageExportStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { Slider } from './slider'
import './css/KeyFrames.css'
import { TbDiamondsFilled } from "react-icons/tb";
import { Input } from './input';
import { IoCloseCircleSharp } from "react-icons/io5";
import { CiWarning } from "react-icons/ci";
import { FaPlusCircle } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import { MdPreview } from "react-icons/md";
import { TbKeyframeFilled } from "react-icons/tb";
import { TbKeyframesFilled } from "react-icons/tb";
import { Card, CardContent } from "@/components/ui/card";

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

    const {keyFrames, frames, useTime, frameRate, timeRate, orbit, currentFrame, setCurrentFrame, setFrames} = useImageExportStore(useShallow(state=>({
        keyFrames:state.keyFrames, frames:state.frames, orbit:state.orbit, currentFrame:state.currentFrame,
        useTime:state.useTime, frameRate:state.frameRate, timeRate:state.timeRate, setCurrentFrame:state.setCurrentFrame, setFrames:state.setFrames
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
   <Card className='keyframes-container'>
      <CardContent className='flex flex-col gap-1 w-full h-full px-1 py-1'>
		<IoCloseCircleSharp 
			style={{
				position:'absolute',
				top:'10px',
				left:'10px',
				cursor:'pointer'
			}}
			size={20}
			onClick={()=>useImageExportStore.getState().setKeyFrameEditor(false)}
		/>
        <div className='flex gap-1'>
			{/* Information */}
			<div className={`ml-4 bg-[var(--warning-area)] min-w-[20%] px-4 py-2 rounded-md`}
                style={{
                    visibility:(orbit || useTime) ? "visible" : "hidden"
                }}
            >
				<div style={{display: orbit? "flex" : "none", alignItems:"center", width:"100%", justifyContent:"space-between"}}>
					<CiWarning /><b> Camera Motion overwritten by orbit</b><CiWarning />
				</div>
                <div style={{display: (orbit && !keyFrames)? "flex" : "none", alignItems:"center", width:"100%", justifyContent:"space-between"}}>
					<CiWarning /><b>Keyframe required to preview orbit</b><CiWarning />
				</div>

			</div>

			{/* Buttons */}
			<ButtonGroup>
				<Button 
					className='cursor-pointer'
                    size="sm"
                    variant="outline"
					onClick={()=>{SetKeyFrame(currentFrame)}}
				> 
                    <FaPlusCircle /> Keyframe
				</Button>
				<Button 
					disabled={!keyFrameList}
					className='cursor-pointer'
                    size="sm"
                    variant="outline"
					onClick={()=>{useImageExportStore.setState({keyFrames: undefined})}}
				>
                    <MdDeleteForever className='size-6'/> Keyframes
				</Button>
				<Button 
					disabled={!keyFrameList}
					className='cursor-pointer'
                    size="sm"
                    variant="outline"
					onClick={()=>{useImageExportStore.getState().PreviewKeyFrames()}}
				>
                    <MdPreview className='size-6'/> Preview
				</Button>
			</ButtonGroup>
			{/* Frame Information */}
            <ButtonGroup >
                <Button size="sm" variant="outline">
                    <TbKeyframesFilled/> Frames
                </Button>
                <Input className='w-[80px] h-[32px]' id="frames" type='number' step={1} value={frames} onChange={e => setFrames(Math.max(parseInt(e.target.value),2))} />
            </ButtonGroup>
            <ButtonGroup >
                <Button size="sm" variant="outline">
                    <TbKeyframeFilled/> Frame
                </Button>
                <Input value={currentFrame} type='number' 
                    className='w-[80px] h-[32px]'
                    min={1} 
                    step={1} 
                    onChange={e =>parseInt(e.target.value) ? setCurrentFrame(Math.max(parseInt(e.target.value), 1)) : 1}
                />
            </ButtonGroup>
		</div>
        <div className="relative w-full my-2 px-2 drop-shadow-[0_0_4px_var(--notice-shadow)] rounded-lg">
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
                    cursor:"pointer",
					visibility:percent <= 100 ? "visible" : "hidden"
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
		
    </CardContent>
    </Card>
  )
}

export default KeyFrames
