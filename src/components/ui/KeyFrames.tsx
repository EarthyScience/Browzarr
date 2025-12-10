"use client";
import React, { useEffect, useRef } from "react";
import { Button } from "./button";
import { useImageExportStore, usePlotStore } from "@/utils/GlobalStates";
import { useShallow } from "zustand/shallow";
import { Slider } from "./slider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

function pick<T extends object, K extends keyof T>(
	obj: T,
	keys: K[],
): Pick<T, K> {
	return keys.reduce(
		(acc, key) => {
			if (key in obj) {
				acc[key] = obj[key];
			}
			return acc;
		},
		{} as Pick<T, K>,
	);
}

const SetKeyFrame = (frame: number) => {
	const { plotType } = usePlotStore.getState();
	const { addKeyFrame } = useImageExportStore.getState();
	let vizStates = [];
	if (plotType === "volume") {
		vizStates = ["transparency", "vTransferRange", "vTransferScale"];
	} else if (plotType === "point-cloud") {
		vizStates = ["scaleIntensity", "pointSize", "timeScale"];
	} else {
		vizStates = ["displacement"];
	}
	if (["point-cloud", "volume"].includes(plotType)) {
		vizStates.push("valueRange", "xRange", "yRange", "zRange");
	}
	if (plotType != "pointCloud") {
		vizStates.push("nanColor", "nanTransparency");
	}
	const currentVizState = usePlotStore.getState();
	const keyState = pick(
		currentVizState,
		vizStates as (keyof typeof currentVizState)[],
	);
	const currentCamState = useImageExportStore
		.getState()
		.cameraRef?.current?.clone();
	const cameraState = {
		position: currentCamState?.position,
		rotation: currentCamState?.rotation,
	};
	const thisState = {
		visual: keyState,
		camera: cameraState,
	};
	addKeyFrame(frame, thisState);
};

const KeyFrames = () => {
	const { animProg, setAnimProg } = usePlotStore(
		useShallow((state) => ({
			animProg: state.animProg,
			setAnimProg: state.setAnimProg,
		})),
	);

	const {
		keyFrames,
		frames,
		useTime,
		frameRate,
		timeRate,
		currentFrame,
		setCurrentFrame,
	} = useImageExportStore(
		useShallow((state) => ({
			keyFrames: state.keyFrames,
			frames: state.frames,
			currentFrame: state.currentFrame,
			useTime: state.useTime,
			frameRate: state.frameRate,
			timeRate: state.timeRate,
			setCurrentFrame: state.setCurrentFrame,
		})),
	);
	const timeRatio = timeRate / frameRate;

	const keyFrameList = keyFrames
		? Array.from(keyFrames.keys()).sort((a, b) => a - b)
		: null;

	const originalAnimProg = useRef<number | null>(null);

	useEffect(() => {
		originalAnimProg.current = animProg;
		return () => {
			if (originalAnimProg.current) {
				setAnimProg(originalAnimProg.current); // Reset animProg when done monkeying with values
			}
		};
	}, []);

	return (
		<div className="grid gap-1">
			<div className="flex items-center justify-around">
				<b>Key Frames: </b> {keyFrameList ? keyFrameList.length : 0}
			</div>
			<Select
				onValueChange={(val) => {
					const frame = parseInt(val);
					setCurrentFrame(frame);
				}}
			>
				<SelectTrigger>
					<SelectValue placeholder="Preview Keyframe" />
				</SelectTrigger>
				<SelectContent>
					{keyFrameList?.map((value) => (
						<SelectItem key={value} value={String(value)}>
							{value}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="grid grid-cols-[60px_auto] items-center gap-1 justify-center">
				<b>Frame:</b>
				<div>{currentFrame}</div>
			</div>
			<div className="relative w-full">
				{keyFrameList?.map((frame) => {
					const thumbRadius = 4; // I should theoretically use this. But 4.5 matches better. Also the whole thing doesn't make sense
					const percent = ((frame - 1) / (frames - 1)) * 90 + 4.5; // I dunno why this works. I will have to adjust this so it works everywhere
					return (
						<div
							key={frame}
							style={{
								position: "absolute",
								left: `${percent}%`,
								top: 0,
								bottom: 0,
								width: "0px",
								borderLeft: "1px solid red",
								borderRight: "1px solid red",
								zIndex: 0,
								pointerEvents: "none",
							}}
						/>
					);
				})}
				<Slider
					value={[currentFrame]}
					min={1}
					max={frames}
					step={1}
					className="flex-1 my-2"
					onValueChange={(vals: number[]) => {
						const v = Array.isArray(vals) ? vals[0] : 0;
						setCurrentFrame(v);
						if (useTime && originalAnimProg.current) {
							setAnimProg(originalAnimProg.current + (v / frames) * timeRatio);
						}
					}}
				/>
			</div>
			<Button
				className="cursor-pointer"
				onClick={() => {
					SetKeyFrame(currentFrame);
				}}
			>
				Add Keyframe
			</Button>
			<Button
				disabled={!keyFrameList}
				className="cursor-pointer"
				onClick={() => {
					useImageExportStore.setState({ keyFrames: undefined });
				}}
			>
				Clear Keyframes
			</Button>
			<Button
				disabled={!keyFrameList}
				className="cursor-pointer"
				onClick={() => {
					useImageExportStore.getState().PreviewKeyFrames();
				}}
			>
				Preview Full Animation
			</Button>
		</div>
	);
};

export default KeyFrames;
