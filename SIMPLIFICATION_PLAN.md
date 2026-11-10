# Browzarr simplification plan

## Context
The user asked for a scan of the repo and a list of structural and architectural changes that simplify the project and remove code. Three read-only scans cover the UI layer, the data/state layer and the rendering/tooling layer. Every "unused" claim was checked with grep.

## A. UI layer (scan complete, about 4,900 lines)

### A0. Bug found along the way (fix first)
- `src/app/globals.css:4` declares `@custom-variant dark (&:is(.dark *))`, but `ClientRoot.tsx:20` uses `ThemeProvider attribute="data-theme"`, so no `.dark` class is ever set. As a result, every `dark:` utility (in about 20 files) is inert.
  - Fix: change the variant to `[data-theme='dark'] *`. This changes visuals, so check it in the browser.
- `LinePlotArea/ResizeBar.tsx` (around line 27) computes `boundedHeight` but then calls `setHeight(newHeight)`.

### A1. Delete unused shadcn primitives (about 3,300 lines, plus the `input-otp` and `vaul` deps)
- Zero importers: sidebar, menubar, context-menu, alert-dialog, item, navigation-menu, pagination, avatar, breadcrumb, empty, tabs, toggle-group, input-otp, native-select, radio-group, hover-card, checkbox, kbd, direction, spinner, aspect-ratio.
- Used only by the files above: sheet, skeleton, toggle.
- Used only through barrel names that nothing consumes: collapsible, scroll-area, table, drawer.
- Optional small rewrites:
  - `field.tsx` + `label.tsx`: only `widgets/Loading.tsx` uses them, so replace them with plain divs.
  - `combobox.tsx`: its only user is `VariableCombo` → `SecondVariable`. Switch it to the existing `select`/`command`, which also lets us drop the `@base-ui/react` dep.

### A2. Barrel `src/components/ui/index.ts`
- Remove the about 80 lines of exports that nothing consumes.
- Split the barrel into "primitives" and "app components". Today it re-exports app components that import from the barrel themselves (a cycle).

### A3. Dead app components (about 420 lines)
- Delete:
  - `widgets/metadata.tsx`
  - `elements/updateColorbar.tsx`
  - `layout/MetadataText.tsx`
  - `elements/AboutDrawer.tsx` + `AboutInfo.tsx` (their only use is commented out in Navbar)
  - the empty `!SingleUseInLargerComponents` and `!ReusableElements` marker files
  - `Potato` in `Icons.tsx`
- `MetaComponents/Helpers.tsx` duplicates `renderAttributes` in `layout/MetaData.tsx`. Use one copy.
- Rename `layout/MainPanel/MetaData.tsx` (the variable-loading panel) so it no longer collides with `layout/MetaData.tsx`.

### A4. CSS (about 450–500 lines)
- Delete these unimported files: Analysis.css, Loading.css, MiddleSlider.css, ShowAnalysis.css, ThemeSwitch.css, VariableScroller.css, tweakpane.css.
- Delete Error.css: it is imported, but all of its classes are dead.
- Remove dead classes:
  - MainPanel.css: about 90 lines
  - Navbar.css: about 35 lines
  - MetaData.css
  - WelcomeSplash `.bz-primary`
  - globals.css:
    - the tweakpane container block (308–404)
    - `.canvas*` and `.button`
    - the `--sidebar*` vars once sidebar is gone

### A5. Assets (14 files, about 350 KB)
- Delete the unreferenced logo variants in `src/assets` and `src/assets/imgs`, plus `src/app/logo.png`.
- Prune the unused exports in `src/assets/index.ts`, including the stale `ZARR_CATALOG`/`ICECHUNK_CATALOG` re-exports.

### A6. Merges (about 105 lines)
- Three copies of "attributes badge → Dialog (mobile) / Popover (desktop)" in `layout/MetaData.tsx`, `MainPanel/MetaData.tsx` and `SecondVariable.tsx`: replace them with one component.
- `XScaler` and `YScaler` become one `<Scaler axis>`.
- Reuse `usePanelSide()` in `FetchOptions`.
- Reuse the `.no-spinner` utility instead of copying it.
- Use one `isMobile` source (the `useIsMobile` hook).

## B. Data/state layer (scan complete, about 1,200 lines)

### B0. Suspected bugs (confirm before refactoring)
- `PlotStore.coarsen`/`kernel` are never written from code; only URL params set them. So the coarsened-axis branches in `PlayButton.tsx` and `AxisLines.tsx` never run.
- Chunk cache keys ignore the indices of non-plotted dimensions (`GetArray.ts:58-62`, `helpers.ts:235`, `MetaData.tsx:157`). On 4D data, changing the level or ensemble index may reuse stale chunks.
  - Fix: one `chunkKey()` helper.
- `GlobalStore.is4D`/`idx4D` are never written, so the branches that read them are dead.

### B1. Dead code (about 230 lines, no behaviour change)
- **Store fields and setters that nothing uses:**
  - GlobalStore: `clampExtremes`, `setAxisDim*`, `setBivariate`, `is4D`/`idx4D`
  - ZarrStore: `abortController`, `fetchKey`/`bumpFetchKey`, several setters, the unused `ESDC`
  - PlotStore: `resetAnim`, `camera`, `maskTexture`, `borderTexture`, `getColorIdx`
  - AnalysisStore: `execute`, plus the custom-shader fields (C1)
  - ImageExportStore: the five `get*` helpers
  - CacheStore: `clearCache`
- **Hooks and helpers:**
  - delete `hooks/useNetCDF.tsx`, `hooks/usePaddedTextures.ts`, `helpers.HandleCoarselNums` and its private `DecompressArray`
  - in `cookies.ts`, delete `deleteCookie`
  - in `ZarrParser.ts:57`, delete the leftover `console.log`
- **Worker tasks that are never dispatched:** `workers/tasks/createTextureData.ts`, `normalizeData` and `decompress` in `tasks.ts`.
- **Always-empty `scalarIndices` branches:** remove them, along with the legacy whole-array cache branch in `GetCurrentArray`.

### B2. Stores (about 400 lines)
- About 185 hand-written `setX: x => set({x})` setters appear in 9 stores.
  - Option A (recommended, no call-site churn): a `withSetters(initial)` helper of about 15 lines with a template-literal mapped type, keeping only the custom actions hand-written. GlobalStore goes from 227 to about 80 lines, PlotStore from 230 to about 85, ImageExportStore from 162 to about 75.
- `zSlice`/`ySlice`/`xSlice` are duplicated in PlotStore and ZarrStore. Delete the ZarrStore copies; only `ProjectionTexture.resetProjection` reads them.
- The `ESDC` URL is defined 3 times. Use one constant.
- `GlobalStore.textureData` is a side channel between `StoreData` and `CreateTexture`. Return the array instead.
- Replace `useNC`/`useGT`/`ncModule`/`gtSource` with one discriminated `source`. This goes with B3.
- Replace `CacheStore` with a module-level `MemoryLRU` singleton; nothing subscribes to it reactively.
- `useDataFetcher` keeps `stableMetadata` in local state as well as `GlobalStore.metadata`. Keep one.
- Rename `AnalysisStore.variable2` so it no longer collides with `GlobalStore.variable2`.

### B3. One data-source abstraction (about 400 lines, medium risk)
- **Fetchers:** `dataFetchers.ts` already has `{getMetadata, fetchChunk}` for zarr and NC.
  - Extend it with `getAttributes` and `getDims`.
  - Add a `GTFetcher`.
  - Delete `NCGetters.ts` and most of `GTGetters.ts`; `getRasterData` repeats GetArray's bookkeeping.
  - This removes the `useNC`/`useGT` branching in 5 places.
- **Icechunk:** it is already a zarrita store. Keep only `listNodes`-based variable listing; route attributes, dims and title through the generic zarrita path. That is about 150 of `icechunk-store.ts`'s 294 lines.
  - Keep dimension paths group-relative.
- **Retry loops:** five copies; use `fetchWithRetry` everywhere.
- **Duplicated helpers:**
  - `zarrita-store.ts:52-77` duplicates `utils.computeZarrSizeSummary`.
  - The dimension-cache logic is repeated 3 times.
- **`ZarrLoaderLRU.ts` contains no LRU.** Fold it into the source abstraction.
- **`MemoryLRU`:** use Map delete-then-set ordering to drop the `order` array and the duplicated eviction loop (136 → about 70 lines).

### B4. Smaller items (about 110 lines)
- **Catalogs:** merge the 4 catalog files, two of which are empty placeholders, into one typed module.
- **Duplicate pairs of functions:**
  - `getDimAxis`/`getAxisDimAxis` → one parameterised function
  - `useAxisIndices`/`getAxisIndices` → one pure function, also used by `useDataFetcher` and `ExportImageSettings`
- **Normalisation loop:** it is written 5 times (`TextureMakers` ×2, `Analysis.ts`, and the dead worker tasks). Keep one `normalizeToTexture()`.
- **`gribberish.cStrides`** duplicates `arrayMath.calculateStrides`.
- **`lib/` layout:**
  - Move `GetCurrentArray`/`GetDimInfo` from `lib/helpers.ts` into `data/`.
  - Move `copy-wasm.mjs` to `scripts/`.
- **Types:** add `long_name` to `ZarrMetadata` so the two `@ts-expect-error` comments can go.
## C. Rendering/tooling layer (scan complete, about 2,000–2,500 lines)

### C1. The custom WGSL shader editor is dead (about 600 lines, plus the `@monaco-editor/react` dep)
- No code reads `executeCustom` since commit `86749ba2` deleted `AnalysisWG.tsx`. The "Inject" button does nothing.
- Delete:
  - `layout/ShaderEditor.tsx`, `ShaderTemplates.ts` and `css/ShaderEditor.css`
  - `CustomShader()` in `gpu/webGPU.ts` (lines 260–378)
  - in `AnalysisStore`: `customShader`, `executeCustom`, `outputShape` and `reduceOnAxis`
  - the button in `AnalysisOptions.tsx`
  - the `useEditor` wiring in `Plot.tsx`
- **Decision needed:** delete it, or reconnect it.

### C2. Generate `gpu/WGSLShaders.ts` from templates (1,435 → about 450 lines)
- Delete the dead `CUMSUMReduction`.
- Collapse the 13 copies of the `reduceDim` if/else loop into one loop over a computed base and step.
- Add a `kernelLoop(body)` helper to replace the 10 kx/ky/kz loops.
- Add one `header({inputs, outType})` to replace the 10 inline Params/binding headers.
- Build only the shader you need, by key, instead of all 17 strings on every call.

### C3. `webGPU.ts` and `Analysis.ts`
- Bug: the `Error(...)` calls at lines 88 and 263 are never thrown.
- Bug: line 235 computes `Math.max(|minVal|, |minVal|)`; the second argument should be `maxVal`.
- `Analysis.ts:52-53` defines the same `needsRescale` list twice.

### C4. Plot components and TSL (about 250 lines)
- `uniformUpdater()` is a hook (with a non-hook name) that runs in about 8 plot components, plus `CountryBorders`, so its effects run twice. Rename it `useUniformUpdater` and call it once in `Plot.tsx`.
- `PointCloud.tsx:55-62` repeats what the updater already does, and the two conflict on `vertBounds` when flipY is on. Delete PointCloud's copy.
- `HandleTimeSeries` is copied in FlatMap, Sphere and UVCube (about 35 lines each). Move it into one helper.
- The "clear time series on `remapTexture` change" effect is in both FlatMap and UVCube. Move it to Plot.
- Add a `useDisposable(factory, deps)` hook to replace about 15 useMemo + dispose pairs.
  - This also fixes a UVCube geometry leak caused by `[]` deps.
- Share code between FlatBlocks and SphereBlocks (instanced setup, large-array guard), and between the two mesh types in TransectMeshes.
- In TSL, move the clip/height/mask logic shared by flatBlocks and sphereBlocks into `blockHelpers`.
- Delete the dead `u.shape` uniform.
- Smaller cleanups:
  - remove the unused `LineMaterial` import in `AxisLines.tsx`
  - rename `.tsx` files with no JSX to `.ts`
  - drop the `export` from functions used only in their own file

### C5. Dead GLSL and webpack setup (about 70 lines)
- There are no `.glsl`, `.vert` or `.frag` files left, so delete:
  - `shader.d.ts`
  - the raw-loader turbopack rule
  - the whole `webpack:` callback in `next.config.ts` (Turbopack is the default in Next 16, and the aliases repeat tsconfig `paths`)
  - the `console.log` and the commented-out code in `next.config.ts`
  - the `.glsl` MIME entry in `cli.mjs`

### C6. Dependencies to remove (each checked with grep)
- Dead (0 imports): `@react-spring/three`, `@react-three/postprocessing`, `zod`, `pnpm` (as a runtime dep), `@eslint/eslintrc`, `eslint-plugin-next@0.0.0`, `@testing-library/dom`, `@testing-library/react`.
- Go with other items:
  - `@types/webpack` and `raw-loader` (C5)
  - `input-otp` and `vaul` (A1)
  - `@monaco-editor/react` (C1)
  - `@base-ui/react` (the combobox in A1)
- `three-stdlib`: only a type is left; use drei's `OrbitControls` ref type instead.
- Probably removable: `@vitejs/plugin-react` and `jsdom`, because the tests have no TSX and no DOM.
- Move `@types/three` to devDependencies.
- Longer-term: settle on one icon library (`react-icons` is used in 29 files, `lucide-react` in 31).

### C7. Tooling and tests
- Biome is configured (277 lines in `biome.json`) but never runs. Delete it and `@biomejs/biome`; keep ESLint.
- Delete `src/tests/dummy.test.ts`.
- Merge `webGPU.test.ts` and `webGPU-nan.test.ts` (same structure) with `test.each`, saving about 300 lines.
  - Note: they mostly check the mock, not the shaders.
- Remove the `prBuild`/`prLint` alias scripts.
- `rmBuild` may be unnecessary.

### C8. CI
- `deploy-tags.yml` and `release.yml` both create a GitHub release on `v*` tags. Keep one.
- Merge `deploy-latest.yml` and `deploy-tags.yml` into one workflow with a computed target, and update `versions.yml`.
- Delete the unused `TARGET_FOLDER` and `NEXT_PUBLIC_BASE_PATH` env vars.
- Delete the echo-only `prChecks` job.

## Order of execution
1. **Pure deletions, no behaviour change (about 5,500 lines):**
   - A1, A3, A4, A5
   - B1
   - C1 (if the shader editor is dropped)
   - C5, C6, C7
2. **Fix the confirmed and suspected bugs:**
   - A0: dark variant, ResizeBar
   - B0: coarsen state, 4D cache key
   - C3: unthrown errors, minVal typo
   - C4: UVCube leak, PointCloud vertBounds
3. **Low-risk refactors:**
   - B2 (`withSetters`)
   - C2 (WGSL templating)
   - C4 (the `useUniformUpdater` and `HandleTimeSeries` helpers)
   - A2 (barrel split)
   - A6 merges
   - C8 (CI)
4. **Medium-risk refactor:** B3 (one data-source abstraction). Test it with a remote Zarr, Icechunk, local Zarr, NetCDF and GeoTIFF.

Each group is a separate PR. The only open decision is C1: delete the shader editor or reconnect it. The plan assumes delete.

## Verification
- After each step, run `pnpm build` (type-checks), `pnpm lint` and `pnpm test`.
- Run `pnpm dev` and smoke test:
  - load a remote Zarr, a local NetCDF and a GeoTIFF
  - switch through each plot type
  - open the metadata popovers on desktop and on mobile width
  - toggle the theme
