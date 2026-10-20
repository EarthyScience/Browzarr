# Browzarr Documentation — Outline

This file describes the intended structure of the documentation site (built with
[Docus](https://docus.dev)). Each entry lists the file in `docs/content/`, its
purpose, and the content that belongs there. Numbering of files/folders controls
sidebar order (Docus convention: `N.folder-name/N.page.md` plus a
`.navigation.yml` per folder for the section title/icon).

Legend: ✅ exists, 🚧 new page to write, ✏️ existing page that needs filling in.

---

## 0. Landing page

- ✅ `content/index.md` — Hero + feature grid. Links to browzarr.io, install
  options, and plot types. Mostly marketing; keep in sync with the README.

## 1. Getting Started (`content/1.getting-started/`)

Purpose: get a new user from zero to their first plot.

| File | Status | Contents |
| --- | --- | --- |
| `1.introduction.md` | ✏️ | What Browzarr is, key features (data cubes, globe, flat maps, point clouds, time series, analytics), who it is for, why browser-native (no backend), and a short "how these docs are organized" section. |
| `2.installation.md` | 🚧 | The three ways to run Browzarr: **Online** (browzarr.io), **npm** (`npm install -g browzarr`, port options/CLI flags), **Julia** (Browzarr.jl). System requirements (browser, WebGPU optional). Port behavior (defaults to 3000, auto-increments). |
| `3.landing.md` | ✏️ | First-run UI tour: main menu (dataset, variable, plot type, colormap, settings, animation, operations) and floating menu (reset camera, view mode, transects, export, performance mode). |

## 2. Essentials (`content/2.essentials/`)

Purpose: core concepts of the UI, one page per major panel/interaction.

| File | Status | Contents |
| --- | --- | --- |
| `1.dataset-loading.md` | 🚧 | The dataset modal: curated catalogs (Zarr + Icechunk), opening a remote Zarr store by URL, remote Icechunk stores, local Zarr directories and local NetCDF files. Metadata shown per dataset. |
| `2.variable-selection.md` | ✏️ | Variable picker: names, attributes, data shape, chunk size, dimension sliders for subsetting large variables. |
| `3.colorbar.md` | ✏️ | Colorbar controls: min/max bounds, drag-to-shift, tick count, scale factor ( scientific notation), attributes popup, univariate vs bivariate. |
| `4.plot-settings.md` | ✏️ | Plot types (cube, sphere, flat map, point cloud, morphing points), axis sliders/cropping, camera (orthographic vs perspective), reprojection, land masks, borders. |
| `5.analytics.md` | ✏️ | WebGPU-powered analytics: enabling WebGPU, built-in operations, custom WGSL shaders via the shader editor, kernel visualizer. |

## 3. Guides (`content/3.guides/`)

Purpose: task-oriented, step-by-step recipes for specific goals.

| File | Status | Contents |
| --- | --- | --- |
| `1.remote-data.md` | 🚧 | Visualizing remote Zarr / Icechunk stores: URL formats, CORS requirements (bucket configuration), authentication notes, known public stores that work well. |
| `2.local-data.md` | 🚧 | Working with local files via the npm/Julia offline apps (and browser limitations): supported layouts for Zarr directories, NetCDF formats, large-file tips. |
| `3.bivariate-colormaps.md` | 🚧 | Enabling bivariate mode, choosing color schemes, mapping a second variable, reading the bivariate colorbar, exporting bivariate plots. |
| `4.animation-and-export.md` | 🚧 | Keyframes, animation playback, exporting static images (settings: size, colorbar inclusion, position) and video/animation export. |
| `5.performance-mode.md` | 🚧 | What performance mode changes, when to use it, memory considerations (LRU chunk cache), tips for very large datasets. |

## 4. Reference (`content/4.reference/`)

Purpose: lookup material — tables, formats, constraints, fixes.

| File | Status | Contents |
| --- | --- | --- |
| `1.plot-types.md` | 🚧 | Reference table of every plot type: icon, required dimensions, typical use, limitations. |
| `2.supported-formats.md` | 🚧 | Zarr (v2/v3, zarrita.js), Icechunk, NetCDF (netcdf4-wasm), codecs/compressions supported, chunking guidance. |
| `3.browser-support.md` | 🚧 | Supported browsers, WebGPU availability per browser/platform, WebGL fallback, known browser-specific issues. |
| `4.troubleshooting.md` | 🚧 | Common errors: CORS failures, missing chunks, blank plots, memory limits, port conflicts, WebGPU not available. Symptom → cause → fix format. |
| `5.faq.md` | 🚧 | Short Q&A: privacy (does data leave the browser?), server requirements, data limits, citing Browzarr, license. |

## 5. Community (`content/5.community/`)

Purpose: how to engage with the project.

| File | Status | Contents |
| --- | --- | --- |
| `1.contributing.md` | 🚧 | Repo layout pointers, dev setup (pnpm, scripts), how to open issues/PRs, docs contributing (this Docus site). |
| `2.about.md` | 🚧 | Project origins (ESA SeasFire), funding (AI4PEX / Horizon Europe, ESA), credits, license, acknowledgments. |

---

## Conventions

- Frontmatter: `title`, `description`, `navigation.icon` (lucide `i-lucide-*`), optional `seo`.
- Section folders get a `.navigation.yml` with `title:` and optional `icon:`.
- Use MDC components: `::callout`, `::steps`, code blocks, tables.
- Screenshots: store under `docs/public/` and reference with absolute paths.
- Keep prose short; prefer lists and tables. Mark unfinished pages with a
  `<!-- TODO -->` comment rather than "WIP" headings.
