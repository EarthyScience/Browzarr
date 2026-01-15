"use client";

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';
import vertexShader from '@/components/textures/shaders/LandingVertex.glsl'
import fragmentShader from '@/components/textures/shaders/LandingFrag.glsl'
import './Plots.css';
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';


const MorphingPoints = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 15625;
  const {gl} = useThree();
  const { setMaxTextureSize, setMax3DTextureSize } = usePlotStore(useShallow(state => ({
    setMaxTextureSize: state.setMaxTextureSize,
    setMax3DTextureSize: state.setMax3DTextureSize
  })))

  useEffect(()=>{
    const context = gl.getContext()
    //@ts-expect-error This parameter does exist
    setMax3DTextureSize(context.getParameter(context.MAX_3D_TEXTURE_SIZE))
    setMaxTextureSize(context.getParameter(context.MAX_TEXTURE_SIZE))
  },[])

  const {colormap} = useGlobalStore(useShallow(state => ({
    colormap: state.colormap
  })))

  // Generate positions with improved distribution and spawn points
  const { spherePositions, cubePositions, planePositions, spawnPositions, delays } = useMemo(() => {
    const spherePositions = new Float32Array(count * 3);
    const cubePositions = new Float32Array(count * 3);
    const planePositions = new Float32Array(count * 3);
    const spawnPositions = new Float32Array(count * 3);
    const delays = new Float32Array(count);

    // Sphere - Fibonacci lattice for even distribution
    const phi = Math.PI * (3.0 - Math.sqrt(5.0));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      spherePositions[i * 3] = x * 1.2;
      spherePositions[i * 3 + 1] = y * 1.2;
      spherePositions[i * 3 + 2] = z * 1.2;

      // Spawn positions - random directions from center
      const spawnTheta = Math.random() * Math.PI * 2;
      const spawnPhi = Math.random() * Math.PI;
      const spawnDist = 4 + Math.random() * 2;
      
      spawnPositions[i * 3] = Math.sin(spawnPhi) * Math.cos(spawnTheta) * spawnDist;
      spawnPositions[i * 3 + 1] = Math.sin(spawnPhi) * Math.sin(spawnTheta) * spawnDist;
      spawnPositions[i * 3 + 2] = Math.cos(spawnPhi) * spawnDist;

      // Random delays for staggered arrival (0 to 1)
      delays[i] = Math.random();
    }

    // Cube - grid distribution
    const cubRes = 25;
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

    // Plane - grid distribution
    const planeRes = 125;
    i = 0;
    for (let x = 0; x < planeRes; x++) {
      for (let y = 0; y < planeRes; y++) {
        planePositions[i * 3] = (x / planeRes - 0.5) * 2.5;
        planePositions[i * 3 + 1] = (y / planeRes - 0.5) * 2.5;
        planePositions[i * 3 + 2] = 0;
        i++;
      }
    }

    return { spherePositions, cubePositions, planePositions, spawnPositions, delays };
  }, [count]);

  const MorphMaterial = useMemo(()=>new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uSphereMix: {value: 0.0},
      uCubeMix: {value: 0.0},
      uPlaneMix: {value: 0.0},
      uRandomMix: {value: 0.0},
      uTime: {value: 0.0},
      uArrivalProgress: {value: 0.0},
      cmap: { value: colormap}
    },
    vertexShader,
    fragmentShader
  }),[])

  // Enhanced animation with arrival and smooth transitions
  useEffect(() => {
    let tl: gsap.core.Timeline | null = null;
    
    if (MorphMaterial) {
      const uniforms = MorphMaterial.uniforms;

      tl = gsap.timeline({
        repeat: -1,
        yoyo: false,
      });
      
      const arrivalDuration = 3;
      const duration = 2.5;
      const delay = 2.5;

      // Initial arrival to sphere
      tl.to(uniforms.uArrivalProgress, {
        value: 1,
        duration: arrivalDuration,
        ease: 'power2.out',
      });

      tl.to(uniforms.uSphereMix, {
        value: 1,
        duration: arrivalDuration,
        ease: 'power2.out',
      }, "<");

      // Hold sphere
      tl.to({}, { duration: delay });

      // Morph to Cube
      tl.to([uniforms.uSphereMix, uniforms.uCubeMix], {
        value: (index) => index === 0 ? 0 : 1,
        duration,
        ease: 'power1.inOut',
      });

      // Hold cube
      tl.to({}, { duration: delay });

      // Morph to Plane
      tl.to([uniforms.uCubeMix, uniforms.uPlaneMix], {
        value: (index) => index === 0 ? 0 : 1,
        duration,
        ease: 'power1.inOut',
      });

      // Hold plane
      tl.to({}, { duration: delay });

      // Morph to Random/Dispersed state
      tl.to([uniforms.uPlaneMix, uniforms.uRandomMix], {
        value: (index) => index === 0 ? 0 : 1,
        duration,
        ease: 'power1.inOut',
      });

      // Hold random
      tl.to({}, { duration: delay });

      // Disperse back to spawn (reset arrival progress)
      tl.to(uniforms.uArrivalProgress, {
        value: 0,
        duration: duration,
        ease: 'power2.in',
      });

      // Reset shape mixes simultaneously
      tl.to([uniforms.uRandomMix, uniforms.uSphereMix], {
        value: 0,
        duration: 0.01, // Instant reset
      });
    }

    return () => {
      if (tl) {
        tl.kill();
      }
    };
  }, [MorphMaterial]);
  
  useFrame((state) => {
      if(MorphMaterial){
          MorphMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
      }
      if (pointsRef.current) {
        pointsRef.current.rotation.y += 0.0002; // Reduced from 0.001
        pointsRef.current.rotation.x += 0.0001; // Reduced from 0.001
      }
  });

  useEffect(()=>{
    if(MorphMaterial){
      MorphMaterial.uniforms.cmap.value = colormap
    }
  },[colormap])

  return (
    <points ref={pointsRef} material={MorphMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[spawnPositions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aSpawnPosition"
          args={[spawnPositions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aRandomPosition"
          args={[spawnPositions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aSpherePosition"
          args={[spherePositions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aCubePosition"
          args={[cubePositions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aPlanePosition"
          args={[planePositions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-aDelay"
          args={[delays, 1]}
          count={count}
        />
      </bufferGeometry>
    </points>
  );
};


export const LandingShapes = () =>{
  return(
    <div className='w-[100vw] h-[100vh]'>
      <Canvas
        camera={{position:[0, 0, 3]}}
      >
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          maxDistance={6}
          minDistance={2}
        />
        <MorphingPoints/>
      </Canvas>
    </div>
  )
}