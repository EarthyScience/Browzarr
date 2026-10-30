import { Fn, vec3, abs, If, normalize, int, ceil, Loop, min, vec2, float, bool, Break } from 'three/tsl';
import * as u from './utils/uniforms'
import * as h from './utils/commonHelpers';
import * as THREE from 'three/webgpu'
import { colorTexel, finishRay, rayAccumulators, rayBounds, rayVaryings, sampleVoxel, shouldSkip } from './utils/volumeHelpers';

const rayMarch = Fn(([vOrigin, vDirection] : [any, any]) => {
		const rayDir = normalize(vDirection);
		const bounds = rayBounds(vOrigin, rayDir);

		const inc = vec3(1.0).div(abs(rayDir));
		const delta = min(inc.x, min(inc.y, inc.z)).div(u.steps).toVar('delta');
		const acc = rayAccumulators();

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
					colorTexel(d, biVal, isNan, acc.accumColor, acc.alphaAcc)
					If(acc.alphaAcc.greaterThanEqual(0.99), () => {
						If(u.useBorderTexture, () => {
							acc.borderHit.assign(h.isBorder(maskUV))
						});
						Break();
					});
				});
			});
		});
		return finishRay(acc);
})

export function createRayMarchingMaterial(isOrtho=false){
	const material = new THREE.NodeMaterial();
	const { vOrigin, vDirection } = rayVaryings(material, isOrtho);
	material.fragmentNode = rayMarch(vOrigin, vDirection);
	material.transparent = true;
    material.depthWrite = false;
	return material
}
