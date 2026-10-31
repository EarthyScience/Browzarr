import { Discard, Fn, If, positionGeometry, vec2, vec4 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import * as u from './utils/uniforms'
const colorShader = Fn(() =>{
    // Border geometry is x∈[-1,1], y∈[-0.5,0.5]; scale y into the volume's local space (shape.y = 2*aspect) to match the bounds
    const p = positionGeometry.xy.mul(vec2(1, u.shape.y));
	// Trim border lines that fall outside the plot's (cropped) extent
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
