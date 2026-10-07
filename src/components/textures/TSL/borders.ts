import * as u from './utils/commonUniforms'
import { bool, Fn, If, positionGeometry, uniform, Discard, vec4 } from 'three/tsl'
import * as vu from './utils/volumeUniforms'
import * as THREE from 'three/webgpu'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { usePlotStore } from '@/GlobalStates/PlotStore'

export const trim = uniform(bool(false))
usePlotStore.subscribe((state, previousState) => {
  if (state.plotType !== previousState.plotType) {
    trim.value = state.plotType != 'sphere'
  }
})

const fragShader = Fn(() =>{
    If( positionGeometry.x.lessThan( vu.flatBounds.x )
        .or( positionGeometry.x.greaterThan( vu.flatBounds.y ) )
        .or( positionGeometry.y.lessThan( vu.vertBounds.x ) )
        .or( positionGeometry.y.greaterThan( vu.vertBounds.y ) )
        .and( trim ), () => {
	Discard();
    });
    return vec4(u.borderColor, 1);
})

export function createBorderMaterial(){
    const material = new THREE.NodeMaterial()
    material.fragmentNode = fragShader();

    return material
}