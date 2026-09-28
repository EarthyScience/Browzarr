import { useColormapStore } from '@/GlobalStates/ColormapStore'
import React, {useCallback, useEffect, useState, useMemo} from 'react'
import { useShallow } from 'zustand/shallow'
import { rgbToCss, Rgb, hexToRgb, mixColors, lerpColor } from "@/utils/colorUtils";
import { BivariateCanvas } from './BivariateCanvas';
import {Button} from '@/components/ui'
import { TbLayoutNavbarCollapse } from "react-icons/tb";
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { linspace, clamp } from '@/utils/HelperFuncs';
import { Num2String } from './colorbarUtils';
import { lerp } from '@/utils/colorUtils';
import { useIsMobile } from '@/hooks';
import { InfoViewer } from './InfoViewer'

interface BCbarProps{
    width: number,
    height: number;
    bivariateSelection: number;
    tickCount: number;
}

export const BivariateColorbar = ({width, height, bivariateSelection, tickCount} : BCbarProps) => {
    const {bottomLeft, topLeft, bottomRight, resolution, mixMode} = useColormapStore(useShallow(s => ({
        bottomLeft: s.bottomLeft, topLeft: s.topLeft, bottomRight: s.bottomRight, 
        resolution: s.resolution, mixMode: s.mixMode
    })))
    const {valueScales, scalingFactors, variable, variable2} = useGlobalStore(useShallow(s => ({
        valueScales: s.valueScales, scalingFactors: s.scalingFactors, variable: s.variable, 
        variable2: s.variable2
    })));
    const isMobile = useIsMobile();
    const [expandBivariate, setExpandBivariate] = useState(false);
    const [showInfo, setShowInfo] = useState(false)
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const {width, height} = canvas
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const c1 = hexToRgb(bottomLeft);
        const c2 = hexToRgb([bottomRight, topLeft][bivariateSelection])

        const cell = width / resolution;

        ctx.clearRect(0, 0, width, height);

        for (let col = 0; col < resolution; col++) {
            const color = mixColors(c1, lerpColor(c1, c2, col/(resolution-1)), mixMode);
            ctx.fillStyle = rgbToCss(color);
            const px = col * cell;
            ctx.fillRect(px, 0, Math.ceil(cell), height);
        }
    }, [resolution, bottomLeft, bottomRight, topLeft, mixMode, width, height, bivariateSelection, expandBivariate]);
    useEffect(() => {
        draw();
    }, [draw]);

    const [locs, xVals, yVals ] = useMemo(()=>{
        const locs = linspace(0, 100, tickCount)
        const xvals = linspace(valueScales[0].minVal, valueScales[0].maxVal, tickCount)
        const yvals = linspace(valueScales[1]?.minVal, valueScales[1]?.maxVal, tickCount)
        return [locs, xvals, yvals]
    },[ tickCount, valueScales ])

    const [divPos, setDivPos] = useState<[number, number]>([0,0])
    const [varVals, setVarVals] = useState<[number, number]>([0,0])
    
    const handleMouseMove = useCallback((e: React.PointerEvent<HTMLDivElement>): void =>{
        const rect = e.currentTarget.getBoundingClientRect();
        const thisWidth = rect.width;
        // Calculate mouse position relative to the element's top-left corner
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDivPos([e.clientX, e.clientY])
        const xFac = clamp(x/thisWidth, 0, 1);
        const yFac = 1 - clamp(y/thisWidth, 0, 1)
        const xVal = lerp(valueScales[0].minVal, valueScales[0].maxVal, xFac)
        const yVal = lerp(valueScales[1]?.minVal, valueScales[1]?.maxVal, yFac)
        setVarVals([xVal, yVal]);
    },[valueScales])
    return (
        <div className='flex justify-center relative'
        >
            <InfoViewer show={showInfo} loc={divPos} vals={varVals}/>
        {expandBivariate 
            ? <>
                <div className='grid' >
                    <Button 
                        variant="ghost"
                        onClick={()=>setExpandBivariate(false)}
                    >
                        <TbLayoutNavbarCollapse />Shrink<TbLayoutNavbarCollapse />
                    </Button>
                    <div className='relative' 
                        onPointerEnter={()=>setShowInfo(true)}
                        onPointerLeave={()=> setShowInfo(false)}
                        onPointerMove={handleMouseMove}
                    >
                        <BivariateCanvas size={width} />
                        {/* Y Ticks */}
                        <div 
                          style={{
                          height:'100%',
                          top:'0%',
                          left:'0%',
                          position:'absolute',
                          textAlign:'right',
                        }}>
                          <h1 style={{
                            position:'absolute',
                            writingMode:'vertical-lr',
                            top:'50%',
                            left:'-4rem',
                            transform:'translateY(-50%)',
                            fontSize:isMobile ? '14px' : '20px'
                          }}>
                            {variable2}
                          </h1>
                          <div className='relative h-full w-12'>
                            {Array.from({length: tickCount}).map((_val,idx)=>(
                                <p
                                    key={idx}
                                    style={{
                                        bottom: `${locs[idx]}%`,
                                        position:'absolute',
                                        right:'100%',
                                        margin:0,
                                        whiteSpace: 'nowrap',
                                        transform:idx !== 0 ?'translateY(50%)' : ''
                                    }}
                                >{Num2String(yVals[idx]*Math.pow(10,scalingFactors[1]))}</p>
                            ))}
                          </div>
                        </div>
                    </div>
                </div>
            </>
            : <>
                <canvas
                    className='cursor-pointer'
                    ref={canvasRef}
                    width={width}
                    height={height}
                    onClick={()=> setExpandBivariate(true)}
                />
                
            </>
        }
        {/* X Ticks */}
        <div className='grid place-items-center'
          style={{
              top:'100%',
              position:'absolute',
              width:'100%'
          }}
        >
          <div className='relative w-full h-6'>
            {Array.from({length: tickCount}).map((_val,idx)=>(
                <p
                    key={idx}
                    style={{
                        left: `${locs[idx]}%`,
                        position:'absolute',
                        transform:'translateX(-50%)',
                    }}
                >{Num2String(xVals[idx]*Math.pow(10,scalingFactors[0]))}</p>
            ))}
          </div>
          {expandBivariate && <h1
            style={{
              fontSize:isMobile ? '14px' : '20px'
            }}
          >
            {variable}
          </h1>}
        </div>
      </div>
    )
}


