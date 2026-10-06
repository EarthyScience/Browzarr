import { Fn, vec4, vec3, abs, If, normalize, pow, EPSILON, Discard, int, ceil, Loop,
	min, max, vec2, select, cameraPosition, positionLocal, varying, float, bool,
	Break, modelWorldMatrixInverse, modelWorldMatrix, Continue,
	texture, mod, clamp, ivec3, fract } from 'three/tsl';
import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as v from './utils/volumeUniforms'
import * as THREE from 'three/webgpu'

export const hitBox = Fn(([orig, dir]: any[]) => {
		const boxMax = v.scale.mul(0.5);
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


function rayMarch(){
	const vOrigin = varying(modelWorldMatrixInverse.mul(vec4(cameraPosition, 1.0)).xyz, 'vOrigin');
  	const vDirection = varying(positionLocal.sub(vOrigin), 'vDirection');

	return Fn(() => {
		const rayDir = normalize(vDirection);
		const bounds = hitBox(vOrigin, rayDir).toVar('bounds');
	
		If(bounds.x.greaterThan(bounds.y), () => {
			Discard();
		});
	
		bounds.x.assign(max(bounds.x, 0.0));
	
		const inc = vec3(1.0).div(abs(rayDir));
		const delta = min(inc.x, min(inc.y, inc.z)).div(v.steps).toVar('delta');
	
		const zStepSize = int(u.textureDepths.y).mul(int(u.textureDepths.x));
		const yStepSize = int(u.textureDepths.x);
		const scaler = vec3(1.0).div(v.scale);
	
		const accumRGB = vec3(0.0).toVar('accumRGB');
		const alphaAcc = float(0.0).toVar('aphaAcc');
		const borderHit = bool(false).toVar('borderHit');
	
		const nSteps = int(ceil(bounds.y.sub(bounds.x).div(delta)));
	
		Loop(nSteps, ({ i }: { i: any }) => {
			const t = bounds.x.add(float(i).mul(delta));
			const p = vOrigin.add(rayDir.mul(t));
		
			// ---- clip bounds ----
			If(
				p.x.greaterThan(v.flatBounds.x.negate()).or(p.x.lessThan(v.flatBounds.y.negate())),
				() => { Continue(); },
			);
			If(
				p.z.negate().greaterThan(v.flatBounds.z.negate())
				.or(p.z.negate().lessThan(v.flatBounds.w.negate())),
				() => { Continue(); },
			);
			If(
				p.y.lessThan(v.vertBounds.x).or(p.y.greaterThan(v.vertBounds.y)),
				() => { Continue(); },
			);
		
			// ---- reprojection + mask ----

			const rp = h.reprojector(p.mul(scaler).add(0.5));
			If(rp.valid.not(), () => { Continue(); });
		
			If(u.maskValue.notEqual(0), () => {
				// .level(0): textureSample needs uniform control flow in WGSL, which
				// this loop (continue/break/discard) doesn't have. Explicit LOD is fine.
				const mask = texture(u.maskTexture, rp.maskUV).r;
				const skip = u.maskValue.equal(1).and(mask.lessThan(0.5))
				.or(u.maskValue.notEqual(1).and(mask.greaterThanEqual(0.5)));
				If(skip, () => { Continue(); });
			});
		
			// ---- texel addressing ----
			const texCoord = vec3(0).toVar('texCoord')
			texCoord.xy.assign(rp.texCoord);
			texCoord.z.assign(mod(texCoord.z.add(u.animateProg), 1.0001));
			texCoord.assign(clamp(texCoord, vec3(0.0), vec3(1.0).sub(EPSILON)));
		
			const idx = clamp(
				ivec3(texCoord.mul(u.textureDepths)),
				ivec3(0),
				ivec3(u.textureDepths).sub(ivec3(1)),
			);
			const textureIdx = idx.z.mul(zStepSize).add(idx.y.mul(yStepSize)).add(idx.x);
			const localCoord = fract(texCoord.mul(u.textureDepths));
		
			// ---- sample ----
			const d = float(0.0).toVar('d');
			const biVal = float(0.0).toVar('biVal');
			const biNaN = bool(false).toVar('biNaN');
		
			If(u.bivariate, () => {
				const bivar = h.sample2ToOrder(localCoord, textureIdx, u.bivariateSelection);
				d.assign(bivar.r);
				biVal.assign(bivar.g);
				biNaN.assign(h.isNaNBits(d).or(h.isNaNBits(biVal)));
			}).Else(() => {
				d.assign(h.sample1(localCoord, textureIdx));
				d.assign(h.rescaler(d));
			});
		
			const isnan = h.isNaNBits(d)
				.or(biNaN)
				.or(u.useF16.not().and(d.equal(1.0)))
				.or(abs(d.sub(u.fillValue)).lessThan(0.005));
		
			If(isnan, () => {
				const a5 = pow(u.nanAlpha, 5.0);
				accumRGB.addAssign(float(1.0).sub(alphaAcc).mul(a5).mul(u.nanColor.rgb));
				alphaAcc.addAssign(a5);
				Continue();
			});
		
			// (original `else if (!bivariate)`; the Continue above makes a plain If equivalent)
			If(u.bivariate.not(), () => {
				d.assign(d.mul(u.cScale));
				d.assign(max(min(d.add(u.cOffset), 0.995), 0.0));
			});
		
			// ---- threshold + compositing ----
			const inRange = d.greaterThanEqual(u.threshold.x).and(d.lessThanEqual(u.threshold.y));
		
			If(inRange, () => {
				const col = vec3(0.0).toVar('col');
				If(u.bivariate, () => {
				If(u.bivariateSelection.notEqual(0), () => {
					col.assign(h.colorMixer(biVal, d));
				}).Else(() => {
					col.assign(h.colorMixer(d, biVal));
				});
				}).Else(() => {
				col.assign(texture(u.cmap, vec2(d, 0.5)).rgb);
				});
		
				const alphaFac = select(v.revTransparency, float(1.0).sub(d), d);
				const exponent = v.transparency.mul(v.opacityMag);
				const alpha = float(0.0).toVar('alpha');
		
				If(v.useClipScale, () => {
				const normalizedOpacity = clamp(
					alphaFac.sub(u.threshold.x).div(u.threshold.y.sub(u.threshold.x)),
					0.0,
					1.0,
				);
				alpha.assign(pow(max(normalizedOpacity, 0.001), exponent));
				}).Else(() => {
				alpha.assign(pow(max(alphaFac, 0.001), exponent));
				});
		
				accumRGB.addAssign(float(1.0).sub(alphaAcc).mul(alpha).mul(col));
				alphaAcc.addAssign(alpha.mul(float(1.0).sub(alphaAcc)));
		
				If(alphaAcc.greaterThanEqual(1.0), () => {
					If(u.useBorderTexture, () => {
						const borderDist = texture(u.borderTexture, rp.maskUV).r;
						If(borderDist.lessThanEqual(u.borderWidth), () => {
						borderHit.assign(bool(true));
						});
					});
					Break();
				});
			});
		});
		const result = vec4(accumRGB, alphaAcc).toVar('result');
		If(borderHit, () => {
		result.assign(vec4(u.borderColor, 1.0));
		});
	
		If(result.a.equal(0.0), () => {
		Discard();
		});
		return result;
	})();
}

export function rayMarchingMaterial(){
	const material = new THREE.NodeMaterial();
	material.fragmentNode = rayMarch();
	material.side = THREE.BackSide;
	material.transparent = true;
    material.depthWrite = false;
	return material
}