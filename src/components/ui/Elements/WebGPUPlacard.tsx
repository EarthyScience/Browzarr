import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import React, { useState } from 'react'

const LABELS: Record<string, { text: string; hint: string }> = {
  webgpu: {
    text: "WebGPU enabled",
    hint: "Rendering with WebGPU",
  },
  webgl: {
    text: "Using WebGL",
    hint: "WebGPU isn't available in this browser, so WebGL is rendering instead",
  },
};
export async function detectGpuBackend() {
  try {
    const gpu = (navigator as any).gpu;
    if (gpu) {
      const adapter = await gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch {
    /* fall through to WebGL */
  }
  return "webgl";
}

export const WebGPUPlacard = () => {
    const [active,setActive] = useState('webgpu')
    const { text, hint } = LABELS[active];
    detectGpuBackend().then(e=>setActive(e))
    return (
        <>
            <style>{css}</style>
            <span
                className={`gpu-badge gpu-badge--${active}`.trim()}
                role="status"
                title={hint}
            >
                <span className="gpu-badge__dot" aria-hidden="true" />
                {text}
            </span>
        </>
    )
}

const css = `
.gpu-badge {
  --gb-fg: #1f4a44;
  --gb-bg: rgba(63, 130, 120, 0.06);
  --gb-border: rgba(63, 130, 120, 0.07);
  --gb-dot: #2f9a8a;
  position: absolute;
  left:50%;
  top: 2%;
  transform:translatex(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.95rem 0.4rem 0.8rem;
  border: 1px solid var(--gb-border);
  border-radius: 999px;
  background: var(--gb-bg);
  color: var(--text-paragraph);
  box-shadow: 0 1px 2px var(--modal-shadow),
    0 4px 18px -4px color-mix(in srgb, var(--gb-dot) 35%, transparent);
  font: 600 0.875rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: default;
  user-select: none;
}
 
.gpu-badge--webgl {
  --gb-fg: #5a4a2a;
  --gb-bg: rgba(160, 128, 70, 0.15);
  --gb-border: rgba(160, 128, 70, 0.45);
  --gb-dot: #b8903f;
}
 
.gpu-badge__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--gb-dot);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--gb-dot) 24%, transparent);
}

`;