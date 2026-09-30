# Introduction

> What is Browzarr?

Although the `browzarr.io` user interface is pretty intuitive, there are plenty of features that deserve some dedicated space for a longer explanation. But first,

## What is Browzarr?

**Browzarr** is a powerful, browser-native framework for visualizing, exploring, and analyzing Zarr and NetCDF data stores.
Load multi-dimensional datasets directly in the browser, interactively slice and inspect chunks, and gain insights without any backend or server setup.

Because everything runs client-side, your data flows **directly from the store (local disk or S3/HTTP bucket) to your browser** — there is no intermediate server that processes, stores, or re-serves your data.

## Key Features

- **Data cubes** — explore spatio-temporal (`x-y-t`) variables as interactive 3D cubes
- **Globe** — render data on a 3D sphere for spatial context
- **Flat maps** — classic rectangular 2D projections
- **Point clouds** — high-density spatial data as interactive 3D points
- **Time series** — select any pixel in any direction and plot its values over time
- **Colorbar control** — interactive bounds, colormaps, univariate and bivariate mapping
- **Analytics** — WebGPU-accelerated computation, including custom WGSL shaders
- **Export** — static images and animation/video export
- **No install required** — runs online at [browzarr.io](https://browzarr.io), or fully offline via npm or Julia

## Who is it for?

- Earth system scientists and climate researchers who want to eyeball a data cube before writing analysis code
- Data engineers validating Zarr stores, chunking layouts, and Icechunk repositories
- Educators and students who need an approachable, zero-setup way to explore geospatial datasets

## How these docs are organized

- **Getting Started** — installation and a first tour of the interface
- **Essentials** — the core concepts: datasets, variables, colorbar, plot settings, analytics
- **Guides** — task-oriented recipes (remote data, local data, animations, bivariate maps…)
- **Reference** — plot types, supported formats, browser support, troubleshooting, FAQ
- **Community** — contributing and project background

<callout icon="i-lucide-lightbulb">

New to Browzarr? Jump straight to [Installation](/getting-started/installation), then take the [landing page tour](/getting-started/landing).

</callout>
