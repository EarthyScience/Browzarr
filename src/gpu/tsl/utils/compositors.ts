import { bool, Break, float, Fn, If, normalize, vec2, vec3 } from 'three/tsl';
import * as h from './commonHelpers';
import * as u from './uniforms';
import { colorTexel, finishRay, isMissing, rayAccumulators, rayBounds, sampleVoxel, shouldSkip } from './volumeHelpers';

export type VolumeMode = 'additive' | 'max' | 'min';

// One in-range sample handed from a traversal to a compositor. borderUV is lazy so it's only built when needed.
export type VolumeSample = { d: any, biVal: any, isNan: any, borderUV: () => any };

// Folds the samples along a ray into a color. sample() may Break() to end the ray early.
export type Compositor = { sample: (s: VolumeSample) => void, finish: () => any };

// Walks the ray from bounds.x to bounds.y, calling compositeAt for every sample position.
export type Traversal = (vOrigin: any, rayDir: any, bounds: any, comp: Compositor) => void;

// --- COMPOSITORS --- //
const additive = (): Compositor => {
    // Normal sampler from before
    const acc = rayAccumulators();
    return {
        sample: ({ d, biVal, isNan, borderUV }) => {
            colorTexel(d, biVal, isNan, acc.accumColor, acc.alphaAcc);
            If(acc.alphaAcc.greaterThanEqual(0.99), () => {
                If(u.useBorderTexture, () => {
                    acc.borderHit.assign(h.isBorder(borderUV()));
                });
                Break();
            });
        },
        finish: () => finishRay(acc),
    };
};
const intensityProjection = (isMax: boolean): Compositor => {
    const best = float(0).toVar('best');
    const bestBi = float(0).toVar('bestBi');
    const bestUV = vec2(0).toVar('bestUV');
    const found = bool(false).toVar('found');
    const sawNan = bool(false).toVar('sawNan');
    return {
        sample: ({ d, biVal, isNan, borderUV }) => {
            If(isMissing(d, isNan), () => {
                sawNan.assign(bool(true));
            }).ElseIf(found.not().or(isMax ? d.greaterThan(best) : d.lessThan(best)), () => {
                best.assign(d);
                bestBi.assign(biVal);
                found.assign(bool(true));
                If(u.useBorderTexture, () => { bestUV.assign(borderUV()); });
                // Nothing in the threshold range can beat its edge
                If(isMax ? best.greaterThanEqual(u.threshold.y) : best.lessThanEqual(u.threshold.x), () => { Break(); });
            });
        },
        finish: () => {
            // Color the winner as a single sample on an empty ray, so it shares the transfer function
            const acc = rayAccumulators();
            If(found, () => {
                colorTexel(best, bestBi, bool(false).toVar(), acc.accumColor, acc.alphaAcc);
                acc.borderHit.assign(h.isBorder(bestUV));
            }).ElseIf(sawNan, () => {
                colorTexel(float(0), float(0), bool(true).toVar(), acc.accumColor, acc.alphaAcc);
            });
            return finishRay(acc);
        },
    };
};

const makeCompositor = (mode: VolumeMode): Compositor => {
    if (mode === 'max') return intensityProjection(true);
    if (mode === 'min') return intensityProjection(false);
    return additive();
};

// --- SHARED PIPELINE --- //
export const compositeAt = (comp: Compositor, p: any, borderUV: (maskUV: any) => any) => {
    const texCoord = vec3(0).toVar('texCoord');
    const maskUV = vec2(0).toVar('maskUV');
    const skip = shouldSkip(p, texCoord, maskUV);
    If(skip.not(), () => {
        const d = float(0.0).toVar();
        const biVal = float(0.0).toVar();
        const isNan = bool(false).toVar();
        const inRange = sampleVoxel(texCoord, d, biVal, isNan);
        If(inRange, () => {
            comp.sample({ d, biVal, isNan, borderUV: () => borderUV(maskUV) });
        });
    });
};

export const volumeShader = (traverse: Traversal, mode: VolumeMode) => Fn(([vOrigin, vDirection]: [any, any]) => {
    const rayDir = normalize(vDirection).toVar('rayDir');
    const bounds = rayBounds(vOrigin, rayDir);
    const comp = makeCompositor(mode);
    traverse(vOrigin, rayDir, bounds, comp);
    return comp.finish();
});
