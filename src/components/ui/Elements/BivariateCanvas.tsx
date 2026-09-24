
import { useColormapStore } from "@/GlobalStates/ColormapStore";
import { rgbToCss, Rgb, hexToRgb, mixColors, lerpColor } from "@/utils/colorUtils";
import { useCallback, useRef, useEffect } from "react";
function getCellColor(
    col: number,
    row: number,
    resolution: number,
    bottomLeft: Rgb,
    bottomRight: Rgb,
    topLeft: Rgb,
    mixMode=0
): Rgb {
    const tx = resolution > 1 ? col / (resolution - 1) : 0;
    const ty = resolution > 1 ? row / (resolution - 1) : 0;

    const xColor = lerpColor(bottomLeft, bottomRight, tx);
    const yColor = lerpColor(bottomLeft, topLeft, ty);
    return mixColors(xColor, yColor, mixMode);
}

export function BivariateCanvas({size} : {size: number}){
    const { bottomLeft, topLeft, bottomRight, resolution, mixMode } = useColormapStore(s => s);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const bl = hexToRgb(bottomLeft);
        const br = hexToRgb(bottomRight);
        const tl = hexToRgb(topLeft);

        const cell = size / resolution;

        ctx.clearRect(0, 0, size, size);

        for (let row = 0; row < resolution; row++) {
            for (let col = 0; col < resolution; col++) {
                const color = getCellColor(col, row, resolution, bl, br, tl, mixMode);
                ctx.fillStyle = rgbToCss(color);

                const px = col * cell;
                // flip vertically so bottomLeft sits at the bottom of the canvas
                const py = size - (row + 1) * cell;

                ctx.fillRect(px, py, Math.ceil(cell), Math.ceil(cell));
            }
        }
    }, [resolution, bottomLeft, bottomRight, topLeft, size, mixMode]);
    useEffect(() => {
        draw();
    }, [draw]);
    return(
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
            style={{ borderRadius: 4 }}
      />
    )
}
