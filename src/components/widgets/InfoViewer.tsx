import React from 'react'
import '@/components/plots/Plots.css'
import { parseLoc } from '@/utils/HelperFuncs'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import tunnel from 'tunnel-rat';

export const overLayTunnel = tunnel();

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
    locs: (number | string)[];
    units: string[];
    names: string[];
}

export const InfoViewer = ({
    loc,
    vals,
    show,
    dimfo    
} : {
    loc: [number, number];
    vals: number[];
    show: boolean;
    dimfo?: DisplayDim;
}) => {
    const {variable, variable2, units, bivariate} = useGlobalStore(useShallow(s => ({
        variable:s.variable, variable2:s.variable2, units:s.units, bivariate:s.bivariate
    })))
    const varNames = [variable, variable2].slice(0, 1 + Number(bivariate))
    return (
        <overLayTunnel.In>
        <div
            className='analysis-overlay'
            style={{
                left: `${loc[0] + 14}px`,
                top:  `${loc[1] + 14}px`,
                display: show ? '' : 'none',
            }}
        >
            {
                vals.map((val,idx) =>(
                    <div key={`analysis-${idx}`}>
                        {/* ── Variable name row ──────────────────────────────── */}
                        <div  className='analysis-overlay__var-name'>
                            {varNames[idx] || 'Value'}
                        </div>

                        {/* ── Value + units (centre piece) ───────────────────── */}
                        <div className='analysis-overlay__value'>
                            {formatValue(val)}
                            <span className='analysis-overlay__units'>{units[idx]}</span>
                        </div>
                    </div>
                ))
            } 
                    {/* ── Spatial coordinate location row ────────────────── */}
                    {dimfo && <div className='analysis-overlay__coords'>
                        { dimfo.names.map((val, idx) => (
                            <div key={idx}>
                            <span className='analysis-overlay__coord-item'>
                                <span className='analysis-overlay__coord-label'>{val}</span>
                                {parseLoc(dimfo.locs[idx], dimfo.units[idx])}
                            </span>
                            {idx+1 != dimfo.names.length && <span className='analysis-overlay__coord-sep'>/</span>}
                            </div>
                        ))

                        }
                    </div>}
        </div>
        </overLayTunnel.In>
    )
}
