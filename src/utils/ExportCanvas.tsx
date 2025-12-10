"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";
import { useShallow } from "zustand/shallow";
import { useCSSVariable } from "@/components/ui";
import {
	useGlobalStore,
	useImageExportStore,
	usePlotStore,
} from "./GlobalStates";

const DrawComposite = (
	compositeCanvas: HTMLCanvasElement,
	gl: THREE.WebGLRenderer,
	width: number,
	height: number,
	colors: { bgColor: string; textColor: string },
	animate = false,
): HTMLCanvasElement | undefined => {
	const { bgColor, textColor } = colors;
	const {
		doubleSize,
		includeBackground,
		mainTitle,
		cbarLabel,
		cbarUnits,
		cbarLoc,
		cbarNum,
		includeColorbar,
	} = useImageExportStore.getState();
	const { valueScales, variable, metadata } = useGlobalStore.getState();
	const ctx = compositeCanvas.getContext("2d");
	if (!ctx) {
		return;
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	if (includeBackground) {
		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, width, height);
	} else {
		ctx.clearRect(0, 0, width, height);
	}

	ctx.drawImage(gl.domElement, 0, 0, width, height);

	const cbarTickSize = doubleSize ? 36 : 18;
	const unitSize = doubleSize ? 52 : 26;

	let cbarWidth = doubleSize
		? Math.min(1024, width * 0.8)
		: Math.min(512, width * 0.8);
	let cbarHeight = doubleSize ? 48 : 24;

	let cbarStartPos = Math.round(width / 2 - cbarWidth / 2);
	let cbarTop =
		cbarLoc === "top"
			? doubleSize
				? 140
				: 70
			: doubleSize
				? height - 140
				: height - 70;
	const transpose = cbarLoc === "right" || cbarLoc === "left";

	// ---- COLORBAR ---- //
	if (includeColorbar) {
		const secondCanvas = document.getElementById("colorbar-canvas");
		if (secondCanvas instanceof HTMLCanvasElement) {
			if (transpose) {
				const tempWidth = cbarWidth;
				cbarWidth = cbarHeight;
				cbarHeight = tempWidth;
				cbarTop = Math.round(height / 2 - cbarHeight / 2);
				cbarStartPos =
					cbarLoc === "right"
						? doubleSize
							? width - 140
							: width - 70
						: doubleSize
							? 140
							: 70;
				// Save the current canvas state
				ctx.save();

				// Calculate the center point for rotation
				const centerX = cbarStartPos + cbarWidth / 2;
				const centerY = cbarTop + cbarHeight / 2;

				// Move to the center point
				ctx.translate(centerX, centerY);

				// Rotate anti-clockwise
				ctx.rotate(-Math.PI / 2);

				// Draw the image centered at the origin (since we translated to center)
				// Use original dimensions since we're rotating the canvas context
				const originalWidth = doubleSize ? 1024 : 512;
				const originalHeight = doubleSize ? 48 : 24;
				ctx.drawImage(
					secondCanvas,
					-originalWidth / 2,
					-originalHeight / 2,
					originalWidth,
					originalHeight,
				);

				// Restore the canvas state
				ctx.restore();
			} else if (cbarLoc === "top") {
				ctx.drawImage(
					secondCanvas,
					cbarStartPos,
					cbarTop,
					cbarWidth,
					cbarHeight,
				);
			} else {
				ctx.drawImage(
					secondCanvas,
					cbarStartPos,
					cbarTop,
					cbarWidth,
					cbarHeight,
				);
			}
		}
	}

	// ---- TEXT ---- //
	if (!animate) {
		// If still image write text onto image
		// ---- TITLE ---- //
		if (mainTitle) {
			const variableSize = doubleSize ? 72 : 36;
			ctx.fillStyle = textColor;
			ctx.font = `${variableSize}px "Segoe UI"`;
			ctx.textBaseline = "middle";
			ctx.fillText(mainTitle, doubleSize ? 40 : 20, doubleSize ? 100 : 50); // MainTitle in top Left
		}

		// ---- WATERMARK ---- //
		const waterMarkSize = doubleSize ? 40 : 20;
		ctx.fillStyle = "#888888";
		ctx.font = `${waterMarkSize}px "Segoe UI", serif `;
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText(
			"browzarr.io",
			doubleSize ? 20 : 10,
			doubleSize ? height - 20 : height - 10,
		); // Watermark

		if (includeColorbar) {
			// ---- TickLabels ---- //
			ctx.font = `${cbarTickSize}px "Segoe UI"`;
			const labelNum = cbarNum; // Number of cbar "ticks"
			const valRange = valueScales.maxVal - valueScales.minVal;
			const valScale = 1 / (labelNum - 1);
			const posDelta = transpose
				? (1 / (labelNum - 1)) * cbarHeight
				: (1 / (labelNum - 1)) * cbarWidth;
			if (transpose) {
				const tempWidth = cbarWidth;
				cbarWidth = cbarHeight;
				cbarHeight = tempWidth;
				cbarTop = Math.round(height / 2 - cbarHeight / 2);
				cbarStartPos =
					cbarLoc === "right"
						? doubleSize
							? width - 140
							: width - 70
						: doubleSize
							? 140
							: 70;
				ctx.textBaseline = "middle";
				ctx.textAlign = cbarLoc == "left" ? "left" : "right";
				for (let i = 0; i < labelNum; i++) {
					if (cbarLoc == "left") {
						ctx.fillText(
							String((valueScales.minVal + i * valScale * valRange).toFixed(2)),
							cbarStartPos + cbarWidth + 6,
							cbarTop + cbarHeight - i * posDelta,
						);
					} else {
						ctx.fillText(
							String((valueScales.minVal + i * valScale * valRange).toFixed(2)),
							cbarStartPos - 6,
							cbarTop + cbarHeight - i * posDelta,
						);
					}
				}
			} else {
				ctx.textBaseline = "top";
				ctx.textAlign = "center";
				for (let i = 0; i < labelNum; i++) {
					ctx.fillText(
						String((valueScales.minVal + i * valScale * valRange).toFixed(2)),
						cbarStartPos + i * posDelta,
						cbarTop + cbarHeight + 6,
					);
				}
			}

			// ---- Cbar Label/Units ---- //
			ctx.fillStyle = textColor;
			ctx.font = `${unitSize}px "Segoe UI" bold`;
			ctx.textAlign = "center";
			const cbarString = `${cbarLabel ?? variable} [${cbarUnits ?? "undefined"}]`;
			ctx.fillText(
				cbarString,
				cbarStartPos + cbarWidth / 2,
				cbarTop - unitSize - 4,
			);
		}
	}
};

async function DrawTextOverlay(
	width: number,
	height: number,
	textColor: string,
	ffmpeg: FFmpeg,
) {
	const scaling = 4;
	const {
		doubleSize,
		mainTitle,
		cbarLabel,
		cbarLoc,
		cbarNum,
		includeColorbar,
	} = useImageExportStore.getState();
	const { valueScales, variable, metadata } = useGlobalStore.getState();
	const textCanvas = document.createElement("canvas");
	textCanvas.width = width * scaling;
	textCanvas.height = height * scaling;
	const ctx = textCanvas.getContext("2d");
	if (!ctx) return;

	ctx.scale(scaling, scaling);
	const cbarTickSize = doubleSize ? 36 : 18;
	const unitSize = doubleSize ? 52 : 26;

	let cbarWidth = doubleSize
		? Math.min(1024, width * 0.8)
		: Math.min(512, width * 0.8);
	let cbarHeight = doubleSize ? 48 : 24;

	let cbarStartPos = Math.round(width / 2 - cbarWidth / 2);
	let cbarTop =
		cbarLoc === "top"
			? doubleSize
				? 140
				: 70
			: doubleSize
				? height - 140
				: height - 70;
	const transpose = cbarLoc === "right" || cbarLoc === "left";

	// ---- TEXT ---- //

	// ---- TITLE ---- //
	const variableSize = doubleSize ? 72 : 36;
	ctx.fillStyle = textColor;
	ctx.font = `${variableSize}px "Segoe UI"`;
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	ctx.fillText(
		mainTitle ?? variable,
		doubleSize ? 40 : 20,
		doubleSize ? 100 : 50,
	); // Variable in top Left

	// ---- WATERMARK ---- //
	const waterMarkSize = doubleSize ? 40 : 20;
	ctx.fillStyle = "#888888";
	ctx.font = `${waterMarkSize}px "Segoe UI", serif `;
	ctx.textBaseline = "bottom";
	ctx.fillText(
		"browzarr.io",
		doubleSize ? 20 : 10,
		doubleSize ? height - 20 : height - 10,
	); // Watermark

	if (includeColorbar) {
		// ---- TickLabels ---- //
		ctx.font = `${cbarTickSize}px "Segoe UI"`;
		ctx.fillStyle = textColor;
		const labelNum = cbarNum; // Number of cbar "ticks"
		const valRange = valueScales.maxVal - valueScales.minVal;
		const valScale = 1 / (labelNum - 1);
		const posDelta = transpose
			? (1 / (labelNum - 1)) * cbarHeight
			: (1 / (labelNum - 1)) * cbarWidth;
		if (transpose) {
			const tempWidth = cbarWidth;
			cbarWidth = cbarHeight;
			cbarHeight = tempWidth;
			cbarTop = Math.round(height / 2 - cbarHeight / 2);
			cbarStartPos =
				cbarLoc === "right"
					? doubleSize
						? width - 140
						: width - 70
					: doubleSize
						? 140
						: 70;
			ctx.textBaseline = "middle";
			ctx.textAlign = cbarLoc == "left" ? "left" : "right";
			for (let i = 0; i < labelNum; i++) {
				if (cbarLoc == "left") {
					ctx.fillText(
						String((valueScales.minVal + i * valScale * valRange).toFixed(2)),
						cbarStartPos + cbarWidth + 6,
						cbarTop + cbarHeight - i * posDelta,
					);
				} else {
					ctx.fillText(
						String((valueScales.minVal + i * valScale * valRange).toFixed(2)),
						cbarStartPos - 6,
						cbarTop + cbarHeight - i * posDelta,
					);
				}
			}
		} else {
			ctx.textBaseline = "top";
			ctx.textAlign = "center";
			for (let i = 0; i < labelNum; i++) {
				ctx.fillText(
					String((valueScales.minVal + i * valScale * valRange).toFixed(2)),
					cbarStartPos + i * posDelta,
					cbarTop + cbarHeight + 6,
				);
			}
		}

		// ---- Cbar Label/Units ---- //
		ctx.fillStyle = textColor;
		ctx.font = `${unitSize}px "Segoe UI" bold`;
		ctx.textAlign = "center";
		ctx.fillText(
			cbarLabel ?? metadata?.units,
			cbarStartPos + cbarWidth / 2,
			cbarTop - unitSize - 4,
		);
	}

	const blob = await new Promise((resolve) => {
		textCanvas.toBlob(resolve, "image/png");
	});
	if (blob) {
		const buf = await (blob as Blob).arrayBuffer();
		// Write frames to internal ffMpeg filesystem
		await ffmpeg.writeFile(`textOverlay.png`, new Uint8Array(buf));
	}
}

const ExportCanvas = ({ show }: { show: boolean }) => {
	const {
		exportImg,
		enableExport,
		animate,
		frames,
		frameRate,
		useTime,
		timeRate,
		orbit,
		loopTime,
		animViz,
		preview,
		useCustomRes,
		customRes,
		doubleSize,
		setHideAxis,
		setHideAxisControls,
	} = useImageExportStore(
		useShallow((state) => ({
			exportImg: state.exportImg,
			enableExport: state.enableExport,
			animate: state.animate,
			frames: state.frames,
			frameRate: state.frameRate,
			useTime: state.useTime,
			timeRate: state.timeRate,
			orbit: state.orbit,
			loopTime: state.loopTime,
			animViz: state.animViz,
			preview: state.preview,
			useCustomRes: state.useCustomRes,
			customRes: state.customRes,
			doubleSize: state.doubleSize,
			setHideAxis: state.setHideAxis,
			setHideAxisControls: state.setHideAxisControls,
		})),
	);
	const { setAnimProg, setQuality } = usePlotStore.getState();
	const { setStatus, setProgress } = useGlobalStore.getState();
	const { dataShape } = useGlobalStore(
		useShallow((state) => ({ dataShape: state.dataShape })),
	);
	const timeFrames = dataShape[dataShape.length - 3];
	const { gl, scene, camera, invalidate } = useThree();
	const textColor = useCSSVariable("--text-plot");
	const bgColor = useCSSVariable("--background");
	const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const ffmpegRef = useRef(new FFmpeg());

	useEffect(() => {
		if (!show || !enableExport) return;
		const { animProg } = usePlotStore.getState();
		const origQuality = usePlotStore.getState().quality;
		const dpr = useGlobalStore.getState().DPR;
		setQuality(preview ? 50 : 1000);
		(!preview || !animate) &&
			useGlobalStore.setState({ DPR: window.devicePixelRatio || 1 }); // Use default pixel ratio unless its an animation preview

		const domWidth = gl.domElement.width;
		const domHeight = gl.domElement.height;
		let docWidth = useCustomRes
			? customRes[0]
			: doubleSize
				? domWidth * 2
				: domWidth;
		let docHeight = useCustomRes
			? customRes[1]
			: doubleSize
				? domHeight * 2
				: domHeight;
		// Ensure even dimensions for encoding
		docWidth /= dpr;
		docHeight /= dpr;
		docWidth -= docWidth % 2;
		docHeight -= docHeight % 2;

		// Initialize Reusable Canvas
		if (!compositeCanvasRef.current) {
			compositeCanvasRef.current = document.createElement("canvas");
		}
		compositeCanvasRef.current.width = docWidth;
		compositeCanvasRef.current.height = docHeight;

		const originalSize = gl.getSize(new THREE.Vector2());
		let originalCameraSettings: any = {};

		function SetCamera(set = false) {
			if (camera instanceof THREE.PerspectiveCamera) {
				if (set) {
					originalCameraSettings = { aspect: camera.aspect };
				}

				camera.aspect = docWidth / docHeight;
			} else if (camera instanceof THREE.OrthographicCamera) {
				if (set) {
					originalCameraSettings = {
						left: camera.left,
						right: camera.right,
						top: camera.top,
						bottom: camera.bottom,
					};
				}
				const newAspect = docWidth / docHeight;
				const currentAspect =
					(camera.right - camera.left) / (camera.top - camera.bottom);
				if (newAspect > currentAspect) {
					// Wider - expand left/right
					const width = (camera.top - camera.bottom) * newAspect;
					const center = (camera.left + camera.right) / 2;
					camera.left = center - width / 2;
					camera.right = center + width / 2;
				} else {
					// Taller - expand top/bottom
					const height = (camera.right - camera.left) / newAspect;
					const center = (camera.top + camera.bottom) / 2;
					camera.top = center + height / 2;
					camera.bottom = center - height / 2;
				}
			}

			gl.setSize(docWidth, docHeight);
			camera.updateProjectionMatrix();
			invalidate();
		}
		SetCamera(true);
		if (animate) {
			const { keyFrames } = useImageExportStore.getState();
			const keyFrameList = keyFrames
				? Array.from(keyFrames.keys()).sort((a, b) => a - b)
				: null;
			async function Animate() {
				setStatus("Loading Module");
				const ffmpeg = ffmpegRef.current;
				if (!ffmpeg.loaded) {
					await ffmpeg.load();
				}

				ffmpeg.on("progress", ({ progress, time }) => {
					// progress is a value between 0 and 1
					setProgress(Math.round(progress * 100));
				});

				setStatus("Rendering Frames");

				const timeRatio = timeRate / frameRate;
				const dt = 1 / timeFrames;
				const originalPos = {
					x: camera.position.x,
					y: camera.position.y,
					z: camera.position.z,
				};
				const radius = Math.sqrt(originalPos.x ** 2 + originalPos.z ** 2);
				const originalAngle = Math.atan2(originalPos.x, originalPos.z);
				let keyFrameIdx = 0;
				for (let frame = 0; frame < frames; frame++) {
					// ----- UPDATE VISUALS ---- //
					if (orbit) {
						const angle = (frame / (frames + 1)) * Math.PI * 2;
						const newAngle = originalAngle + angle;
						camera.position.x = radius * Math.sin(newAngle);
						camera.position.z = radius * Math.cos(newAngle);
						camera.lookAt(0, 0, 0);
						camera.updateProjectionMatrix();
						!(useCustomRes || doubleSize) && invalidate(); // We will invalidate later if needed. Otherwise do it now
					}
					if (useTime) {
						let newProg = dt * Math.floor(frame * timeRatio) + animProg;
						newProg = loopTime
							? newProg - Math.floor(newProg)
							: Math.min(newProg, 1);
						setAnimProg(newProg);
					}
					if (animViz && keyFrameList) {
						const lerpedVizState: Record<string, any> = {};
						const lerpedCamState: Record<string, any> = {};
						const startFrame = keyFrameList[keyFrameIdx];

						if (keyFrameIdx + 1 < keyFrameList.length) {
							const endFrame = keyFrameList[keyFrameIdx + 1];
							const thisFrames = endFrame - startFrame;
							const alpha = Math.max(frame - startFrame, 0) / thisFrames;
							if (frame == keyFrameList[keyFrameIdx + 1]) {
								keyFrameIdx++;
							}
							const startState = keyFrames?.get(startFrame);
							const startVizState = startState["visual"];
							const startCamState = startState["camera"];
							const endState = keyFrames?.get(endFrame);
							const endVizState = endState["visual"];
							const endCamState = endState["camera"];
							Object.keys(startVizState).forEach((key) => {
								const sourceValue = startVizState[key];
								const targetValue = endVizState[key];

								// Check if both values are numbers
								if (
									typeof sourceValue === "number" &&
									typeof targetValue === "number"
								) {
									lerpedVizState[key] = lerp(sourceValue, targetValue, alpha);
								} else if (sourceValue.length) {
									// If Array
									lerpedVizState[key] = [];
									for (let i = 0; i < sourceValue.length; i++) {
										lerpedVizState[key][i] = lerp(
											sourceValue[i],
											targetValue[i],
											alpha,
										);
									}
								}
								// Handle Vector3, arrays, or other lerpable objects
								else if (
									sourceValue?.lerp &&
									typeof sourceValue.lerp === "function"
								) {
									lerpedVizState[key] = sourceValue
										.clone()
										.lerp(targetValue, alpha);
								}
								// For non-numeric values, just copy from target
								else {
									lerpedVizState[key] = targetValue;
								}
							});
							usePlotStore.setState(lerpedVizState);

							Object.keys(startCamState).forEach((key) => {
								const sourceValue = startCamState[key];
								const targetValue = endCamState[key];
								if (sourceValue.isEuler) {
									const startQuat = new THREE.Quaternion().setFromEuler(
										sourceValue,
									);
									const endQuat = new THREE.Quaternion().setFromEuler(
										targetValue,
									);

									const resultQuat = new THREE.Quaternion()
										.copy(startQuat)
										.slerp(endQuat, alpha);
									lerpedCamState[key] = new THREE.Euler().setFromQuaternion(
										resultQuat,
									);
								} else {
									lerpedCamState[key] = sourceValue
										.clone()
										.lerp(targetValue, alpha);
								}
							});
							camera.position.copy(lerpedCamState.position);
							camera.rotation.copy(lerpedCamState.rotation);
							camera.updateProjectionMatrix();
							!(useCustomRes || doubleSize) && invalidate();
						}
					}
					if (useCustomRes || doubleSize) {
						SetCamera();
					}
					// ----- RENDER TO CANVAS---- //
					gl.render(scene, camera);
					DrawComposite(
						compositeCanvasRef.current as HTMLCanvasElement,
						gl,
						docWidth,
						docHeight,
						{ bgColor, textColor },
						true,
					);

					const blob = await new Promise((resolve) => {
						compositeCanvasRef.current?.toBlob(resolve, "image/png");
					});
					if (blob) {
						const buf = await (blob as Blob).arrayBuffer();
						// Write frames to internal ffMpeg filesystem
						await ffmpeg.writeFile(
							`frame${frame.toString().padStart(4, "0")}.png`,
							new Uint8Array(buf),
						);
					}
				}
				setStatus("Building Animation");
				await DrawTextOverlay(docWidth, docHeight, textColor, ffmpeg);
				const execResult = await ffmpeg.exec([
					"-framerate",
					`${frameRate}`,
					"-i",
					"frame%04d.png",
					"-i",
					"textOverlay.png",
					"-filter_complex",
					`[1:v]scale=${docWidth}:${docHeight}[overlay];[0:v][overlay]overlay=0:0`,
					"-c:v",
					"libx264",
					"-pix_fmt",
					"yuv420p",
					"-preset",
					`${preview ? "ultrafast" : "fast"}`,
					"-crf",
					`${preview ? 28 : 16}`,
					"-tune",
					"stillimage",
					"-profile:v",
					"high444",
					"output.mp4",
				]);
				if (execResult === 1) {
					setStatus(null);
				}
				setStatus("Fetching Animation");
				const videoData = await ffmpeg.readFile("output.mp4");
				setStatus(null);
				setProgress(0);
				const videoBlob = new Blob([videoData as any], { type: "video/mp4" });
				const videoUrl = URL.createObjectURL(videoBlob);
				const link = document.createElement("a");
				link.download = "browzarr-animation.mp4";
				link.href = videoUrl;
				link.click();
				URL.revokeObjectURL(videoUrl);

				//Cleanup
				for (let i = 0; i < frames; i++)
					await ffmpeg.deleteFile(`frame${i.toString().padStart(4, "0")}.png`);
				await ffmpeg.deleteFile("output.mp4");
			}

			Animate().then(() => {
				setHideAxis(false);
				setHideAxisControls(false);
				// Reset Camera Settings
				if (useCustomRes || doubleSize) {
					if (camera instanceof THREE.PerspectiveCamera) {
						camera.aspect = originalCameraSettings.aspect;
					} else if (camera instanceof THREE.OrthographicCamera) {
						camera.left = originalCameraSettings.left;
						camera.right = originalCameraSettings.right;
						camera.top = originalCameraSettings.top;
						camera.bottom = originalCameraSettings.bottom;
					}
					gl.setSize(originalSize.x, originalSize.y);
					camera.updateProjectionMatrix();
					invalidate();
				}
				setQuality(origQuality);
				useGlobalStore.setState({ DPR: dpr });
			});
		} else {
			gl.render(scene, camera);
			DrawComposite(
				compositeCanvasRef.current as HTMLCanvasElement,
				gl,
				docWidth,
				docHeight,
				{ bgColor, textColor },
			);
			compositeCanvasRef.current.toBlob((blob) => {
				if (!blob) {
					return;
				}
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.download = "browzarr-plot.png";
				link.href = url;
				link.click();
				URL.revokeObjectURL(url);
			}, "image/png");
			setHideAxis(false);
			setHideAxisControls(false);
			// Reset Camera Settings
			if (useCustomRes || doubleSize) {
				if (camera instanceof THREE.PerspectiveCamera) {
					camera.aspect = originalCameraSettings.aspect;
				} else if (camera instanceof THREE.OrthographicCamera) {
					camera.left = originalCameraSettings.left;
					camera.right = originalCameraSettings.right;
					camera.top = originalCameraSettings.top;
					camera.bottom = originalCameraSettings.bottom;
				}
				gl.setSize(originalSize.x, originalSize.y);
				camera.updateProjectionMatrix();
				invalidate();
			}
			setQuality(origQuality);
			useGlobalStore.setState({ DPR: dpr });
		}
	}, [exportImg]);

	return <></>;
};

export default ExportCanvas;
