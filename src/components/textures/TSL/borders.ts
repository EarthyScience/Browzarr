import { Discard, Fn, If, positionGeometry, positionWorld, vec4 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import * as u from './utils/uniforms'
const colorShader = Fn(() =>{
    If( positionWorld.x.lessThan( u.flatBounds.x )
        .or( positionWorld.x.greaterThan( u.flatBounds.y ) )
        .or( positionWorld.y.lessThan( u.vertBounds.x ) )
        .or( positionWorld.y.greaterThan( u.vertBounds.y ) )
        .and( u.trim ), () => {
	Discard();
    });
    return vec4(u.borderColor, 1);
})
export function createBorderMaterial(){
    const material = new THREE.NodeMaterial()
    material.colorNode = colorShader();
    return material
}