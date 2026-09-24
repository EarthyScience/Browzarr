import {useRef, useState, useMemo, useEffect} from 'react'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useColormapStore } from '@/GlobalStates/ColormapStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { useValueScales } from '@/hooks';
import { Num2String } from './colorbarUtils';
import { linspace } from '@/utils/HelperFuncs';
import { RxReset } from "react-icons/rx";

interface UCBProps{
    width: number;
    height: number;
    tickCount: number
}

export const UnivariateColorbar = ({width, height, tickCount} : UCBProps) =>{
    const scalingFactor = useGlobalStore(s => s.scalingFactor)
    const colormap = useColormapStore(s => s.colormap);
    const {cScale, cOffset,colorScale, setColorScale, setCScale, setCOffset} = usePlotStore(useShallow(s => s));
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // ---- Scaling States --- //
    const scaling = useRef<boolean>(false)
    const prevPos = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
    const prevVals = useRef<{ min: number | null; max: number | null }>({ min: null, max: null });
    const valueScales = useValueScales();
    const {origMin, origMax} = useMemo(()=>({
        origMin: valueScales.minVal,
        origMax: valueScales.maxVal
    }),[valueScales])
    const range = origMax - origMin
    const [newMin, setNewMin] = useState(origMin)
    const [newMax, setNewMax] = useState(origMax)
    const [displayMin, setDisplayMin] = useState(Num2String(origMin*Math.pow(10, scalingFactor??0)))
    const [displayMax, setDisplayMax] = useState(Num2String(origMax*Math.pow(10, scalingFactor??0)))

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
        setDisplayMax(Num2String((lastMax+(range*thisOffset))*Math.pow(10, scalingFactor??0)))
        setDisplayMin(Num2String((lastMin+(range*thisOffset))*Math.pow(10, scalingFactor??0)))
    };

    // Mouse up handler
    const handleMouseUp = () => {
        scaling.current = false;
        prevPos.current = {x: null, y: null}
        prevVals.current = {min: null, max: null}
        document.removeEventListener("pointermove", handleMouseMove);
        document.removeEventListener("pointerup", handleMouseUp);
    };

    // Mouse down handler
    const handleMouseDown = () => {
        scaling.current = true;
        document.addEventListener("pointermove", handleMouseMove);
        document.addEventListener("pointerup", handleMouseUp);
    };

    // Clean up in case component unmounts mid-drag
    useEffect(() => {
        return () => {
        document.removeEventListener("pointermove", handleMouseMove);
        document.removeEventListener("pointerup", handleMouseUp);
        };
    }, []);

    useEffect(()=>{
        const newRange = (newMax - newMin);
        const scale = range/newRange;
        const offset = -(newMin - origMin)/newRange
        setCOffset(offset)
        setCScale(scale)
    },[newMin, newMax])

    useEffect(()=>{ // Update internal vals when global vals change
        setDisplayMin(Num2String(origMin*Math.pow(10, scalingFactor??0)))
        setDisplayMax(Num2String(origMax*Math.pow(10, scalingFactor??0)))
        setNewMin(origMin)
        setNewMax(origMax)
    },[origMax, origMin, scalingFactor])

    const colorString = colorScale ? `(${colorScale?.slice(0,-1)})` : ''
    const colors = useMemo(()=>{
        const sourceData = colormap.source.data;
        if (!sourceData || !sourceData.data) {
            return []; // Early return
        }
        const colors: string[] = [];
        const data = sourceData.data;

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


    return(
        <>
            <input type="number" 
                className="text-[16px] font-semibold"
                style={{
                    left: `0%`,
                    top:'100%',
                    position:'absolute',
                    width:`${displayMin.length*10+1}px`,
                    transform:'translateX(-50%)',
                    textAlign:'right',
                    minWidth:'30px'
                }}
                value={displayMin} 
                onChange={e=>{setDisplayMin(e.target.value); setNewMin(parseFloat(e.target.value)/Math.pow(10, scalingFactor??0))}}
                onBlur={e=>setDisplayMin(Num2String(newMin*Math.pow(10, scalingFactor??0)))}
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
                className="text-[16px] font-semibold"
                style={{
                    left: `100%`,
                    top:'100%',
                    position:'absolute',
                    width:`${displayMax.length*10+1}px`,
                    transform:'translateX(-50%)',
                    textAlign:'right',
                    minWidth:'30px'
                }}
                value={displayMax}
                onChange={e=>{
                    setDisplayMax(e.target.value); 
                    setNewMax(parseFloat(e.target.value)/Math.pow(10, scalingFactor??0))
                }}
                onBlur={e=>setDisplayMax(Num2String(newMax*Math.pow(10, scalingFactor??0)))}
            />
            
            <canvas className='cursor-[ew-resize]' id="colorbar-canvas" ref={canvasRef} width={width} height={height} onPointerDown={handleMouseDown}/>
            {/* RESET */}
            {(cScale != 1 || cOffset != 0 || colorScale) && <RxReset size={25} style={{position:'absolute', top:'-25px', cursor:'pointer'}} 
                onClick={()=>{
                    setNewMin(origMin); 
                    setNewMax(origMax); 
                    setDisplayMax(Num2String(origMax*Math.pow(10, scalingFactor??0))); 
                    setDisplayMin(Num2String(origMin*Math.pow(10, scalingFactor??0)));
                    setColorScale(undefined)
                }}
            />}
        </> 
    )
}