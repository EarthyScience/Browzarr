
"use client";

import { RxReset } from "react-icons/rx";
import { FaPlus, FaMinus } from "react-icons/fa";
import React, {useRef, useEffect, useMemo, useState} from 'react'
import { useGlobalStore, usePlotStore, useAnalysisStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import './css/Colorbar.css'
import { linspace, TwoDecimals } from '@/utils/HelperFuncs';
import Metadata from "./MetaData";

const operationMap = {
    // Reductions
    Mean: "Mean",
    Min: "Min",
    Max: "Max",
    StDev: "StDev",
    LinearSlope: "Slope",
    // 3D Convolutions
    Mean3D: "Local Mean",
    Min3D: "Local Min",
    Max3D: "Local Max",
    StDev3D: "Local StDev",
    // 2D Convolutions
    Mean2D: "Local Mean",
    Min2D: "Local Min",
    Max2D: "Local Max",
    StDev2D: "Local StDev",
    // Multivariate
    Correlation2D: "R",
    Correlation3D: "Local R",
    TwoVarLinearSlope2D: "Slope",
    TwoVarLinearSlope3D: "Local Slope",
    Covariance2D: "Covariance",
    Covariance3D: "Covariance",
    // Special
    CUMSUM3D: "Cumulative Sum"
};

function Num2String(value: number){
    if ((Math.abs(value) > 1e-3 && Math.abs(value) < 1e6) || value === 0){
        return value.toFixed(2)
    } else{
        return value.toExponential(2)
    }
}

const Colorbar = ({units, metadata, valueScales} : {units: string, metadata: Record<string, any>, valueScales: {maxVal: number, minVal:number}}) => {
    const {colormap, variable, scalingFactor} = useGlobalStore(useShallow(state => ({
        colormap: state.colormap,
        variable: state.variable,
        scalingFactor: state.scalingFactor
    })))
    const {cScale, cOffset, setCScale, setCOffset} = usePlotStore(useShallow(state => ({ 
        cScale: state.cScale,
        cOffset: state.cOffset,
        setCScale: state.setCScale,
        setCOffset: state.setCOffset
    })))
    const {variable2, analysisMode, operation, kernelOperation, execute} = useAnalysisStore(useShallow(state => ({
        variable2: state.variable2,
        analysisMode: state.analysisMode,
        operation: state.operation,
        kernelOperation: state.kernelOperation,
        execute: state.execute
    })))

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const scaling = useRef<boolean>(false)
    const prevPos = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
    const {origMin, origMax} = useMemo(()=>({
        origMin: valueScales.minVal,
        origMax: valueScales.maxVal
    }),[valueScales])
    const range = origMax - origMin
    const zeroPoint = (0 - origMin) / range; // Used to account for shifting values
    const [tickCount, setTickCount] = useState<number>(5)
    const [newMin, setNewMin] = useState(origMin)
    const [newMax, setNewMax] = useState(origMax)
    const prevVals = useRef<{ min: number | null; max: number | null }>({ min: null, max: null });

    const colors = useMemo(()=>{
        const colors = []
        const data = colormap.source.data.data
        for (let i = 0; i < data.length/4; i++){
            const newIdx = i*4
            const rgba = `rgba(${data[newIdx]}, ${data[newIdx+1]}, ${data[newIdx+2]}, ${data[newIdx+3]} )`
            colors.push(rgba)
        }
        return colors
    },[colormap])

    const [locs, vals] = useMemo(()=>{
        const locs = linspace(0, 100, tickCount)
        const vals = linspace(newMin, newMax, tickCount)
        return [locs, vals]
    },[ tickCount, newMin, newMax])

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
        if (!scaling.current) return;
        // Your scaling logic here
        if (prevPos.current.x === null || prevPos.current.y === null){
            prevPos.current.x = e.clientX;
            prevPos.current.y = e.clientY;
        }
        if (prevVals.current.min === null || prevVals.current.max === null){
            prevVals.current.min = newMin;
            prevVals.current.max = newMax;
        }

        const deltaX = prevPos.current.x - e.clientX;
        const thisOffset = deltaX  / 100
        const lastMin = prevVals.current.min
        const lastMax = prevVals.current.max
        setNewMin(lastMin+(range*thisOffset))
        setNewMax(lastMax+(range*thisOffset))
    };

    // Mouse up handler
    const handleMouseUp = () => {
        scaling.current = false;
        prevPos.current = {x: null, y: null}
        prevVals.current = {min: null, max: null}
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };

    // Mouse down handler
    const handleMouseDown = () => {
        scaling.current = true;
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // Clean up in case component unmounts mid-drag
    useEffect(() => {
        return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    useEffect(()=>{
        const newRange = (newMax - newMin);
        const scale = range/newRange;
        let offset = -(newMin - origMin)/(newMax - newMin)
        const newZeroPoint = (0 - newMin)/newRange;
        const zeroOffset = newZeroPoint - zeroPoint;
        offset += zeroOffset;
        setCOffset(offset)
        setCScale(scale)
    },[newMin, newMax])

    useEffect(()=>{ // Update internal vals when global vals change
        setNewMin(origMin)
        setNewMax(origMax)
    },[origMax, origMin])

    useEffect(() => {
        if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
            if (ctx){
                colors.forEach((color, index) => {
                ctx.fillStyle = color;
                ctx.fillRect(index*2, 0, 2, 24); // Each color is 1px wide and 50px tall
                });
            }     
        }
    }, [colors]);

    const analysisString = useMemo(()=>{
        
        if (analysisMode){
            const twoVar = variable2 != "Default";
            const thisOperation = (operation === "Convolution") ? kernelOperation : operation
            const theseUnits = operationMap[thisOperation as keyof typeof operationMap] 
            const string = twoVar ? `+ ${variable2} (${theseUnits})` : `[${units}] (${theseUnits})`
            return string
        } else{
            return `[${units}]`
        }
    },[analysisMode, execute])
    return (
        <>
        <div className='colorbar' >
            <input type="number" 
                className="text-[14px] font-semibold"
                style={{
                    left: `0%`,
                    top:'100%',
                    position:'absolute',
                    width:`${Num2String(newMin*Math.pow(10,scalingFactor??0)).length*8}px`,
                    transform:'translateX(-50%)',
                    textAlign:'right',
                    minWidth:'30px'
                }}
                value={Num2String(newMin*Math.pow(10,scalingFactor??0))} 
                onChange={e=>setNewMin(parseFloat(e.target.value))}
            />
            {Array.from({length: tickCount}).map((_val,idx)=>{
                if (idx == 0 || idx == tickCount-1){
                    return null
                }
                return (<p
                key={idx}
                style={{
                    left: `${locs[idx]}%`,
                    top:'100%',
                    position:'absolute',
                    transform:'translateX(-50%)',
                }}
            >{Num2String(vals[idx]*Math.pow(10,scalingFactor??0))}
            </p>)}
            )}
            <input type="number" 
                className="text-[14px] font-semibold"
                style={{
                    left: `100%`,
                    top:'100%',
                    position:'absolute',
                    width:`${Num2String(newMax*Math.pow(10,scalingFactor??0)).length*9+1}px`,
                    transform:'translateX(-50%)',
                    textAlign:'right',
                    minWidth:'30px'
                }}
                value={Num2String(newMax*Math.pow(10,scalingFactor??0))}
                onChange={e=>setNewMax(parseFloat(e.target.value))}
            />
            <canvas id="colorbar-canvas" ref={canvasRef} width={512} height={24} onMouseDown={handleMouseDown}/>
            <p className="colorbar-title"
                style={{
                position:'absolute',
                top:'-24px',
                left:'50%',
                transform:'translateX(-50%)',
            }}>
                {<Metadata data={metadata} variable ={variable} />}
                {`${analysisString}`}
            </p>
        {(cScale != 1 || cOffset != 0) && <RxReset size={25} style={{position:'absolute', top:'-25px', cursor:'pointer'}} 
            onClick={()=>{setNewMin(origMin); setNewMax(origMax)}}
        />}
        <div
            style={{
                position:'absolute',
                right:'0%',
                bottom:'100%',
                display:'flex',
                width:'10%',
                justifyContent:'space-around'
            }}
        >
            <FaMinus className='cursor-pointer' onClick={()=>setTickCount(Math.max(tickCount-1, 2))}/>
            <FaPlus className='cursor-pointer' onClick={()=>setTickCount(Math.min(tickCount+1, 10))}/>
        </div>
        </div>
        </>
        
    )
}

export default Colorbar