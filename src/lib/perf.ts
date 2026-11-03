// Benchmark instrumentation. Enabled with ?bench in the URL. Results go to the
// console and to window.__bzPerf (see PerfOverlay for Copy JSON / Clear cache).

export const BENCH = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('bench');

export const STAGES = [
	'metadata', 'chunkFetch', 'decode', 'fetchDecode', 'float16', 'coarsen', 'gzip',
	'rescaleAll', 'cacheAssemble', 'uint8Normalize', 'textureCreate', 'uploadFirstFrame',
] as const;
export type Stage = typeof STAGES[number];

interface StageStat { sum: number; count: number; first: number; last: number }
export interface LoadRun {
	id: number;
	label: string;
	cache: 'cold' | 'warm' | 'mixed';
	hits: number;
	misses: number;
	bytes: number;
	stages: Partial<Record<Stage, { sumMs: number; count: number; wallMs: number }>>;
	ttfvMs?: number;
	notes: string[];
}
export interface FrameRun {
	id: number;
	label: string;
	frames: number;
	vsync: 'capped' | 'uncapped?';
	refreshHzGuess?: number;
	wall: FrameStats;
	cpu: FrameStats;
	gpu?: FrameStats;
	gpuNote?: string;
}
export interface FrameStats { median: number; p95: number; p99: number; mean: number; pctOver33: number }

const state = {
	runs: [] as (LoadRun | FrameRun)[],
	cur: null as null | { start: number; stats: Map<Stage, StageStat>; hits: number; misses: number; bytes: number; notes: Set<string>; label: string },
	firstFrameArmed: false,
	listeners: new Set<() => void>(),
	runId: 0,
};
if (BENCH) (window as any).__bzPerf = state.runs;

export const now = () => performance.now();

export function beginLoad(label: string) {
	if (!BENCH) return;
	state.cur = { start: now(), stats: new Map(), hits: 0, misses: 0, bytes: 0, notes: new Set(), label };
	performance.mark('bz:load-start');
}

// Record a duration measured anywhere (main thread or worker)
export function add(stage: Stage, ms: number, start = now() - ms) {
	const cur = state.cur;
	if (!BENCH || !cur) return;
	const s = cur.stats.get(stage) ?? { sum: 0, count: 0, first: start, last: start + ms };
	s.sum += ms; s.count++;
	s.first = Math.min(s.first, start); s.last = Math.max(s.last, start + ms);
	cur.stats.set(stage, s);
	performance.measure(`bz:${stage}`, { start, duration: ms });
}

// Time a sync or async function into a stage
export function time<T>(stage: Stage, fn: () => T): T {
	if (!BENCH || !state.cur) return fn();
	const t0 = now();
	const out = fn();
	if (out instanceof Promise) return out.finally(() => add(stage, now() - t0, t0)) as T;
	add(stage, now() - t0, t0);
	return out;
}

export function sumOf(stage: Stage) { return state.cur?.stats.get(stage)?.sum ?? 0; }
export function cacheHit(hit: boolean) {
	if (!state.cur) return;
	if (hit) state.cur.hits++;
	else state.cur.misses++;
}
export function addBytes(n: number) { if (state.cur) state.cur.bytes += n; }
export function note(s: string) { state.cur?.notes.add(s); }

export function armFirstFrame() { if (BENCH && state.cur) state.firstFrameArmed = true; }

// Called from the wrapped renderer.render. Returns true if this frame should be timed.
export function takeFirstFrame() {
	if (!state.firstFrameArmed) return false;
	state.firstFrameArmed = false;
	return true;
}

export function finishLoad(uploadFirstFrameMs: number, t0: number) {
	const cur = state.cur;
	if (!cur) return;
	add('uploadFirstFrame', uploadFirstFrameMs, t0);
	performance.mark('bz:first-frame');
	performance.measure('bz:ttfv', 'bz:load-start', 'bz:first-frame');
	const stages: LoadRun['stages'] = {};
	for (const st of STAGES) {
		const s = cur.stats.get(st);
		if (s) stages[st] = { sumMs: r(s.sum), count: s.count, wallMs: r(s.last - s.first) };
	}
	const run: LoadRun = {
		id: ++state.runId, label: cur.label,
		cache: cur.misses === 0 ? 'warm' : cur.hits === 0 ? 'cold' : 'mixed',
		hits: cur.hits, misses: cur.misses, bytes: cur.bytes,
		stages, ttfvMs: r(now() - cur.start), notes: [...cur.notes],
	};
	state.cur = null;
	push(run);
	console.groupCollapsed(`%c[bench] load #${run.id} ${run.label} — ${run.cache} — TTFV ${run.ttfvMs} ms`, 'color:#0a7');
	console.table(Object.fromEntries(Object.entries(stages)));
	console.log({ hits: run.hits, misses: run.misses, bytes: run.bytes, notes: run.notes });
	console.groupEnd();
}

export function stats(xs: number[]): FrameStats {
	const a = [...xs].sort((p, q) => p - q);
	const q = (p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))] ?? 0;
	return {
		median: r(q(0.5)), p95: r(q(0.95)), p99: r(q(0.99)),
		mean: r(a.reduce((s, v) => s + v, 0) / (a.length || 1)),
		pctOver33: r(100 * a.filter(v => v > 33).length / (a.length || 1)),
	};
}

export function pushFrameRun(run: Omit<FrameRun, 'id'>) {
	const full = { id: ++state.runId, ...run };
	push(full);
	console.groupCollapsed(`%c[bench] frames #${full.id} ${full.label} — ${full.vsync} — median ${full.wall.median} ms`, 'color:#07a');
	console.table({ wall: full.wall, cpu: full.cpu, ...(full.gpu ? { gpu: full.gpu } : {}) });
	if (full.gpuNote) console.log(full.gpuNote);
	console.groupEnd();
}

function push(run: LoadRun | FrameRun) { state.runs.push(run); state.listeners.forEach(l => l()); }
export function getRuns() { return state.runs; }
export function clearRuns() { state.runs.length = 0; state.listeners.forEach(l => l()); }
export function subscribe(l: () => void) { state.listeners.add(l); return () => { state.listeners.delete(l); }; }

const r = (v: number) => Math.round(v * 100) / 100;
