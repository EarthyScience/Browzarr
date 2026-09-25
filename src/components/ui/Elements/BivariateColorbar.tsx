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
    const {valueScales, scalingFactor, variable, variable2} = useGlobalStore(useShallow(s => ({
        valueScales: s.valueScales, scalingFactor: s.scalingFactor, variable: s.variable, variable2: s.variable2
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
        const yvals = linspace(valueScales[1].minVal, valueScales[1].maxVal, tickCount)
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
        setDivPos([x,y])
        const xFac = clamp(x/thisWidth, 0, 1);
        const yFac = 1 - clamp(y/thisWidth, 0, 1)
        const xVal = lerp(valueScales[0].minVal, valueScales[0].maxVal, xFac)
        const yVal = lerp(valueScales[1].minVal, valueScales[1].maxVal, yFac)
        setVarVals([xVal, yVal]);
    },[])
    return (
        <div className='flex justify-center relative'
        >
            <ValueReadout visible={showInfo} names={[variable as string, variable2 as string]} position={divPos} values={varVals}/>
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
                                >{Num2String(yVals[idx]*Math.pow(10,scalingFactor??0))}</p>
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
                >{Num2String(xVals[idx]*Math.pow(10,scalingFactor??0))}</p>
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


interface ValueReadoutProps {
  names: [string, string];
  values: [number, number];
  position: [number, number];
  visible: boolean;
}

const PALETTE = {
  panel: "#1B2432",
  panelEdge: "#2C3A50",
  text: "#E8EDF4",
  label: "#8A97AB",
  series: ["#4FD1C5", "#F6AD55"] as const,
};
 
const NOTCH = 8; // size of the pointer triangle, px
const GAP = 0; // space between anchor point and card, px

function ValueReadout({
  names,
  values,
  position,
  visible,
}: ValueReadoutProps) {
  if (!visible) return null;
 
  const [x, y] = position;
 
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    // Centre the card horizontally on the anchor and lift it above the point.
    transform: `translate(-50%, calc(-100% - ${GAP}px))`,
    pointerEvents: "none",
    zIndex: 10,
    fontFamily:
      '"IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
  };
 
  const cardStyle: React.CSSProperties = {
    position: "relative",
    minWidth: 168,
    padding: "10px 14px",
    background: PALETTE.panel,
    color: PALETTE.text,
    border: `1px solid ${PALETTE.panelEdge}`,
    borderRadius: 10,
    boxShadow: "0 6px 20px rgba(10, 16, 28, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };
 
  const notchStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    bottom: -NOTCH,
    width: 0,
    height: 0,
    transform: "translateX(-50%)",
    borderLeft: `${NOTCH}px solid transparent`,
    borderRight: `${NOTCH}px solid transparent`,
    borderTop: `${NOTCH}px solid ${PALETTE.panelEdge}`,
  };
 
  // Inner fill so the notch appears to share the card's border.
  const notchFillStyle: React.CSSProperties = {
    ...notchStyle,
    bottom: -(NOTCH - 1.5),
    borderTopColor: PALETTE.panel,
  };
 
  return (
    <div style={containerStyle} role="status" aria-live="polite">
      <div style={cardStyle}>
        {names.map((name, i) => (
          <div
            key={`${name}-${i}`}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: PALETTE.series[i],
                flexShrink: 0,
                alignSelf: "center",
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: PALETTE.label,
                flex: 1,
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.01em",
                color: PALETTE.text,
              }}
            >
              {Num2String(values[i])}
            </span>
          </div>
        ))}
        <span aria-hidden="true" style={notchStyle} />
        <span aria-hidden="true" style={notchFillStyle} />
      </div>
    </div>
  );
}