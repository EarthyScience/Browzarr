import {
    abs,
    any,bool,cameraPosition,cameraWorldMatrix,clamp,EPSILON,float,Fn,If,
    max,min,mod,modelWorldMatrixInverse,normalize,positionLocal,pow,select,varying,vec2,vec3,vec4
} from 'three/tsl';
import * as h from './commonHelpers';
import * as u from './uniforms';
import * as THREE from 'three/webgpu'

// Maps a box-space position to texture/mask coords. skip is true when the point is clipped, masked or off the map.
export const locateSample = (p: any) => {
	const texCoord = vec3(0).toVar('texCoord');
	const maskUV = vec2(0).toVar('maskUV');
    const skip = bool(false).toVar();
    const outOfBounds = p.x.greaterThan(u.flatBounds.x.negate())
        .or(p.x.lessThan(u.flatBounds.y.negate()))
        .or(p.z.negate().greaterThan(u.flatBounds.z.negate()))
        .or(p.z.negate().lessThan(u.flatBounds.w.negate()))
        .or(p.y.lessThan(u.vertBounds.x))
        .or(p.y.greaterThan(u.vertBounds.y));
    If(outOfBounds, () => { skip.assign(bool(true)); });

    If(skip.not(), () => {
        texCoord.assign(p.div(u.volumeScale).add(0.5));
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

	return { skip, texCoord, maskUV };
};

// Reads the data value(s) at texCoord. inRange is false when d falls outside the threshold range.
export const readVoxel = (texCoord: any) => {
	const d = float(0.0).toVar();
	const biVal = float(0.0).toVar();
	const isNan = bool(false).toVar();
    const {localCoord, textureIdx} = h.getLocalCoord3D(texCoord);
    If(u.bivariate, () => {
        const bivar = h.sample2ToOrder(localCoord, textureIdx, u.bivariateSelection).toVar();
        d.assign(bivar.r);
        biVal.assign(bivar.g);
        isNan.assign(h.isNanVal(d).or(h.isNanVal(biVal)));
    }).Else(() => {
        d.assign(h.sample1(localCoord, textureIdx));
        d.assign(h.rescaler(d)); 
        isNan.assign(h.isNanVal(d));
        d.assign(max(min(d.mul(u.cScale).add(u.cOffset), 0.995), 0.0));
    });

	const inRange = d.greaterThanEqual(u.threshold.x).and(d.lessThanEqual(u.threshold.y)).toVar();
	return { d, biVal, isNan, inRange };
};

// NaN or the dataset's fill value
export const isMissing = (d: any, isNan: any) => isNan.or(abs(d.sub(u.fillValue)).lessThan(0.005));

// Front-to-back blends one sample's transfer-function color into acc
export const blendSample = (acc: { accumColor: any, alphaAcc: any }, d: any, biVal: any, isNan: any) => {
	const { accumColor, alphaAcc } = acc;
    If(isMissing(d, isNan), () => {
        If(u.nanAlpha.greaterThan(0.0), () => {
            const nanA = pow(u.nanAlpha, 5.0);
            accumColor.addAssign(float(1.0).sub(alphaAcc).mul(nanA).mul(u.nanColor));
            alphaAcc.addAssign(nanA);
        });
    }).Else(() => {
        const s = u.tfLUT.sample(vec2(d, 0.5)).toVar();
        const opacity = float(1).sub(alphaAcc).toVar();
        If( u.bivariate, () => {
            const flipOrder = u.bivariateSelection.notEqual( 0 );
            const biCol = select( flipOrder, h.colorMixer( biVal, d ), h.colorMixer( d, biVal ) ).toVar();
            accumColor.addAssign(opacity.mul(s.a).mul(biCol.rgb));
        }).Else( () => {
            accumColor.addAssign(opacity.mul(s.rgb));
        })
        alphaAcc.addAssign(opacity.mul(s.a));
    });
}

export const hitBox = Fn(([orig, dir]: any[]) => {
        const boxMax = u.volumeScale.mul(0.5);
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

// --- RAY MARCHING SKELETON --- //
// Ray origin/direction varyings in local space. Perspective rays render from the back faces.
export const rayVaryings = (material: THREE.NodeMaterial, isOrtho: boolean) => {
    if (isOrtho){
        const viewDirWorld = cameraWorldMatrix.mul(vec4(0.0, 0.0, -1.0, 0.0));
        const viewDirLocal = modelWorldMatrixInverse.mul(viewDirWorld).xyz;
        return { vOrigin: varying(positionLocal, 'vOrigin'), vDirection: varying(normalize(viewDirLocal), 'vDirection') };
    }
    material.side = THREE.BackSide;
    const vOrigin = varying(modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz);
    return { vOrigin, vDirection: varying(positionLocal.sub(vOrigin)) };
}

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
