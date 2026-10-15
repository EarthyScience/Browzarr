import * as u from './utils/uniforms'
import { bool, Fn, If, positionGeometry, uniform, Discard, vec4 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import { usePlotStore } from '@/GlobalStates/PlotStore'
const fragShader = Fn(() =>{
    If( positionGeometry.x.lessThan( u.flatBounds.x )
        .or( positionGeometry.x.greaterThan( u.flatBounds.y ) )
        .or( positionGeometry.y.lessThan( u.vertBounds.x ) )
        .or( positionGeometry.y.greaterThan( u.vertBounds.y ) )
        .and( u.trim ), () => {
	Discard();
    });
    return vec4(u.borderColor, 1);
})

export function createBorderMaterial(){
    const material = new THREE.NodeMaterial()
    material.fragmentNode = fragShader();

    return material
}