import { tasks } from './tasks';

self.onmessage = async ({ data: { task, data } }) => {
  try {
    const out = await (tasks as any)[task](data);
    const transfer = Object.values(out ?? {}) // Filter/find any buffers and transfer them instead of copy
      .filter(ArrayBuffer.isView)
      .map(v => (v as ArrayBufferView).buffer);
    self.postMessage({ out }, { transfer: transfer });
  } catch (e) {
    self.postMessage({ err: String(e) });
  }
};