import { useRef, useEffect, useState, useCallback, type CSSProperties } from "react";
import {Input} from '@/components/ui'
import { useColormapStore } from "@/GlobalStates/ColormapStore";
import { rgbToCss, Rgb, hexToRgb, mixColors, lerpColor } from "@/utils/colorUtils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { bivariateSchemes } from "./bivariateColorSchemes";
import { BivariateCanvas } from "./BivariateCanvas";
const colorSwatch = (hex: string) => <div className={`h-6 w-6 rounded border border-black/10 shadow-sm`} style={{ backgroundColor: hex }}/>


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
						<div key={idx} className="flex justify-between items-center">
							<SelectItem value={String(idx)}>
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
      <BivariateCanvas size={size} />
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