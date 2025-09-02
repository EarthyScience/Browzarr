
"use client";

import { RxReset } from "react-icons/rx";
import { FaPlus, FaMinus } from "react-icons/fa";
import React, {useRef, useEffect, useMemo, useState} from 'react'
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import './css/Colorbar.css'
import { linspace } from '@/utils/HelperFuncs';

const Colorbar = ({units, valueScales} : {units: string, valueScales: {maxVal: number, minVal:number}}) => {
    const {colormap, variable} = useGlobalStore(useShallow(state => ({
        colormap: state.colormap,
        variable: state.variable
    })))

    const {cScale, cOffset, setCScale, setCOffset} = usePlotStore(useShallow(state => ({ 
        cScale: state.cScale,
        cOffset: state.cOffset,
        setCScale: state.setCScale,
        setCOffset: state.setCOffset
    })))

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const scaling = useRef<boolean>(false)
    const prevPos = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
    const range = useMemo(()=>valueScales.maxVal - valueScales.minVal,[valueScales])
    const mean = useMemo(()=>(valueScales.maxVal + valueScales.minVal)/2,[valueScales])
    const [tickCount, setTickCount] = useState<number>(5)
    const [newMin, setNewMin] = useState(Math.round(valueScales.minVal*100)/100)
    const [newMax, setNewMax] = useState(Math.round(valueScales.maxVal*100)/100)
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
        const newRange = (newMax - newMin)
        const scale = range/newRange;
        const offset = -(newMin - valueScales.minVal)/(newMax - newMin)
        setCOffset(offset)
        setCScale(scale)

    },[newMin, newMax])

    useEffect(()=>{ // Update internal vals when global vals change
        setNewMin(valueScales.minVal)
        setNewMax(valueScales.maxVal)
    },[valueScales])

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

    return (
        <>
        <div className='colorbar' >
            <input type="number" 
                className="text-[14px] font-semibold"
                style={{
                    left: `0%`,
                    top:'100%',
                    position:'absolute',
                    width:'45px',
                    transform:'translateX(-50%)',
                }}
                value={newMin}
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
            >{vals[idx].toFixed(2)}
            </p>)}
            )}
            <input type="number" 
                className="text-[14px] font-semibold"
                style={{
                    left: `100%`,
                    top:'100%',
                    position:'absolute',
                    width:'45px',
                    transform:'translateX(-50%)',
                }}
                value={newMax}
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
                {`${variable} [ ${units} ]`}
            </p>
        {(cScale != 1 || cOffset != 0) && <RxReset size={25} style={{position:'absolute', top:'-25px', cursor:'pointer'}} onClick={()=>{setNewMin(valueScales.minVal); setNewMax(valueScales.maxVal)}}/>}
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