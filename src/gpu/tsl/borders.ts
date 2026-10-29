import { abs, any, Discard, Fn, If, positionGeometry, vec4 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import * as u from './utils/uniforms'
const colorShader = Fn(() =>{
    const bounds = u.shape.div(2);
	// Trim border lines that fall outside the plot's extent
	If( u.trim.and( any( abs( positionGeometry.xy ).greaterThan( bounds.xy ) ) ), () => {
	Discard();
    });
    return vec4(u.borderColor, 1);
})
export function createBorderMaterial(){
    const material = new THREE.NodeMaterial()
    material.colorNode = colorShader();
    return material
}