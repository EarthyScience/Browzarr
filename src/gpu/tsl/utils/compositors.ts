import { bool, Break, Discard, float, If, max, min, select, vec2, vec3, vec4 } from 'three/tsl';
import * as h from './commonHelpers';
import * as u from './uniforms';
import { blendSample, isMissing } from './volumeHelpers';

export type VolumeMode = 'additive' | 'max' | 'min';

// One in-range sample handed from a traversal to a compositor. borderUV is lazy so it's only built when needed.
export type VolumeSample = { d: any, biVal: any, isNan: any, borderUV: () => any };

// Folds the samples along a ray into a color. sample() may Break() to end the ray early.
export type Compositor = { sample: (s: VolumeSample) => void, finish: () => any };

// --- ACCUMULATOR --- //
const rayAccumulators = () => ({
    accumColor: vec3( 0.0 ).toVar('accumColor'),
    alphaAcc: float( 0.0 ).toVar('alphaAcc'),
    borderHit: bool(false).toVar('borderHit'),
})

const finishRay = (acc: ReturnType<typeof rayAccumulators>) => {
    If( acc.alphaAcc.lessThanEqual( 0.0 ), () => Discard());
    return select(acc.borderHit, vec4(u.borderColor, 1.0), vec4(acc.accumColor, acc.alphaAcc));
}

// --- COMPOSITORS --- //
const additive = (): Compositor => {
    const acc = rayAccumulators();
    return {
        sample: ({ d, biVal, isNan, borderUV }) => {
            blendSample(acc, d, biVal, isNan);
            If(acc.alphaAcc.greaterThanEqual(0.99), () => {
                acc.borderHit.assign(h.isBorder(borderUV()));
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
    // Largest/smallest value a sample can take: the threshold edge, tightened by readVoxel's [0, 0.995] clamp (univariate only)
    const limit = isMax
        ? select(u.bivariate, u.threshold.y, min(u.threshold.y, 0.995))
        : select(u.bivariate, u.threshold.x, max(u.threshold.x, 0.0));
    return {
        sample: ({ d, biVal, isNan, borderUV }) => {
            If(isMissing(d, isNan), () => {
                sawNan.assign(bool(true));
            }).ElseIf(found.not().or(isMax ? d.greaterThan(best) : d.lessThan(best)), () => {
                best.assign(d);
                bestBi.assign(biVal);
                found.assign(bool(true));
                If(u.useBorderTexture, () => { bestUV.assign(borderUV()); });
                // Nothing can beat the limit
                If(isMax ? best.greaterThanEqual(limit) : best.lessThanEqual(limit), () => { Break(); });
            });
        },
        finish: () => {
            // Color the winner as a single sample on an empty ray, so it shares the transfer function
            const acc = rayAccumulators();
            If(found, () => {
                blendSample(acc, best, bestBi, bool(false));
                acc.borderHit.assign(h.isBorder(bestUV));
            }).ElseIf(sawNan, () => {
                blendSample(acc, float(0), float(0), bool(true));
            });
            return finishRay(acc);
        },
    };
};

export const makeCompositor = (mode: VolumeMode): Compositor => {
    if (mode === 'max') return intensityProjection(true);
    if (mode === 'min') return intensityProjection(false);
    return additive();
};
