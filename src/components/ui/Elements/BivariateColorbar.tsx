import { useColormapStore } from '@/GlobalStates/ColormapStore'
import React, {useCallback, useEffect, useState} from 'react'
import { useShallow } from 'zustand/shallow'
import { rgbToCss, Rgb, hexToRgb, mixColors, lerpColor } from "@/utils/colorUtils";


interface BCbarProps{
    width:number,
    height: number;
    bivariateSelection: number;
}

export const BivariateColorbar = ({width, height, bivariateSelection} : BCbarProps) => {
    const {bottomLeft, topLeft, bottomRight, resolution, mixMode} = useColormapStore(useShallow(s => ({
        bottomLeft: s.bottomLeft, topLeft: s.topLeft, bottomRight: s.bottomRight, 
        resolution: s.resolution, mixMode: s.mixMode
    })))
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
    }, [resolution, bottomLeft, bottomRight, topLeft, mixMode, bivariateSelection]);
    useEffect(() => {
        draw();
    }, [draw]);
    return (
        <>

        <canvas
            ref={canvasRef}
            width={width}
            height={height}
        />
      </>
    )
}

