"use client";
import type { tasks } from './tasks';
type T = typeof tasks;
type Job = { task: string; data: unknown; transfer: Transferable[]; ok: (v: any) => void; fail: (e: any) => void };

class Pool {
  private idle: Worker[] = [];
  private queue: Job[] = [];
  private size: number;
  private initialized = false;

  constructor(size = 8) {
    this.size = size;
  }

  private ensureWorkers() {
    if (!this.initialized && typeof Worker !== 'undefined') {
      this.initialized = true;
      this.idle = Array.from({ length: this.size }, () =>
        new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }));
    }
  }

  dispatch<K extends keyof T>(task: K, data: Parameters<T[K]>[0], transfer: Transferable[] = []) {
    return new Promise<Awaited<ReturnType<T[K]>>>((ok, fail) => {
      this.queue.push({ task, data, transfer, ok, fail });
      this.next();
    });
  }

  private next() {
    this.ensureWorkers();
    while (this.idle.length && this.queue.length) {
      const w = this.idle.pop()!, job = this.queue.shift()!;
      w.onmessage = ({ data: { out, err } }) => {
        this.idle.push(w);
        err ? job.fail(err) : job.ok(out);
        this.next();
      };
      w.postMessage({ task: job.task, data: job.data }, job.transfer);
    }
  }
}

const pool = new Pool(typeof navigator !== 'undefined' && navigator.hardwareConcurrency
  ? Math.min(8, navigator.hardwareConcurrency)
  : 8);
export const usePool = () => pool;   // optional, for your preferred call style