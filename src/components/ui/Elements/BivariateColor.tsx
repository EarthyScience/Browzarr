import { useRef, useEffect, useState, useCallback, type CSSProperties } from "react";
import {Input} from '@/components/ui'
import { useColormapStore } from "@/GlobalStates/ColormapStore";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { bivariateSchemes } from "./bivariateColorSchemes";
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
    r: Math.min(c1.r, c2.r),
    g: Math.min(c1.g, c2.g),
    b: Math.min(c1.b, c2.b),
  };
}
function lightenBlend(c1: Rgb, c2: Rgb): Rgb {
  return {
    r: Math.max(c1.r, c2.r),
    g: Math.max(c1.g, c2.g),
    b: Math.max(c1.b, c2.b),
  };
}
function multiplyBlend(c1: Rgb, c2: Rgb): Rgb {
  return {
    r: (c1.r * c2.r) / 255,
    g: (c1.g * c2.g) / 255,
    b: (c1.b * c2.b) / 255,
  };
}
function differenceBlend(c1: Rgb, c2: Rgb): Rgb {
  return {
    r: Math.abs(c1.r - c2.r),
    g: Math.abs(c1.g - c2.g),
    b: Math.abs(c1.b - c2.b)
  };
}

function rgbToCss({ r, g, b }: Rgb): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const colorSwatch = (hex: string) => <div className={`h-6 w-6 rounded border border-black/10 shadow-sm`} style={{ backgroundColor: hex }}/>

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
  topLeft: Rgb,
  mixMode=0
): Rgb {
  const tx = resolution > 1 ? col / (resolution - 1) : 0;
  const ty = resolution > 1 ? row / (resolution - 1) : 0;

  const xColor = lerpColor(bottomLeft, bottomRight, tx);
  const yColor = lerpColor(bottomLeft, topLeft, ty);
  switch (mixMode){
    case 0:
      	return darkenBlend(xColor, yColor);
	case 1:
		return lightenBlend(xColor, yColor);
	case 2:
		return multiplyBlend(xColor, yColor);
	case 3:
		return differenceBlend(xColor, yColor);
    default:
      	return darkenBlend(xColor, yColor);
  }
}
function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
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
const mixModes = ['darken', 'lighten', 'multiply', 'difference'] as const;

export function BivariateColormap({ size = 340 }: BivariateColormapProps) {
    const { bottomLeft, topLeft, bottomRight, resolution, mixMode, 
		setBottomLeft, setTopLeft, setBottomRight, setResolution, setMixMode } = useColormapStore(s => s);
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
	
	const updateColorScheme = (e: string) => {
		const scheme = bivariateSchemes[parseInt(e)]
		setBottomLeft(scheme.bottomLeft);
		setTopLeft(scheme.topLeft);
		setBottomRight(scheme.bottomRight);
	}

  return (
    <div className='flex flex-col gap-2 p-2'>
      <div className="grid grid-cols-3 gap-x-2">
        <ColorField label="Bottom-left" value={bottomLeft} onChange={setBottomLeft} />
        <ColorField label="Top-left" value={topLeft} onChange={setTopLeft} />
        <ColorField label="Bottom-right" value={bottomRight} onChange={setBottomRight} />
      </div>
	  <div className="grid grid-cols-[60%_auto]">
		<div className="flex items-center gap-1">
			<label htmlFor="mixMod"><h1>Presets</h1></label>
			<Select onValueChange={updateColorScheme}>
				<SelectTrigger className="max-w-[140px]">
					<SelectValue placeholder='Select...'/>
				</SelectTrigger>
				<SelectContent >
					{bivariateSchemes.map((obj, idx) => (
						<div className="flex justify-between items-center">
						<SelectItem className='w-full flex justify-between' key={idx} value={String(idx)}>
							<span>{obj.name}</span>	
						</SelectItem>
						<div className="flex gap-1">
								{colorSwatch(obj.bottomLeft)}
								{colorSwatch(obj.topLeft)}
								{colorSwatch(obj.bottomRight)}
						</div>	
						</div>
					
					))}
				</SelectContent>
			</Select>
		</div>
		<div className="flex items-center gap-1">
			<label htmlFor="mixMod"><h1>Blend <br/>Mode</h1></label>
			<Select value={mixModes[mixMode]} onValueChange={(e) => setMixMode(mixModes.indexOf(e as any))}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{mixModes.map((val, idx) => (
					<SelectItem key={idx} value={val}>
						{capitalizeFirstLetter(val)}
					</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
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

export function getBivariateCss(
  bottomLeft: string,
  bottomRight: string,
  topLeft: string,
  mixMode: number,
  resolution = 8,
): string {
  if (typeof document === "undefined") {
    return `linear-gradient(135deg, ${bottomLeft}, ${bottomRight})`;
  }

  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext("2d");
  if (!ctx) return `linear-gradient(135deg, ${bottomLeft}, ${bottomRight})`;

  const bl = hexToRgb(bottomLeft);
  const br = hexToRgb(bottomRight);
  const tl = hexToRgb(topLeft);

  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const color = getCellColor(col, row, resolution, bl, br, tl, mixMode);
      ctx.fillStyle = rgbToCss(color);
      const py = resolution - (row + 1); 
      ctx.fillRect(col, py, 1, 1);
    }
  }

  return `url(${canvas.toDataURL()})`;
}