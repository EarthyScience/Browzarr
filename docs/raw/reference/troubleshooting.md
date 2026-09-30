# Troubleshooting

> Common problems and how to fix them.

Symptom → cause → fix, in the order you are most likely to hit them.

## A remote store fails to load

**Cause** — the host does not send CORS headers that allow the Browzarr origin.
**Fix** — configure the bucket/host (see [Remote data](/guides/remote-data)). Test with the browser dev tools *Network* tab: failed preflight/`OPTIONS` requests confirm CORS.

## Store loads in Python but not in Browzarr

**Cause** — usually CORS (Python clients ignore it), or metadata Browzarr cannot parse (missing `zarr.json`/`.zmetadata`, exotic codecs).
**Fix** — add consolidated metadata, check the codec list in [Supported formats](/reference/supported-formats).

## Plot is blank or shows only fill values

**Cause** — the colorbar bounds may sit outside your data range, or the variable uses a `_FillValue`/`scale_factor` that is not applied.
**Fix** — reset the colorbar bounds (see [Colorbar](/essentials/colorbar)); check the variable attributes.

## Downloads are slow

**Cause** — chunks too small (per-request overhead) or too large (over-fetching).
**Fix** — re-chunk to 1–10 MB aligned to your slice pattern; subset with the [variable sliders](/essentials/variable-selection) before plotting.

## The tab crashes on a very large variable

**Cause** — the browser tab runs out of memory.
**Fix** — slice before plotting, enable [performance mode](/guides/performance-mode), try a Chromium browser (often more forgiving).

## Analytics (WebGPU) is unavailable

**Cause** — browser/OS does not expose WebGPU, or no GPU is available (VM, remote desktop).
**Fix** — use a recent Chrome/Edge on native hardware; see [Browser support](/reference/browser-support).

## Port is already in use (npm/Julia app)

Browzarr defaults to port `3000` and automatically picks the next free one. To pin a port: `browzarr --port 8080` (or set `PORT`).
