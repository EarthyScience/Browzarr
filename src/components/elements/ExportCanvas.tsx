"use client";

import React, { useEffect, useRef } from 'react'
import { useGlobalStore } from '@/stores/GlobalStore';
import { usePlotStore } from '@/stores/PlotStore';
import { useImageExportStore } from '@/stores/ImageExportStore';
import { useThree } from '@react-three/fiber'
import { useCSSVariable } from '@/components/ui';
import * as THREE from 'three'
import { useShallow } from 'zustand/shallow';
import { lerp } from 'three/src/math/MathUtils.js';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { deg2rad, linspace } from '@/lib/helpers';
import { getValueScales } from '@/hooks';
import { getBivariateCanvas } from '@/components/elements/BivariateCanvas';
import { Num2String } from '@/components/elements/colorbarUtils';

const GetBivariateCbarGeometry = (width: number, height: number) => {
    const { doubleSize, cbarLoc } = useImageExportStore.getState()
    const size = doubleSize ? Math.min(1024, width*0.4) : Math.min(512, width*0.4)
    const margin = doubleSize ? 140 : 70
    const isRight = cbarLoc === 'bottomRight' || cbarLoc === 'topRight'
    const isTop = cbarLoc === 'topLeft' || cbarLoc === 'topRight'
    return {
        size,
        cbarStartPos: isRight ? width - margin - size : margin,
        cbarTop: isTop ? margin : height - margin - size
    }
}

const GetCbarGeometry = (width: number, height: number) => {
    const { doubleSize, cbarLoc } = useImageExportStore.getState()
    const { bivariate } = useGlobalStore.getState()
    if (bivariate){
        const {size, cbarStartPos, cbarTop} = GetBivariateCbarGeometry(width, height)
        return {cbarStartPos, cbarTop, cbarWidth: size, cbarHeight: size}
    }
    const length = doubleSize ? Math.min(1024, width*0.8) : Math.min(512, width*0.8)
    const thickness = doubleSize ? 48 : 24
    const margin = doubleSize ? 140 : 70
    if (cbarLoc === 'right' || cbarLoc === 'left'){
        return {
            cbarStartPos: cbarLoc === 'right' ? width - margin : margin,
            cbarTop: Math.round(height/2 - length/2),
            cbarWidth: thickness,
            cbarHeight: length
        }
    }
    return {
        cbarStartPos: Math.round(width/2 - length/2),
        cbarTop: cbarLoc === 'top' ? margin : height - margin,
        cbarWidth: length,
        cbarHeight: thickness
    }
}

const DrawText = (
    //Context and cbarlocs
    ctx: CanvasRenderingContext2D,
    cbarLocs: {cbarStartPos: number, cbarTop: number, cbarWidth: number, cbarHeight: number},
    width: number,
    height: number,
    textColor:string
) => {
    const { doubleSize, mainTitle,
    cbarLabels, cbarUnits, cbarLoc, cbarNum, includeColorbar} = useImageExportStore.getState()

    const {variable, variable2, units, bivariate } = useGlobalStore.getState()
    const valueScales = getValueScales();
    const {cbarStartPos, cbarTop, cbarWidth, cbarHeight} = cbarLocs;
    const transpose = cbarLoc === 'right' || cbarLoc === 'left'
    const cbarTickSize = doubleSize ? 36 : 18
    const unitSize = doubleSize ? 52 : 26
    
    if (mainTitle){
        const variableSize = doubleSize ? 72 : 36
        ctx.fillStyle = textColor
        ctx.font = `${variableSize}px "Segoe UI"`
        ctx.textBaseline = 'middle'
        ctx.fillText(mainTitle, doubleSize ? 40 : 20, doubleSize ? 100 : 50) // MainTitle in top Left
    }
    
    // ---- WATERMARK ---- //
    const waterMarkSize = doubleSize ? 40 : 20
    ctx.fillStyle = "#888888"
    ctx.font = `${waterMarkSize}px "Segoe UI", serif `
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText("browzarr.io", doubleSize ? 20 : 10, doubleSize ? height - 20 : height - 10) // Watermark

    if (includeColorbar){
        ctx.fillStyle = textColor // Reset from watermark gray
        if (bivariate){
            // ---- TickLabels ---- //
            const {size, cbarStartPos: sqX, cbarTop: sqY} = GetBivariateCbarGeometry(width, height)
            const {valueScales: allValueScales, scalingFactors} = useGlobalStore.getState()
            const labelNum = cbarNum
            const locs = linspace(0, 100, labelNum)
            const xVals = linspace(allValueScales[0].minVal, allValueScales[0].maxVal, labelNum)
            const yVals = linspace(allValueScales[1].minVal, allValueScales[1].maxVal, labelNum)
            ctx.font = `${cbarTickSize}px "Segoe UI"`
            // X Ticks
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            for (let i = 0; i < labelNum; i++){
                ctx.fillText(Num2String(xVals[i]*Math.pow(10, scalingFactors[0])), sqX + size*locs[i]/100, sqY + size + 6)
            }
            // Y Ticks
            ctx.textAlign = 'right'
            ctx.textBaseline = 'middle'
            for (let i = 0; i < labelNum; i++){
                ctx.fillText(Num2String(yVals[i]*Math.pow(10, scalingFactors[1])), sqX - 6, sqY + size - size*locs[i]/100)
            }
            // ---- Cbar Label/Units ---- //
            ctx.fillStyle = textColor
            ctx.font = `${unitSize}px "Segoe UI"`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(`${cbarLabels[0]?? variable} [${cbarUnits[0]?? units[0]}]`, sqX + size/2, sqY + size + 6 + cbarTickSize + 8)
            ctx.save()
            ctx.translate(sqX - 12 - cbarTickSize - unitSize, sqY + size/2)
            ctx.rotate(Math.PI / 2)
            ctx.textBaseline = 'top'
            ctx.fillText(`${cbarLabels[1]?? variable2} [${cbarUnits[1]?? units[1]}]`, 0, 0)
            ctx.restore()
            return
        }
        // ---- TickLabels ---- //
        ctx.font = `${cbarTickSize}px "Segoe UI"`
        const labelNum = cbarNum; // Number of cbar "ticks"
        const valRange = valueScales.maxVal-valueScales.minVal;
        const valScale = 1/(labelNum-1)
        const posDelta = transpose ? 1/(labelNum-1)*cbarHeight : 1/(labelNum-1)*cbarWidth
        const scaleFactor = Math.pow(10, useGlobalStore.getState().scalingFactors[0] ?? 0)
        const tickLabel = (i: number) => Num2String((valueScales.minVal+(i*valScale*valRange))*scaleFactor)
        if (transpose){
            ctx.textBaseline = 'middle'
            ctx.textAlign = cbarLoc == 'left' ? 'left' : 'right'
            for (let i =0; i < labelNum; i++){
                if (cbarLoc == 'left'){
                    ctx.fillText(tickLabel(i), cbarStartPos+cbarWidth+6, cbarTop+cbarHeight-i*posDelta)
                } else{
                    ctx.fillText(tickLabel(i), cbarStartPos-6, cbarTop+cbarHeight-i*posDelta)
                }
            }
        }else{
            ctx.textBaseline = 'top'
            ctx.textAlign = 'center'
            for (let i =0; i < labelNum; i++){
                ctx.fillText(tickLabel(i), cbarStartPos+i*posDelta, cbarTop+cbarHeight+6)
            }
        }

        // ---- Cbar Label/Units ---- //
        ctx.fillStyle = textColor
        ctx.font = `bold ${unitSize}px "Segoe UI"`
        ctx.textAlign = 'center'
        const cbarString = `${cbarLabels[0]?? variable} [${cbarUnits[0]?? units[0]}]`
        if (transpose){
            const xOffset = cbarLoc === 'right' ? cbarWidth+unitSize/2 : -cbarWidth-unitSize/2
            const rotate = cbarLoc === 'right' ? Math.PI / 2 : -Math.PI / 2
            ctx.save()
            ctx.translate(cbarStartPos+cbarWidth/2+xOffset, cbarTop+cbarHeight/2)
            ctx.rotate(rotate)
            ctx.fillText(cbarString, 0, 0)
            ctx.restore()
        } else {
            ctx.fillText(cbarString, cbarStartPos+cbarWidth/2, cbarTop-unitSize-4)
        }
        
    }
}

const DrawComposite = (
    compositeCanvas: HTMLCanvasElement,
    gl: THREE.WebGLRenderer,
    width: number,
    height: number,
    colors: {bgColor: string, textColor: string},
    animate=false,
): HTMLCanvasElement | undefined => {

    const {bgColor, textColor} = colors;
    const { includeBackground, cbarLoc, includeColorbar} = useImageExportStore.getState()
    const { bivariate } = useGlobalStore.getState()
    const ctx = compositeCanvas.getContext('2d')
    if (!ctx){return}

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (includeBackground || animate) { // Always include background if animation, since no transparency in video
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
    } else {
        ctx.clearRect(0, 0, width, height);
    }
    ctx.drawImage(gl.domElement, 0, 0, width, height) 

    const {cbarStartPos, cbarTop, cbarWidth, cbarHeight} = GetCbarGeometry(width, height)
    const transpose = cbarLoc === 'right' || cbarLoc === 'left'

    // ---- COLORBAR ---- //
    if (includeColorbar){
        if (bivariate){
            ctx.drawImage(getBivariateCanvas(cbarWidth), cbarStartPos, cbarTop, cbarWidth, cbarHeight)
        } else {
        const secondCanvas = document.getElementById('colorbar-canvas')
        if (secondCanvas instanceof HTMLCanvasElement) {
            if (transpose) {
                ctx.save()
                // Rotate anti-clockwise around the colorbar center
                ctx.translate(cbarStartPos + cbarWidth/2, cbarTop + cbarHeight/2)
                ctx.rotate(-Math.PI / 2)
                // In the rotated frame the long side (cbarHeight) runs along x
                ctx.drawImage(secondCanvas, -cbarHeight/2, -cbarWidth/2, cbarHeight, cbarWidth)
                ctx.restore()
            } else {
                ctx.drawImage(secondCanvas, cbarStartPos, cbarTop, cbarWidth, cbarHeight)
            }
        }
        }
    }

    // ---- TEXT ---- //
    if (!animate){ // If still image write text onto image
        DrawText(
            ctx,
            {cbarStartPos, cbarTop, cbarWidth, cbarHeight},
            width,
            height,
            textColor
        )
    }
    
}

async function DrawTextOverlay(
    width: number,
    height: number,
    textColor:string,
    ffmpeg: FFmpeg
){
    const scaling = 4;
    const textCanvas = document.createElement("canvas");
    textCanvas.width = width * scaling;
    textCanvas.height = height * scaling;
    const ctx = textCanvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(scaling, scaling)

    // ---- TEXT ---- //
    DrawText(
        ctx,
        GetCbarGeometry(width, height),
        width,
        height,
        textColor
    )
    
    const blob = await new Promise(resolve => {
        textCanvas.toBlob(resolve, 'image/png');
    });
    if (blob) {
        const buf = await (blob as Blob).arrayBuffer();
        // Write frames to internal ffMpeg filesystem
        await ffmpeg.writeFile(`textOverlay.png`, new Uint8Array(buf));
    }
}


const ExportCanvas = ({show}:{show: boolean}) => {
    const {exportImg, enableExport, animate, frames, frameRate, useTime, timeRate, orbit, orbitDeg, orbitDir, loopTime,
        preview, useCustomRes, customRes, doubleSize, exportOnLoad, setHideAxis, setHideAxisControls
    } = useImageExportStore(useShallow(s => s))
    const {setAnimProg, setQuality} = usePlotStore.getState()
    const {setStatus, setProgress} = useGlobalStore.getState()
    const {dataShape} = useGlobalStore(useShallow(s => s));
    const timeFrames = dataShape[dataShape.length-3]
    const { gl, scene, camera, invalidate } = useThree();
    const textColor = useCSSVariable('--text-plot')
    const bgColor = useCSSVariable('--background')
    const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const ffmpegRef = useRef(new FFmpeg());
    const isExportingRef = useRef(false);

    useEffect(()=>{
        //The first time show is true, this will trigger an export if coming from code
        if (show && exportOnLoad){
            useImageExportStore.setState({
                enableExport: true,
                exportImg: !exportImg,
                exportOnLoad: false
            })
        }
    },[show])
    useEffect(()=>{   
        if (!show || !enableExport) return;
        if (isExportingRef.current) return; // Don't start a second export while one is running
        isExportingRef.current = true;
        const {animProg} = usePlotStore.getState()
        const origQuality = usePlotStore.getState().quality;
        const dpr = useGlobalStore.getState().DPR;
        setQuality(preview ? 50 : 1000);
        (!preview || !animate) && useGlobalStore.setState({DPR: window.devicePixelRatio || 1}) // Use default pixel ratio unless its an animation preview
        setProgress(0)
        const domWidth = gl.domElement.width;
        const domHeight = gl.domElement.height;
        let docWidth = useCustomRes ? customRes[0] : (doubleSize ? domWidth * 2 : domWidth);
        let docHeight = useCustomRes ? customRes[1] : (doubleSize ? domHeight * 2 : domHeight);
        // Ensure even dimensions for encoding
        docWidth = Math.floor(docWidth / dpr);
        docHeight = Math.floor(docHeight / dpr);
        docWidth -= docWidth % 2;
        docHeight -= docHeight % 2;
        // Initialize Reusable Canvas
        if (!compositeCanvasRef.current) {
            compositeCanvasRef.current = document.createElement('canvas');
        }
        compositeCanvasRef.current.width = docWidth;
        compositeCanvasRef.current.height = docHeight;

        const originalSize = gl.getSize(new THREE.Vector2())
        let originalCameraSettings: any = {};
        

        function SetCamera(set=false){
            if (camera instanceof THREE.PerspectiveCamera) {
                if (set){originalCameraSettings = { aspect: camera.aspect }}

                camera.aspect = docWidth / docHeight
            } else if (camera instanceof THREE.OrthographicCamera) {
                if (set){originalCameraSettings = {
                    left: camera.left,
                    right: camera.right,
                    top: camera.top,
                    bottom: camera.bottom
                }}
                const newAspect = docWidth / docHeight
                const currentAspect = (camera.right - camera.left) / (camera.top - camera.bottom)
                if (newAspect > currentAspect) {
                    // Wider - expand left/right
                    const width = (camera.top - camera.bottom) * newAspect
                    const center = (camera.left + camera.right) / 2
                    camera.left = center - width / 2
                    camera.right = center + width / 2
                } else {
                    // Taller - expand top/bottom
                    const height = (camera.right - camera.left) / newAspect
                    const center = (camera.top + camera.bottom) / 2
                    camera.top = center + height / 2
                    camera.bottom = center - height / 2
                }
            }
            
            gl.setSize(docWidth, docHeight)
            camera.updateProjectionMatrix()
            invalidate();
        }
        SetCamera(true);
        const originalPosition = camera.position.clone();
        const originalRotation = camera.rotation.clone();

        function Restore(){
            setHideAxis(false)
            setHideAxisControls(false)
            // Reset Camera Settings
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = originalCameraSettings.aspect;
            } else if (camera instanceof THREE.OrthographicCamera) {
                camera.left = originalCameraSettings.left;
                camera.right = originalCameraSettings.right;
                camera.top = originalCameraSettings.top;
                camera.bottom = originalCameraSettings.bottom;
            }
            camera.position.copy(originalPosition);
            camera.rotation.copy(originalRotation);
            gl.setSize(originalSize.x, originalSize.y);
            camera.updateProjectionMatrix();
            invalidate();
            setQuality(origQuality);
            useGlobalStore.setState({DPR: dpr})
            isExportingRef.current = false;
        }

        if (animate){
            usePlotStore.setState({animate:false}) // Disable animation if currently active
            const {keyFrames} = useImageExportStore.getState()
            const keyFrameList = keyFrames ? Array.from(keyFrames.keys()).sort((a, b) => a - b) : null;
            // Snapshot plot state touched by keyframes so it can be restored afterwards
            const origVizState: Record<string, any> = {};
            if (keyFrameList?.length){
                const plotState = usePlotStore.getState() as Record<string, any>;
                Object.keys(keyFrames?.get(keyFrameList[0])?.["visual"] ?? {}).forEach(key => {
                    origVizState[key] = plotState[key];
                });
            }
            const ffmpeg = ffmpegRef.current;
            const onProgress = ({ progress }: { progress: number }) => {
                // progress is a value between 0 and 1
                setProgress(Math.min(Math.round(progress * 100), 100));
            };
            async function Animate(){
                setStatus("Loading Module")
                if (!ffmpeg.loaded) {
                    await ffmpeg.load();
                }

                ffmpeg.on('progress', onProgress);

                setStatus("Rendering Frames")

                const timeRatio = timeRate/frameRate;
                const dt = 1/timeFrames
                const originalPos = {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z
                };
                const radius = Math.sqrt(originalPos.x ** 2 + originalPos.z ** 2);
                const originalAngle = Math.atan2(originalPos.x, originalPos.z);
                let keyFrameIdx = 0;
                const currentSize = new THREE.Vector2();
                for (let frame=0; frame<frames; frame++){
                    // ----- UPDATE VISUALS ---- //
                    if (orbit){
                        const angle = (frame / frames) * deg2rad(orbitDeg); // Last frame stops one step short so 360° loops seamlessly
                        const newAngle = originalAngle + (orbitDir ? -angle : angle);
                        camera.position.x = radius * Math.sin(newAngle);
                        camera.position.z = radius * Math.cos(newAngle);
                        camera.lookAt(0, 0, 0);
                        !(useCustomRes || doubleSize) && invalidate(); // We will invalidate later if needed. Otherwise do it now
                    }
                    if (useTime){
                        let newProg = dt * Math.floor(frame*timeRatio) + animProg;
                        newProg = loopTime ? newProg - Math.floor(newProg) : Math.min(newProg, 1);
                        setAnimProg(newProg)
                    }
                    if (keyFrameList){
                        const lerpedVizState: Record<string, any> = {};
                        const lerpedCamState: Record<string, any> = {};
                        const startFrame = keyFrameList[keyFrameIdx]

                        if (keyFrameIdx+1 < keyFrameList.length){
                            const endFrame = keyFrameList[keyFrameIdx+1]
                            const thisFrames = endFrame-startFrame;
                            const alpha = Math.max(frame-startFrame, 0)/thisFrames;
                            if (frame == keyFrameList[keyFrameIdx+1]){
                                keyFrameIdx++;
                            }
                            const startState = keyFrames?.get(startFrame)
                            const startVizState = startState["visual"]
                            const startCamState = startState["camera"]
                            const endState = keyFrames?.get(endFrame)
                            const endVizState = endState["visual"]
                            const endCamState = endState["camera"]
                            Object.keys(startVizState).forEach(key => {
                                const sourceValue = startVizState[key];
                                const targetValue = endVizState[key];
                                
                                // Check if both values are numbers
                                if (typeof sourceValue === 'number' && typeof targetValue === 'number') {
                                    lerpedVizState[key] = lerp(sourceValue, targetValue, alpha);
                                }
                                else if (Array.isArray(sourceValue) && Array.isArray(targetValue)){
                                    lerpedVizState[key] = []
                                    for (let i = 0; i < sourceValue.length; i++){
                                        lerpedVizState[key][i] = lerp(sourceValue[i], targetValue[i], alpha);
                                    }
                                }
                                // Handle Vector3, arrays, or other lerpable objects
                                else if (sourceValue?.lerp && typeof sourceValue.lerp === 'function') {
                                    lerpedVizState[key] = sourceValue.clone().lerp(targetValue, alpha);
                                }
                                // For non-lerpable values (strings, booleans, null), switch at the end keyframe
                                else {
                                    lerpedVizState[key] = alpha < 1 ? sourceValue : targetValue;
                                }
                            });
                            usePlotStore.setState(lerpedVizState)

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
                        !(useCustomRes || doubleSize) && invalidate();
                    }

                    }
                    // R3F can reset the renderer size mid-export (e.g. after the DPR change), so only
                    // re-apply when it drifted instead of reallocating the drawing buffer every frame
                    gl.getSize(currentSize)
                    const aspectDrifted = camera instanceof THREE.PerspectiveCamera && camera.aspect !== docWidth / docHeight
                    if (currentSize.x !== docWidth || currentSize.y !== docHeight || aspectDrifted){
                        SetCamera()
                    }
                    // ----- RENDER TO CANVAS---- //
                    gl.render(scene, camera);
                    DrawComposite(compositeCanvasRef.current as HTMLCanvasElement, gl, docWidth, docHeight,
                        {bgColor, textColor}, true
                    )

                    const blob = await new Promise(resolve => {
                        compositeCanvasRef.current?.toBlob(resolve, 'image/png');
                    });
                    if (blob) {
                        const buf = await (blob as Blob).arrayBuffer();
                        // Write frames to internal ffMpeg filesystem
                        await ffmpeg.writeFile(`frame${frame.toString().padStart(4, '0')}.png`, new Uint8Array(buf));
                    }
                }
                setStatus("Building Animation")
                await DrawTextOverlay(docWidth, docHeight, textColor, ffmpeg)
                const execResult = await ffmpeg.exec([
                    '-framerate', `${frameRate}`,
                    '-i', 'frame%04d.png',
                    '-i', 'textOverlay.png',
                    '-filter_complex', `[1:v]scale=${docWidth}:${docHeight}[overlay];[0:v][overlay]overlay=0:0`,
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-preset', `${preview ? 'ultrafast' : 'fast'}`, 
                    '-crf', `${preview ? 28 : 16}`, 
                    '-profile:v', 'high',
                    'output.mp4'
                ]);
                if (execResult !== 0){
                    throw new Error(`ffmpeg exited with code ${execResult}`)
                }
                setStatus("Fetching Animation")
                const videoData = await ffmpeg.readFile('output.mp4');
                const videoBlob = new Blob([videoData as any], { type: 'video/mp4' });
                const videoUrl = URL.createObjectURL(videoBlob);
                const link = document.createElement('a')
                link.download = 'browzarr-animation.mp4'
                link.href = videoUrl
                link.click()
                setTimeout(() => URL.revokeObjectURL(videoUrl), 1000) // Revoking immediately can cancel the download
            }

            async function CleanupFiles(){
                // Files may not exist if export failed partway, so ignore delete errors
                const files = ['textOverlay.png', 'output.mp4']
                for (let i=0; i<frames; i++) files.push(`frame${i.toString().padStart(4, '0')}.png`)
                for (const file of files){
                    try { await ffmpeg.deleteFile(file) } catch {}
                }
            }

            Animate()
                .catch(err => console.error("Animation export failed:", err))
                .finally(async ()=>{
                    ffmpeg.off('progress', onProgress)
                    if (ffmpeg.loaded) await CleanupFiles()
                    setStatus(null)
                    setProgress(0)
                    if (useTime) setAnimProg(animProg)
                    if (Object.keys(origVizState).length) usePlotStore.setState(origVizState)
                    Restore()
                });
        } else {
            gl.render(scene, camera);
            DrawComposite(compositeCanvasRef.current as HTMLCanvasElement, gl, docWidth, docHeight,
                {bgColor, textColor}
            )
            compositeCanvasRef.current.toBlob((blob) => {
                if(!blob){return}
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.download = 'browzarr-plot.png'
                link.href = url
                link.click()
                setTimeout(() => URL.revokeObjectURL(url), 1000) // Revoking immediately can cancel the download
            }, 'image/png')
            Restore()
        }
    },[exportImg])

  return (
    <>
    </>
  )
  
}

export default ExportCanvas
