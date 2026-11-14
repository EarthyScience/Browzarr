# Data-loading bug audit: useDataFetcher and downstream

## Context
I traced the path from `useDataFetcher` → `GetArray` / `GetAttributes` / `GetDimInfo` → worker → `MemoryLRU` cache → `GetCurrentArray` → `createDataTexture`, plus the triggers (`MetaData.handlePlot`, `PlayButton`, `StoreInitializer`, the local/NC/GT loaders). Loading a typical 3D remote Zarr works. The bugs show up with 4D+ data, local files, packed NetCDF, bivariate plots, long sessions and overlapping fetches.

Severity: **S1** = silent wrong data · **S2** = stuck, crash, or feature broken · **S3** = leak, degradation, or bad UX.
Repro: **High** = normal use on a common dataset type · **Med** = needs a specific dataset or sequence · **Low** = timing or edge case.

## Findings (sorted by severity, then reproducibility)

| # | Sev | Repro | Issue |
|---|-----|-------|-------|
| 1 | S1 | High | Index of a collapsed (non-plotted) dim is missing from the chunk cache key |
| 2 | S1 | High | Local datasets are cached by file/folder name, and the cache is never cleared |
| 3 | S1 | High | NetCDF `scale_factor` / `add_offset` / valid range are ignored |
| 4 | S1 | Med  | Changing the axis mapping reuses cached chunks in the old orientation |
| 5 | S1 | Med  | Bivariate variables with different chunking assemble from the wrong chunk grid |
| 6 | S1 | Med  | Chunks evicted from the cache become zeros without any warning |
| 7 | S1 | Med  | No guard against stale requests: overlapping fetches mix data, scales and stores |
| 8 | S2 | High | Promise chain has no `.catch`: any failure leaves "Downloading..." and a blank canvas |
| 9 | S2 | High | Dims without a coordinate array make the variable impossible to open |
| 10 | S2 | High | "Grab Prev/Next Chunk" does nothing |
| 11 | S2 | Med  | Opening MetaData clears global `variable2` during a bivariate plot |
| 12 | S2 | Med  | Single row/column selections give NaN shapes |
| 13 | S2 | Low  | After a store switch, refetch uses the old variable, slices and axis mapping without checking them |
| 14 | S3 | High | Constant or all-NaN fields render fully transparent (divide by zero) |
| 15 | S3 | High | `remapTexture` GPU leak on every refetch for irregular grids |
| 16 | S3 | High | Reprojection is silently dropped on every refetch |
| 17 | S3 | Med  | Zarr `fill_value: 0` on int arrays may mask every real zero (needs verifying) |
| 18 | S3 | Med  | MemoryLRU is O(n) per get/set, so it slows down over a long session |
| 19 | S3 | Low  | Dim arrays evicted while the meta entry survives → dims become `[0]`, flipY wrong |
| 20 | S3 | Low  | An in-flight `setupZarr` can overwrite the NetCDF/GeoTIFF variable list |
| 21 | S3 | Low  | `ncModule` is closed mid-fetch, or never closed when switching to Zarr |
| 22 | S3 | Low  | The plot fetch overwrites global `metadata` while another variable is being browsed |

## Details

**1. Collapsed-dim index not in the cache key (S1/High).** `handlePlot` always writes ranges (`[start, stop+1]`) into `ndSlices` ([MetaData.tsx:350](src/components/layout/MainPanel/MetaData.tsx#L350)). `GetArray` only puts *numeric* entries into the key (`filter(s => typeof s === "number")`, [GetArray.ts:59](src/data/zarr/GetArray.ts#L59)), so that part is always `""`. The chunk ID only encodes the z/y/x chunk indices. Repro: 4D `[time, depth, lat, lon]`, plot depth=0, change depth to 5, Plot → depth 0 is shown again from the cache. The "N chunks already cached" hint is wrong the same way. [helpers.ts:235](src/lib/helpers.ts#L235) has the same issue.

**2. Cache collisions for local data (S1/High).** `initStore` is `local:${fileName}` ([loadNetCDF.ts:45](src/data/loaders/loadNetCDF.ts#L45)), `local_${baseDir}` ([LocalZarr.tsx:45](src/components/layout/MainPanel/LocalZarr.tsx#L45)) or `local:${name}` (loadGeoTiff). `clearCache` is only called from the manual button in CacheInfo. Repro: load `output.nc`, regenerate it, load it again (or load another `output.nc`) → old metadata, dim arrays and chunks are served.

**3. CF packing ignored (S1/High).** `NCFetcher.getMetadata` returns `preScaling` and `validRange` ([dataFetchers.ts:98-104](src/data/zarr/dataFetchers.ts#L98-L104)). `add_offset` is never read. `GetArray` only takes `{shape, chunkShape, fillValue, dtype}` ([GetArray.ts:18](src/data/zarr/GetArray.ts#L18)), and none of these reach `processChunk`. int16-packed NetCDF (ERA5-style) shows raw integers with wrong colorbar values. Zarr written by xarray with packed encoding has the same problem.

**4. Axis remap reuses stale chunks (S1/Med).** The cache key has no `axisMapping` in it. The reuse check compares origin and bin counts only ([GetArray.ts:113-117](src/data/zarr/GetArray.ts#L113-L117)). Swapping x and y on data with square chunks (e.g. 256×256) passes the check and returns the transposed layout.

**5. Bivariate with different chunking (S1/Med).** Both `GetArray` calls run at the same time and both write the global `currentChunks`, `strides`, `arraySize` and `x/y/zSlice` ([GetArray.ts:40-55](src/data/zarr/GetArray.ts#L40-L55)). `GetCurrentArray(undefined, variable2)` then walks whichever grid was written last. `SecondVariable` only checks that the shapes match ([SecondVariable.tsx:36](src/components/layout/MetaComponents/SecondVariable.tsx#L36)). Missing chunks become zeros (see #6).

**6. Evicted chunks become zeros (S1/Med).** `GetCurrentArray` skips missing chunks (`if (!chunk) continue`, [helpers.ts:256](src/lib/helpers.ts#L256)) inside a zero-initialised `Float16Array`. The LRU evicts chunks of the *current* request when the selection is larger than the cache. MetaData shows a warning but still allows Plot, and bivariate doubles the footprint. If a rescale is needed, `cache.get` returns undefined and the destructure throws instead ([GetArray.ts:162-163](src/data/zarr/GetArray.ts#L162-L163)), which leads into #8.

**7. No stale-request guard (S1/Med).** [useDataFetcher.tsx:117-137](src/hooks/useDataFetcher.tsx#L117-L137) applies results unconditionally, and `createDataTexture` reads global state at resolve time. Possible outcomes:
- Re-plotting during a slow download: B's texture gets A's `valueScales`, units, metadata, shape or flipY.
- Switching store mid-load: `GetCurrentArray` builds keys with the *new* `initStore` → all-zero texture.
- Two fetches of the same variable: the rescaler transfers (detaches) a cached chunk buffer that the other fetch is still reading.

`abortController` and `fetchKey` exist in ZarrStore but nothing uses them. Progress and status from the two fetches also interleave.

**8. Unhandled rejection = stuck UI (S2/High).** The `try/catch` only covers synchronous code, and `Promise.all(...)` has no `.catch`. The old textures are already disposed and `show=false`, so the canvas is blank and status stays "Downloading..." forever. Common triggers: int64 variables ("BigInt arrays not supported", [dataFetchers.ts:74](src/data/zarr/dataFetchers.ts#L74)), unsupported dtype, #9, network errors, and `largeArray`.

**9. Dims without coordinates (S2/High).** `getFetchStoreDims` calls `zarr.open(group.resolve(dim))` for every dim and does not catch the error ([zarrita-store.ts:126-135](src/data/zarr/zarrita-store.ts#L126-L135)). xarray does not write arrays for dims without coords (e.g. `x`, `y`, `member`). The Variables panel select fails with only a `console.error`. Dims of variables in nested groups are resolved at the root, so the lookup can fail or pick the wrong array. The cache-hit path uses `?? [0]` instead, so the two paths behave differently. The icechunk and NC dim getters should be checked for the same issue.

**10. Chunk paging broken (S2/High).** PlayButton sets `zSlice` and calls `ReFetch` ([PlayButton.tsx:203-206, 221-224](src/components/layout/MainPanel/PlayButton.tsx#L203)). `GetArray` derives slices from `ndSlices` and then *overwrites* `zSlice` ([GetArray.ts:37-41](src/data/zarr/GetArray.ts#L37-L41)), so the same window is fetched again. `AdjustCacheSize` also grows `maxSize` permanently on every click.

**11. `variable2` cleared (S2/Med).** The effect `useEffect(..., [initStore])` also runs on mount ([MetaData.tsx:291-294](src/components/layout/MainPanel/MetaData.tsx#L291-L294)). Opening any variable's metadata during a bivariate plot sets `variable2 = undefined` while `bivariate` stays true. The next non-Plot `ReFetch` then calls `GetArray(undefined)`, which loads the primary variable twice, and labels or legend show undefined.

**12. Degenerate shapes (S2/Med).** [useDataFetcher.tsx:81-92](src/hooks/useDataFetcher.tsx#L81-L92):
- Setting start=stop on a plotted dim (a transect) leaves 1 dimension after the 1-filter. `aspectRatio` becomes NaN and `isFlat` is false.
- For 2D data, `timeRatio` is NaN, and `Math.max(NaN, 2)` returns NaN, so `shape.z` is NaN.

**13. Stale state after a store switch (S2/Low).** Only `handlePlot` resets `ndSlices` and `axisMapping`. `variable` and `plotOn` keep their old values, and the Play chunk buttons stay enabled. The local-URL path also calls `ReFetch` ([StoreInitializer.tsx:74](src/components/layout/StoreInitializer.tsx#L74)). `GetArray` does not check `axisMapping < rank` or that the slices fit the shape. A variable with the same name in the new store (e.g. `t2m`) is fetched with out-of-range slices.

**14. Constant or all-NaN fields (S3/High).** `1/(max-min)` is Infinity, so every value becomes NaN and renders as missing ([TextureMakers.tsx:15, 119](src/gpu/textures/TextureMakers.tsx#L15); `createTextureData.ts:21`; `Analysis.ts:67`). An all-NaN selection gives `min=Infinity, max=-Infinity`. This hits masks and single-valued test data.

**15. remapTexture leak (S3/High for irregular grids).** `useDataFetcher.tsx:45`, `clearProjectionData`, `resetProjection` and `handleIrregularGrid` ([ProjectionTexture.ts:213](src/gpu/textures/ProjectionTexture.ts#L213)) replace the texture without disposing the old one. Each sphere refetch of a Gaussian or irregular grid leaks a 1024² texture.

**16. Projection dropped (S3/High).** Every refetch clears `nativeCRS` and `destCRS` unless `preProject` is set, including chunk paging and remaps.

**17. Zarr `fill_value: 0` (S3/Med, needs verifying).** In [dataFetchers.ts:60-62](src/data/zarr/dataFetchers.ts#L60-L62), int arrays written with the zarr default fill value 0 may turn every 0 into NaN. Whether this happens depends on how `processChunk` compares against the fill value.

**18. MemoryLRU cost (S3/Med).** `order.filter` on every get/set ([MemoryLRU.ts:47, 65](src/lib/MemoryLRU.ts#L47)) makes assembly O(chunks × entries). It gets noticeably slower as the cache fills with small chunks.

**19–22 (Low).**
- **19:** In `GetZarrDims`, if the meta entry is cached but the dim arrays were evicted, it falls back to `[0]`. flipY becomes false and the image flips for N→S latitudes.
- **20:** `loadNetCDF` and `loadGeoTiff` don't bump `loadToken`, so a slow remote `setupZarr` can overwrite their variable list.
- **21:** Loading a new NC closes the old `ncModule` while a fetch is still using it. Switching NC → Zarr never closes the module (WASM memory leak).
- **22:** The plot fetch's `setMetadata` lands while another variable is being browsed, so the attributes popover shows the wrong variable.

## Suggested fix order (not yet approved)
1. #8 + #7: generation token / AbortController in `useDataFetcher` (use the existing `fetchKey`), `.catch` that restores status and surfaces an error, dispose old textures only after the new ones succeed.
2. #1 + #4 + #2: build the cache key from the full selection (every non-plotted dim index + axisMapping), and make local `initStore` unique per load (or clear the cache entries under that prefix when a local dataset loads).
3. #3: pass `preScaling` / `add_offset` / `validRange` into `processChunk`.
4. #9, #10, #5, #6, #11, then the S3 items.

## Verification (per fix)
- 4D dataset: change the depth index between plots and confirm the values change (#1).
- Load a local `.nc`, edit and save it, reload it, and confirm the new values (#2).
- Packed int16 NetCDF: compare the colorbar range with `xarray.open_dataset(...).var.min()/max()` (#3).
- Throttle the network in DevTools, Plot A then quickly Plot B, and confirm B's range and units are correct (#7).
- Pick an int64 variable and confirm an error appears instead of a stuck spinner (#8).
