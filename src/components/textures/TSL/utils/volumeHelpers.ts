import {
    any,bool,clamp,EPSILON,Fn,fract,If,int,ivec3,
    max,min,mod,select,vec2,vec3
} from 'three/tsl';
import * as h from './commonHelpers';
import * as u from './commonUniforms';
import * as vu from './volumeUniforms';
import * as THREE from 'three/webgpu'

export const shouldSkip = (p: any, texCoord: any, maskUV: any) => {
    const skip = bool(false).toVar();
    texCoord.assign(vec3(0.0));
 
    const outOfBounds = p.x.greaterThan(vu.flatBounds.x.negate())
        .or(p.x.lessThan(vu.flatBounds.y.negate()))
        .or(p.z.negate().greaterThan(vu.flatBounds.z.negate()))
        .or(p.z.negate().lessThan(vu.flatBounds.w.negate()))
        .or(p.y.lessThan(vu.vertBounds.x))
        .or(p.y.greaterThan(vu.vertBounds.y));
    If(outOfBounds, () => { skip.assign(bool(true)); });
 
    If(skip.not(), () => {
        texCoord.assign(p.div(vu.scale).add(0.5));
        const valid = h.reprojector(texCoord, maskUV);
        If(valid.not(), () => { skip.assign(bool(true)); });
    });
 
    If(skip.not(), () => {
        If(any(maskUV.greaterThan(vec2(1.0))).or(any(maskUV.lessThan(vec2(0.0)))), () => {
            skip.assign(bool(true));
        });
    });
 
    If(skip.not().and(u.maskValue.notEqual(0)), () => {
        const mask = u.maskTexture.sample(maskUV).r;
        const masked = select(u.maskValue.equal(1), mask.lessThan(0.5), mask.greaterThanEqual(0.5));
        If(masked, () => { skip.assign(bool(true)); });
    });
 
    If(skip.not(), () => {
        texCoord.z.assign(mod(texCoord.z.add(u.animateProg), 1.0001));
        texCoord.assign(clamp(texCoord, vec3(0.0), vec3(1.0).sub(vec3(EPSILON))));
    });
 
    return skip;
};


export const sampleVoxel = (texCoord: any, d: any, biVal: any, isNan: any) => {
    // This gets the sample value. If d is clipped by value-range return false
    const depths = ivec3(u.textureDepths);
    const yStepSize = depths.x;
    const zStepSize = depths.y.mul(depths.x);
    const idx = clamp(ivec3(texCoord.mul(u.textureDepths)), ivec3(0), depths.sub(int(1)));
    const textureIdx = idx.z.mul(zStepSize).add(idx.y.mul(yStepSize)).add(idx.x);
    const localCoord = fract(texCoord.mul(u.textureDepths));
 
    If(u.bivariate, () => {
        const bivar = h.sample2ToOrder(localCoord, textureIdx, u.bivariateSelection).toVar();
        d.assign(bivar.r);
        biVal.assign(bivar.g);
        isNan.assign(
            h.isNaNBits(d).or(h.isNaNBits(biVal))
                .or(u.useF16.not().and(d.equal(1.0)))
                .or(u.useF16.not().and(biVal.equal(1.0)))
        );
    }).Else(() => {
        d.assign(h.sample1(localCoord, textureIdx));
        d.assign(h.rescaler(d)); // GLSL rescaler(inout d) -> returns the rescaled value here
        isNan.assign(h.isNaNBits(d).or(u.useF16.not().and(d.equal(1.0))));
        d.assign(max(min(d.mul(u.cScale).add(u.cOffset), 0.995), 0.0));
    });
 
    return d.greaterThanEqual(u.threshold.x).and(d.lessThanEqual(u.threshold.y)).toVar();
};

export const hitBox = Fn(([orig, dir]: any[]) => {
        const boxMax = vu.scale.mul(0.5);
        const boxMin = boxMax.negate();
        const invDir = vec3(1.0).div(dir);
        const tA = boxMin.sub(orig).mul(invDir);
        const tB = boxMax.sub(orig).mul(invDir);
        const tmin = min(tA, tB);
        const tmax = max(tA, tB);
        const t0 = max(tmin.x, max(tmin.y, tmin.z));
        const t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
});

export function buildTransferLUT(p: {
  cmap: (d: number) => [number, number, number];
  threshold: [number, number];
  useClipScale: boolean;
  revTransparency: boolean;
  transparency: number;
  opacityMag: number;
}, size = 256) {
  const data = new Uint16Array(size * 4); // half float
  const exp = p.transparency * p.opacityMag;
  const [t0, t1] = p.threshold;
  for (let i = 0; i < size; i++) {
    const d = i / (size - 1);
    const af = p.revTransparency ? 1 - d : d;
    const n = p.useClipScale ? Math.min(Math.max((af - t0) / (t1 - t0), 0), 1) : af;
    const a = Math.pow(Math.max(n, 0.001), exp);
    const [r, g, b] = p.cmap(d);
    const newCol = new THREE.Color(r,g,b).convertLinearToSRGB()
    data.set([newCol.r * a, newCol.g * a, newCol.b * a, a].map(THREE.DataUtils.toHalfFloat), i * 4); // premultiplied
  }
  const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}