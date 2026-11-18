# Coarse-brick empty-space skip: outstanding issues

## Context
Branch `jp/coarsen-volume` adds a coarse min/max brick volume (`handleCoarse` → worker `coarsenVolume` → `CoarsenMinMaxNaN`) and `skipLeadingEmpty` in `src/gpu/tsl/volume.ts`. The basic path now works (axis order + NaN-brick fixes). This is the list of what the foundation still gets wrong or leaves undone, from tracing `git diff main`. Ordered by severity.

## A. Correctness: brick test disagrees with what readVoxel actually renders
`readVoxel` (`src/gpu/tsl/utils/volumeHelpers.ts:50-68`) does not compare the raw texel to the threshold. The brick test (`volume.ts` ~line 155) does. Things the brick test ignores:
1. **`h.rescaler(d)` and `cScale`/`cOffset`** are applied before the threshold check. Whenever the color-scale adjustment isn't the identity, bricks get skipped that do contain in-range samples, or the reverse. Fix: apply the same transform to brick min/max (it's monotonic, so you can transform both ends; if `cScale` can be negative, swap them) and include the 0..0.995 clamp.
2. **`nanAlpha > 0`**: `blendSample` draws NaN and fill-value voxels as tinted. Skipping all-NaN bricks then removes visible output. Fix: `allNaN` only counts as empty when `u.nanAlpha <= 0`.
3. **`fillValue`**: these voxels are treated as missing too. Optional: also skip a brick when min == max == fillValue (and nanAlpha is 0).
4. **`animateProg`**: `locateSample` shifts `texCoord.z` by `mod(z + animateProg, 1.0001)`. The brick lookup uses the unshifted position, so the wrong bricks are skipped during animation. Fix: shift the brick z the same way, or disable bricks while animating.
5. **Reprojection / `remapTexture`**: `h.reprojector` can remap texCoord.xy, and `u.dataShape` changes to the remap texture's size. Brick space then no longer matches data space. Fix: in `handleCoarse`, don't build bricks when `remapTexture` is set (or pass `useBricks=false` from `DataCube`).
6. **Crop bounds (`flatBounds` / `vertBounds`)**: sample-level skip only, so it's safe, but the skip could also clip `bounds` to the crop box for extra speed. Low priority.

## B. Lifecycle / React
7. **Material recompiles every data load**: in `DataCube.tsx` the `useMemo` deps include the `coarseVolume` object. Use `const hasBricks = Boolean(coarseVolume)` and depend on that.
8. **Race in `handleCoarse`** (`TextureMakers.tsx`): it isn't awaited and has no stale check. Two quick loads can finish out of order, and an older result overwrites a newer one. Add a generation counter (compare it after the `await`, and dispose the stale result).
9. **Disposing while in use**: the old texture is disposed before the new one exists while `u.coarseVolume` still points at it. Fix: dispose the previous texture only after you swap in the new one. When going to `undefined`, set state first, then dispose.
10. **Uniform order**: set `u.coarseKernel` and `u.coarseShape` *before* `setState({coarseVolume})`, so the first frame with bricks has the right sizes.
11. **No error handling**: if `pool.dispatch` rejects (no WebGPU in the worker), the promise is never caught. Wrap it in try/catch and fall back to `coarseVolume: undefined`.
12. **Unused store fields**: `coarseShape` and `coarseKernel` in `GlobalStore.ts` are never written. Either delete them or store them there and push them to uniforms in `uniformUpdater` (more consistent with the other uniforms).
13. **Does the worker get a copy or the buffer?** `dispatch` is called without `transfer`, so `textureData` is structured-cloned (a full copy of a large array). That's correct, just costly. Fine for now; note it.

## C. Performance (the actual goal)
14. **Leading skip only**: once a ray hits an occupied brick, DDA and raymarch walk every fine voxel to `bounds.y`. Do the skip inside the traversal: keep coarse-DDA state and, on entering an empty brick, jump `t` to the brick's exit (DDA: re-seed voxel/tMax from the new t; raymarch: advance `i` by `ceil((tExit - t)/delta)`).
15. **Trailing skip**: cheaply, run the same coarse DDA from `bounds.y` backward to tighten the exit. Lower value than 14.
16. **Threshold for building bricks**: `shouldReduce` needs a dimension ≥ 256, but the kernel already reduces from 128. Consider `>= 2*TARGET_DIM` so the two agree.
17. **Bivariate is excluded**: fine for now. Two-channel min/max would be needed later.

## D. Cleanup
18. Remove the `console.log(bounds)` in `volumeShader` if it's still there.
19. The 16-bit NaN edge case: the u8 check `mm.x > 254.5/255` would wrongly skip a 16-bit brick whose min is exactly 1.0. Fix: gate the check on `u.useF16` (or whatever the 16-bit flag uniform is) instead of relying on NaN comparisons.
20. Name the 255 NaN code as a shared constant (it's used in StoreData, the WGSL shader, and the TSL check).

## Suggested order
B7–B11 (small, low risk) → A2, A5, A1 → C14 → A4 → rest.

## Verification
- All-NaN volume: still discarded quickly. With nanAlpha > 0, NaN tint must still show.
- Real dataset: toggle bricks (temporarily force `useBricks=false`) and compare screenshots at several thresholds and color-scale settings; they must be identical.
- Animate z: no popping or holes.
- Remapped dataset: bricks off, renders as on main.
- Load datasets quickly one after another: no stale coarse texture or console errors; the material doesn't recompile on every load (check in devtools).
- FPS before and after C14 on a sparse dataset.
