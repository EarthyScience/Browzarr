# Supported formats

> Data formats, backends and codecs.

## Zarr

Browzarr reads Zarr stores through [zarrita.js](https://github.com/manzt/zarrita.js):

- **Zarr v2** and **Zarr v3** metadata formats
- Remote stores over HTTP(S) (S3, GCS, static hosting, ...) — see [Remote data](/guides/remote-data)
- Local `.zarr` directories via the offline apps
- Consolidated metadata (`.zmetadata`) speeds up the initial parse when present

### Codecs

Common compressors and filters are supported (e.g. `blosc`, `gzip`, `zlib`, shuffle, `astype`). If a chunk fails to decode, the codec is likely missing — open an issue with the store URL.

## Icechunk

[Icechunk](https://icechunk.io) repositories can be opened remotely from the catalog or by URL. Version selection is available when a store exposes multiple versions.

## NetCDF

`.nc` files are decoded in-browser with [netcdf4-wasm](https://github.com/EarthyScience/netcdf4-wasm) (WebAssembly):

- NetCDF-3 (classic) and NetCDF-4 (HDF5-based)
- Chunked (HDF5) files perform best; contiguous large files are slower

## Chunking guidance

- Aim for `1–10 MB` per chunk
- Align chunks with the slicing pattern you expect (e.g. one time step per chunk for animation)
- Avoid many tiny chunks — per-request overhead dominates
