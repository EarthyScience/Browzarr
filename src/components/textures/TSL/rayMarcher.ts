import { Fn, vec4, vec3, abs, If, normalize, pow, EPSILON, Discard, int, ceil, Loop,
	min, max, vec2, select, cameraPosition, positionLocal, varying, float, bool,
	Break, modelWorldMatrixInverse, cameraWorldMatrix, Continue,
	texture, mod, clamp, ivec3, fract, 
	uv} from 'three/tsl';
import * as u from './utils/commonUniforms'	
import * as h from './utils/commonHelpers';
import * as vu from './utils/volumeUniforms'
import * as THREE from 'three/webgpu'
import { colorTexel, hitBox, sampleVoxel, shouldSkip } from './utils/volumeHelpers';

const rayMarch = Fn(([vOrigin, vDirection] : [any, any]) => {
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
					colorTexel(d, biVal, isNan, accumColor, alphaAcc)
					If(alphaAcc.greaterThanEqual(0.99), () => {
						If(u.useBorderTexture, () => {
							const realUV = h.realCoords(texCoord.xy)
							//@ts-ignore .level does exist
						    const borderDist = u.borderTexture.sample(realUV).level(0).r;
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
})

export function createRayMarchingMaterial(isOrtho=false){
	const material = new THREE.NodeMaterial();
	let vOrigin, vDirection;
	if (isOrtho){
		vOrigin = varying(positionLocal, 'vOrigin');
		const viewDirWorld = cameraWorldMatrix.mul(vec4(0.0, 0.0, -1.0, 0.0));
		const viewDirLocal = modelWorldMatrixInverse.mul(viewDirWorld).xyz;
		vDirection = varying(normalize(viewDirLocal), 'vDirection');
	} else {
		vOrigin = varying(modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz);
		vDirection = varying(positionLocal.sub(vOrigin));
		material.side = THREE.BackSide;
	}
	material.fragmentNode = rayMarch(vOrigin, vDirection);
	material.transparent = true;
    material.depthWrite = false;
	return material
}