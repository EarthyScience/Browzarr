import { Fn, vec4, vec3, abs, If, normalize, pow, EPSILON, Discard, int, ceil, Loop,
	min, max, vec2, select, cameraPosition, positionLocal, varying, float, bool,
	Break, modelWorldMatrixInverse, modelWorldMatrix, Continue,
	texture, mod, clamp, ivec3, fract, 
	uv} from 'three/tsl';
import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as vu from './utils/volumeUniforms'
import * as THREE from 'three/webgpu'
import { hitBox, sampleVoxel, shouldSkip } from './utils/volumeHelpers';

function rayMarch(){
	const vOrigin = varying(modelWorldMatrixInverse.mul(vec4(cameraPosition, 1.0)).xyz, 'vOrigin');
  	const vDirection = varying(positionLocal.sub(vOrigin), 'vDirection');

	return Fn(() => {
		const rayDir = normalize(vDirection);
		const bounds = hitBox( vOrigin, rayDir ).toVar("bounds");
		If(bounds.x.greaterThan(bounds.y), () => { Discard(); });
		bounds.x.assign(max(bounds.x, 0.0));
	
		const inc = vec3(1.0).div(abs(rayDir));
		const delta = min(inc.x, min(inc.y, inc.z)).div(vu.steps).toVar('delta');	
		const accumColor = vec3(0.0).toVar('accumRGB');
		const alphaAcc = float(0.0).toVar('aphaAcc');
		const borderHit = bool(false).toVar('borderHit');
	
		const nSteps = int(ceil(bounds.y.sub(bounds.x).div(delta)));
	
		Loop(nSteps, ({ i }: { i: any }) => {
			const t = bounds.x.add(float(i).mul(delta));
			const p = vOrigin.add(rayDir.mul(t)).toVar("p");
			const texCoord = vec3(0).toVar('texCoord')
			const maskUV = vec2(0).toVar("maskUV")
			const skip = shouldSkip(p,texCoord, maskUV );
			If(skip.not(), () => {
				const d = float(0.0).toVar();
				const biVal = float(0.0).toVar();
				const isNan = bool(false).toVar();
				const inRange = sampleVoxel(texCoord, d, biVal, isNan);

				If(inRange, () => {
					isNan.assign(isNan.or(abs(d.sub(u.fillValue)).lessThan(0.005)));
	
					If(isNan, () => {
						If(u.nanAlpha.greaterThan(0.0), () => {
							const nanA = pow(u.nanAlpha, 5.0);
							accumColor.addAssign(float(1.0).sub(alphaAcc).mul(nanA).mul(u.nanColor));
							alphaAcc.addAssign(nanA);
						});
					}).Else(() => {
						// const col = vec3(0.0).toVar();
						// If(u.bivariate, () => {
						// 	const flipOrder = u.bivariateSelection.notEqual(0);
						// 	If(flipOrder, () => {
						// 		col.assign(h.colorMixer(biVal, d));
						// 	}).Else(() => {
						// 		col.assign(h.colorMixer(d, biVal));
						// 	});
						// }).Else(() => {
						// 	col.assign(u.cmap.sample(vec2(d, 0.5)).rgb);
						// });

						const s = vu.tfLUT.sample(vec2(d, 0.5));
						const opacity = float(1).sub(alphaAcc);
						accumColor.addAssign(opacity.mul(s.rgb));
						alphaAcc.addAssign(opacity.mul(s.a));
					});

					If(alphaAcc.greaterThanEqual(1.0), () => {
						If(u.useBorderTexture, () => {
						    const borderDist = u.borderTexture.sample(texCoord.xy).r;
						    If(borderDist.lessThanEqual(u.borderWidth), () => {
						        borderHit.assign(bool(true)); // replaces the early `return` in GLSL
						    });
						});
						Break();
					});
				});
			});
		});
		If( alphaAcc.lessThanEqual( 0.0 ), () => Discard());
		return select(borderHit, vec4(u.borderColor, 1.0), vec4(accumColor, alphaAcc));
	})();
}

export function createRayMarchingMaterial(){
	const material = new THREE.NodeMaterial();
	material.fragmentNode = rayMarch();
	material.side = THREE.BackSide;
	material.transparent = true;
    material.depthWrite = false;
	return material
}