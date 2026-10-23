import { Discard, Fn, If, positionGeometry, positionWorld, vec4 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import * as u from './utils/uniforms'
const colorShader = Fn(() =>{
    const bounds = u.shape.div(2);
    If( positionGeometry.x.lessThan( bounds.x.negate() )
        .or( positionGeometry.x.greaterThan( bounds.x ) )
        .or( positionGeometry.y.lessThan( bounds.y.negate() ) )
        .or( positionGeometry.y.greaterThan( bounds.y ) )
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