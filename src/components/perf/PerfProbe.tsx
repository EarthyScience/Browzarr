'use client';
// Bench-only probe inside the main Canvas: times the first rendered frame after a load
// and runs the frame-time benchmark. See src/lib/perf.ts.
import { useEffect } from 'react';
import { invalidate, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import * as perf from '@/lib/perf';
import { useGlobalStore } from '@/stores/GlobalStore';

// ---- Renderer wrapper (installed from the Canvas gl factory) ---- //
// Kept on globalThis so hot reloads of this module share state with the already-wrapped renderer
interface BenchState {
	frame: { cpu: number[]; wall: number[]; gpu: number[]; lastStart: number; recording: boolean; sinceResolve: number };
	startBench: ((seconds: number, label: string) => void) | null;
}
const bench: BenchState = ((globalThis as any).__bzBench ??= {
	frame: { cpu: [], wall: [], gpu: [], lastStart: 0, recording: false, sinceResolve: 0 },
	startBench: null,
});
const frame = bench.frame;

export function instrumentRenderer(renderer: THREE.WebGPURenderer) {
	const orig = renderer.render.bind(renderer);
	const backend = (renderer as any).backend;
	renderer.render = ((scene: THREE.Object3D, camera: THREE.Camera) => {
		const t0 = perf.now();
		const first = perf.takeFirstFrame();
		const out = orig(scene, camera);
		const t1 = perf.now();
		if (first) {
			// Texture upload happens lazily inside this render; wait for the GPU to finish it
			const done: Promise<unknown> = backend?.device?.queue?.onSubmittedWorkDone?.()
				?? Promise.resolve(backend?.gl?.finish?.());
			done.then(() => perf.finishLoad(perf.now() - t0, t0));
		}
		if (frame.recording) {
			if (frame.lastStart) frame.wall.push(t0 - frame.lastStart);
			frame.lastStart = t0;
			frame.cpu.push(t1 - t0);
			frame.sinceResolve++;
			if (backend?.trackTimestamp) {
				const n = frame.sinceResolve;
				// The pool sums every query since the last resolve, so average over those frames
				renderer.resolveTimestampsAsync(THREE.TimestampQuery.RENDER).then(ms => {
					if (ms && frame.recording) {
						frame.gpu.push(ms / n);
						frame.sinceResolve = Math.max(0, frame.sinceResolve - n);
					}
				});
			}
		}
		return out;
	}) as typeof renderer.render;
}

// ---- Frame benchmark ---- //
export function runFrameBench(seconds = 10, label = '') {
	if (!bench.startBench) {
		console.warn('[bench] Frame bench unavailable: load a variable first so the plot is shown');
		return;
	}
	console.log(`[bench] Frame bench started (${seconds}s)`);
	bench.startBench(seconds, label);
}

const REFRESH_RATES = [30, 60, 75, 90, 120, 144, 165, 240];
// Fixed orbit so every run renders the same views: same start, radius and path
// regardless of where the user left the camera. 3D plots do one full revolution
// per run; flat plots sway ±30° since a full turn would view the plane edge-on.
const ORBIT = { radius: 3, height: 2, startAngle: -Math.PI / 4, flatRadius: 5, flatSway: Math.PI / 6 };
let orbit: { t0: number; ms: number; flat: boolean } | null = null;

function orbitPosition(out: THREE.Vector3, progress: number, flat: boolean) {
	if (flat) {
		const a = ORBIT.flatSway * Math.sin(progress * 2 * Math.PI);
		return out.set(ORBIT.flatRadius * Math.sin(a), 0, ORBIT.flatRadius * Math.cos(a));
	}
	const a = ORBIT.startAngle + progress * 2 * Math.PI;
	return out.set(ORBIT.radius * Math.sin(a), ORBIT.height, ORBIT.radius * Math.cos(a));
}

export function PerfProbe() {
	const mainTextures = useGlobalStore(s => s.mainTextures);
	const setFrameloop = useThree(s => s.setFrameloop);
	const camera = useThree(s => s.camera);
	const gl = useThree(s => s.gl);

	// Arm after the plot meshes have committed, so the timed frame actually draws the data
	useEffect(() => { perf.armFirstFrame(); invalidate(); }, [mainTextures]);

	useEffect(() => {
		bench.startBench = (seconds, label) => {
			const renderer = gl as unknown as THREE.WebGPURenderer;
			const backend = (renderer as any).backend;
			const hasGPU = backend?.trackTimestamp && renderer.hasFeature?.('timestamp-query');
			Object.assign(frame, { cpu: [], wall: [], gpu: [], lastStart: 0, recording: true, sinceResolve: 0 });
			const startPos = camera.position.clone();
			const flat = useGlobalStore.getState().isFlat;
			orbitPosition(camera.position, 0, flat);
			camera.lookAt(0, 0, 0);
			orbit = { t0: perf.now(), ms: seconds * 1000, flat };
			setFrameloop('always');
			setTimeout(() => {
				frame.recording = false;
				orbit = null;
				setFrameloop('demand');
				camera.position.copy(startPos);
				camera.lookAt(0, 0, 0);
				invalidate();
				const wall = perf.stats(frame.wall);
				// rAF is vsync-capped if the median sits on a common refresh interval
				const hz = 1000 / wall.median;
				const capped = REFRESH_RATES.find(r => Math.abs(hz - r) / r < 0.05);
				perf.pushFrameRun({
					label: label || `${seconds}s orbit`,
					frames: frame.wall.length,
					vsync: capped ? 'capped' : 'uncapped?',
					refreshHzGuess: capped,
					wall,
					cpu: perf.stats(frame.cpu),
					gpu: frame.gpu.length ? perf.stats(frame.gpu) : undefined,
					gpuNote: !hasGPU ? 'GPU time unavailable (timestamp-query not supported or not enabled)'
						: `${backend?.device ? 'WebGPU timestamp-query' : 'WebGL2 EXT_disjoint_timer_query_webgl2'}; values averaged per resolve batch (${frame.gpu.length} batches)`,
				});
			}, seconds * 1000);
		};
		return () => { bench.startBench = null; };
	}, [gl, camera, setFrameloop]);

	// Position from elapsed time, not frame delta, so the path is identical at any frame rate
	useFrame(() => {
		if (!orbit) return;
		const progress = Math.min(1, (perf.now() - orbit.t0) / orbit.ms);
		orbitPosition(camera.position, progress, orbit.flat);
		camera.lookAt(0, 0, 0);
	});
	return null;
}
