import { useRef, useEffect, useState, useCallback, type CSSProperties } from "react";
import * as THREE from "three";
import {Input} from '@/components/ui'
import { useColormapStore } from "@/GlobalStates/ColormapStore";
import { useShallow } from "zustand/shallow";
// --- color helpers ---

interface Rgb {
  r: number;
  g: number;
  b: number;
}
function hexToRgb(hex: string): Rgb {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpColor(c1: Rgb, c2: Rgb, t: number): Rgb {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
}
function darkenBlend(c1: Rgb, c2: Rgb): Rgb {
  return {
    r: (c1.r * c2.r) / 255,
    g: (c1.g * c2.g) / 255,
    b: (c1.b * c2.b) / 255,
  };
}

function rgbToCss({ r, g, b }: Rgb): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Computes the color for grid cell (col, row) out of `resolution` steps
 * per axis, given the three corner colors:
 *   - bottomLeft: origin color
 *   - bottomRight: color the x-axis interpolates toward
 *   - topLeft: color the y-axis interpolates toward
 *
 * The x-edge and y-edge colors at that cell are each linearly interpolated
 * from bottomLeft, then multiplicatively blended together so the center
 * of the map is a darker combination of both, rather than a flat average.
 */
function getCellColor(
  col: number,
  row: number,
  resolution: number,
  bottomLeft: Rgb,
  bottomRight: Rgb,
  topLeft: Rgb
): Rgb {
  const tx = resolution > 1 ? col / (resolution - 1) : 0;
  const ty = resolution > 1 ? row / (resolution - 1) : 0;

  const xColor = lerpColor(bottomLeft, bottomRight, tx);
  const yColor = lerpColor(bottomLeft, topLeft, ty);

  return darkenBlend(xColor, yColor);
}

export interface BivariateColormapProps {
  /** Canvas render size in pixels (square). Defaults to 400. */
  size?: number;
}

/**
 * BivariateColormap
 *
 * An interactive bivariate (two-variable) colormap builder. Renders a
 * discretized grid on a <canvas>, where each pixel's color is derived
 * from two independent linear gradients (x-axis and y-axis) anchored at
 * a shared bottom-left color, then combined with a multiplicative
 * "darken" blend so the map reads as a genuine 2D color space rather
 * than two separate 1D ramps.
 */
export default function BivariateColormap({ size = 340 }: BivariateColormapProps) {
    const { bottomLeft, topLeft, bottomRight, resolution, setBottomLeft, setTopLeft, setBottomRight, setResolution } = useColormapStore(
        useShallow(s => ({bottomLeft: s.bottomLeft, topLeft: s.topLeft, bottomRight: s.bottomRight, resolution: s.resolution,
            setBottomLeft: s.setBottomLeft, setTopLeft: s.setTopLeft, setBottomRight: s.setBottomRight, setResolution: s.setResolution
        })));
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
            const color = getCellColor(col, row, resolution, bl, br, tl);
            ctx.fillStyle = rgbToCss(color);

            const px = col * cell;
            // flip vertically so bottomLeft sits at the bottom of the canvas
            const py = size - (row + 1) * cell;

            ctx.fillRect(px, py, Math.ceil(cell), Math.ceil(cell));
        }
        }
    }, [resolution, bottomLeft, bottomRight, topLeft, size]);
    useEffect(() => {
        draw();
    }, [draw]);
    
  return (
    <div className='flex flex-col gap-2 p-2'>
      <div className="grid grid-cols-3 gap-x-2">
        <ColorField label="Bottom-left" value={bottomLeft} onChange={setBottomLeft} />
        <ColorField label="Top-left" value={topLeft} onChange={setTopLeft} />
        <ColorField label="Bottom-right" value={bottomRight} onChange={setBottomRight} />
      </div>

      <div className='flex items-center px-[10px]'>
        <label style={{ fontSize: 14, minWidth: 90 }}>Resolution</label>
        <Input
        className="px-0"
          type="range"
          min={2}
          max={50}
          step={1}
          value={resolution}
          onChange={(e) => setResolution(Number(e.target.value))}
        />
        <span style={{ fontSize: 14, fontWeight: 500, minWidth: 28, textAlign: "right" }}>
          {resolution}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: 8, border: "1px solid #ccc" }}
      />
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const labelStyle: CSSProperties = { fontSize: 13, display: "block", marginBottom: 2 };
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", height: 36, padding: 1 }}
      />
    </div>
  );
}