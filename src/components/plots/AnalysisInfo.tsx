'use client';
import React from 'react'
import './Plots.css'
import { parseLoc } from '@/utils/HelperFuncs'

/**
 * Format a numeric data value with scientific notation when the number is very
 * large (|x| >= 1e4) or very small (|x| < 1e-3 and x !== 0).
 * Otherwise 4 significant figures are shown.
 */
function formatValue(v: number): string {
    if (!isFinite(v)) return String(v);
    const abs = Math.abs(v);
    if (abs === 0) return '0';
    if (abs >= 1e4 || abs < 1e-3) {
        return v.toExponential(3);
    }
    return parseFloat(v.toPrecision(4)).toString();
}

export interface DisplayDim {
    arr?: ArrayLike<number>;
    val?: number;
    name: string;
    units?: string;
}

const AnalysisInfo = ({
    loc,
    show,
    info,
    displayDims,
    varName,
    varUnits,
} : {
    loc: number[];
    show: boolean;
    info: number[];
    /** The coordinate axes as written by FlatMap.handleMove — already sliced
     *  and coarsened. displayDims[0] = row (Y), displayDims[1] = col (X),
     *  displayDims.slice(2) = Z / extra collapsed dimensions. */
    displayDims: DisplayDim[];
    varName?: string;
    varUnits?: string;
}) => {
    const rowDim = displayDims?.[0];
    const colDim = displayDims?.[1];
    const extraDims = displayDims ? displayDims.slice(2) : [];

    const rowCoord = rowDim && rowDim.arr ? rowDim.arr[Math.floor(info[0] * rowDim.arr.length)] : undefined;
    const colCoord = colDim && colDim.arr ? colDim.arr[Math.floor(info[1] * colDim.arr.length)] : undefined;

    const rawValue = info[2];
    const valueStr = show ? formatValue(rawValue) : '—';
    const unitsStr = varUnits ? ` ${varUnits}` : '';

  return (
    <div
        className='analysis-overlay'
        style={{
            left: `${loc[0] + 14}px`,
            top:  `${loc[1] + 14}px`,
            display: show ? '' : 'none',
        }}
    >
        {/* ── Variable name row ──────────────────────────────── */}
        <div className='analysis-overlay__var-name'>
            {varName || 'Value'}
        </div>

        {/* ── Value + units (centre piece) ───────────────────── */}
        <div className='analysis-overlay__value'>
            {valueStr}
            {unitsStr && <span className='analysis-overlay__units'>{unitsStr}</span>}
        </div>

        {/* ── Z & extra dimensions row (time, level, etc.) ───── */}
        {show && extraDims.length > 0 && (
            <div className='analysis-overlay__z-coords'>
                {extraDims.map((dim, idx) => (
                    <span key={dim.name || idx} className='analysis-overlay__coord-item'>
                        <span className='analysis-overlay__coord-label'>{dim.name}:</span>
                        {dim.val !== undefined ? parseLoc(dim.val, dim.units) : '—'}
                    </span>
                ))}
            </div>
        )}

        {/* ── Spatial coordinate location row ────────────────── */}
        <div className='analysis-overlay__coords'>
            {rowDim && (
                <span className='analysis-overlay__coord-item'>
                    <span className='analysis-overlay__coord-label'>{rowDim.name}</span>
                    {show && rowCoord !== undefined && parseLoc(rowCoord, rowDim.units)}
                </span>
            )}
            {rowDim && colDim && <span className='analysis-overlay__coord-sep'>/</span>}
            {colDim && (
                <span className='analysis-overlay__coord-item'>
                    <span className='analysis-overlay__coord-label'>{colDim.name}</span>
                    {show && colCoord !== undefined && parseLoc(colCoord, colDim.units)}
                </span>
            )}
        </div>
    </div>
    )
}

export default AnalysisInfo
