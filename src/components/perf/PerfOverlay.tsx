'use client';
// Bench-only DOM panel: run list, frame bench, cache clear, copy JSON
import { useEffect, useReducer, useState, useSyncExternalStore } from 'react';
import * as perf from '@/lib/perf';
import { useCacheStore } from '@/stores/CacheStore';
import { runFrameBench } from './PerfProbe';

const btn: React.CSSProperties = { padding: '2px 6px', border: '1px solid #888', borderRadius: 4, background: '#222', color: '#eee', cursor: 'pointer' };

export function PerfOverlay() {
	const [, rerender] = useReducer((x: number) => x + 1, 0);
	const [open, setOpen] = useState(true);
	const [seconds, setSeconds] = useState(10);
	const [label, setLabel] = useState('');
	// BENCH reads the URL, so report false on the server to avoid a hydration mismatch
	const enabled = useSyncExternalStore(perf.subscribe, () => perf.BENCH, () => false);
	useEffect(() => perf.subscribe(rerender), []);
	if (!enabled) return null;
	const runs = perf.getRuns();
	return (
		<div style={{ position: 'fixed', bottom: 8, left: 8, zIndex: 10000, background: 'rgba(0,0,0,0.8)', color: '#eee',
			font: '11px monospace', padding: 8, borderRadius: 6, maxWidth: 'min(420px, calc(100vw - 32px))', maxHeight: '50vh', overflow: 'auto' }}>
			<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
				<b style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>bench {open ? '▾' : '▸'}</b>
				<button style={btn} onClick={() => { useCacheStore.getState().clearCache(); console.log('[bench] LRU cache cleared'); }}>Clear cache</button>
				<input style={{ width: 40 }} type="number" value={seconds} min={1} onChange={e => setSeconds(+e.target.value)} />s
				<input style={{ width: 90 }} placeholder="label" value={label} onChange={e => setLabel(e.target.value)} />
				<button style={btn} onClick={() => runFrameBench(seconds, label)}>Frame bench</button>
				<button style={btn} onClick={() => navigator.clipboard.writeText(JSON.stringify(runs, null, 2))}>Copy JSON</button>
				<button style={btn} onClick={() => perf.clearRuns()}>Reset</button>
			</div>
			{open && runs.map(run => 'stages' in run ? (
				<div key={run.id} style={{ marginTop: 6 }}>
					<div>#{run.id} {run.cache} TTFV <b>{run.ttfvMs} ms</b> <span style={{ opacity: 0.6 }}>{run.label}</span></div>
					{Object.entries(run.stages).map(([k, v]) => (
						<div key={k} style={{ paddingLeft: 8 }}>{k}: {v!.sumMs} ms (n={v!.count}, wall {v!.wallMs})</div>
					))}
				</div>
			) : (
				<div key={run.id} style={{ marginTop: 6 }}>
					<div>#{run.id} frames {run.label} — {run.vsync}{run.refreshHzGuess ? ` @${run.refreshHzGuess}Hz` : ''} (n={run.frames})</div>
					{(['wall', 'cpu', 'gpu'] as const).map(k => run[k] && (
						<div key={k} style={{ paddingLeft: 8 }}>{k}: med {run[k]!.median} p95 {run[k]!.p95} p99 {run[k]!.p99} &gt;33ms {run[k]!.pctOver33}%</div>
					))}
					{run.gpuNote && <div style={{ paddingLeft: 8, opacity: 0.6 }}>{run.gpuNote}</div>}
				</div>
			))}
		</div>
	);
}
