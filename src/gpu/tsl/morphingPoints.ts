import * as u from '@/gpu/tsl/utils/uniforms';
import { clamp, cos, float, instancedArray, instanceIndex, min, positionWorld, rotate, sin, smoothstep, texture, time, uniform, vec2, vec3, vec4 } from "three/tsl";
import * as THREE from 'three/webgpu';


function getShapePositions(count:number){
    const spherePositions = new Float32Array(count * 3);
    const cubePositions = new Float32Array(count * 3);
    const planePositions = new Float32Array(count * 3);

    // --- Sphere Positions (using Fibonacci lattice for even distribution) ---
    const phi = Math.PI * (3.0 - Math.sqrt(5.0)); // Golden angle
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      spherePositions[i * 3] = x * 1.2;
      spherePositions[i * 3 + 1] = y * 1.2;
      spherePositions[i * 3 + 2] = z * 1.2;
    }

    // --- Cube Positions (16x16x16 grid) ---
    const cubRes = 25
    let i = 0;
    for (let x = 0; x < cubRes; x++) {
      for (let y = 0; y < cubRes; y++) {
        for (let z = 0; z < cubRes; z++) {
          cubePositions[i * 3] = (x / cubRes - 0.5) * 2;
          cubePositions[i * 3 + 1] = (y / cubRes - 0.5) * 2;
          cubePositions[i * 3 + 2] = (z / cubRes - 0.5) * 2;
          i++;
        }
      }
    }

    // --- Plane Positions (64x64 grid) ---
    const planeRes = 125
    i = 0;
    for (let x = 0; x < planeRes; x++) {
      for (let y = 0; y < planeRes; y++) {
        planePositions[i * 3] = (x / planeRes - 0.5) * 2.5 ;
        planePositions[i * 3 + 1] = (y / planeRes - 0.5) * 2.5 ;
        planePositions[i * 3 + 2] = 0;
        i++;
      }
    }
    return {spherePositions, cubePositions, planePositions}
}

export const pointerPos = uniform(vec2(-100))

export function createMorphingMaterial(points=15625){
    const {spherePositions, cubePositions, planePositions} = getShapePositions(points)
    const sPositions = instancedArray(spherePositions, 'vec3');
    const cPositions = instancedArray(cubePositions, 'vec3');
    const pPositions = instancedArray(planePositions, 'vec3');

    const material = new THREE.SpriteNodeMaterial();

    const sPos = sPositions.element(instanceIndex);
    const cPos = cPositions.element(instanceIndex);
    const pPos = pPositions.element(instanceIndex);
    const holdTime = 5;   // seconds sitting on a shape
    const moveTime = 2;   // seconds morphing to the next one
    const segment = holdTime + moveTime;

    // 0..3, advances by 1 per segment, wraps S -> C -> P -> S
    const stage = time.div(segment).mod(3);

    // stays on integers while holding, eases to the next integer at the end of each segment
    const hold = holdTime / segment;
    const e = stage.floor().add(smoothstep(hold, 1, stage.fract())); // 0..3

    // triangle weights, always sum to 1; e=3 wraps back to the sphere
    const wS = clamp(float(1).sub(e), 0, 1).add(clamp(e.sub(2), 0, 1));
    const wC = clamp(float(1).sub(e.sub(1).abs()), 0, 1);
    const wP = clamp(float(1).sub(e.sub(2).abs()), 0, 1);

    const morphedPosition = sPos.mul(wS).add(cPos.mul(wC)).add(pPos.mul(wP)).toVar();
    const rotateX = rotate(morphedPosition,vec3(1,0,0).mul(time.div(20)))
    const rotateY = rotate(rotateX,vec3(0,1,0).mul(time.div(15)))

    const r = sin( positionWorld.z.add( time.mul( 0.2 ) ) );
    const g = cos( positionWorld.y.add( time.mul( 0.3 ) ) );
    const b = cos( positionWorld.x.add( positionWorld.y ).add( time.mul( 0.5 ) ) );
    const mag = min( sin( r.add( g ).add( b ) ).add( 1. ).div( 2. ), 0.996 );

    // const distance = pointerPos.distance(positionWorld.mul(vec3(1,1,0))).inverseSqrt().clamp(1,100)
    material.positionNode = rotateY
    material.colorNode = vec4(texture(u.cmap, vec2(mag, 0.5)).rgb, 1)
    material.scaleNode = float(0.015)
    return material
}