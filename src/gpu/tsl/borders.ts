import { Discard, Fn, If, positionGeometry, vec2, vec4 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import * as u from './utils/uniforms'
const colorShader = Fn(() =>{
    const p = positionGeometry.xy.mul(vec2(1, u.shape.y));
    const outOfBounds = p.x.greaterThan(u.flatBounds.x.negate())
        .or(p.x.lessThan(u.flatBounds.y.negate()))
        .or(p.y.lessThan(u.vertBounds.x))
        .or(p.y.greaterThan(u.vertBounds.y));
	If( u.trim.and(outOfBounds), () => {
	    Discard();
    });
    return vec4(u.borderColor, 1);
})
export function createBorderMaterial(){
    const material = new THREE.NodeMaterial()
    material.colorNode = colorShader();
    return material
}
