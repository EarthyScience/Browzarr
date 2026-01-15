"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import vertexShader from "@/components/textures/shaders/LandingVertex.glsl";
import fragmentShader from "@/components/textures/shaders/LandingFrag.glsl";
import "./Plots.css";
import { useGlobalStore, usePlotStore } from "@/utils/GlobalStates";
import { useShallow } from "zustand/shallow";

const COUNT = 15625;

const MorphingPoints = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const { gl } = useThree();

  const { setMaxTextureSize, setMax3DTextureSize } = usePlotStore(
    useShallow((s) => ({
      setMaxTextureSize: s.setMaxTextureSize,
      setMax3DTextureSize: s.setMax3DTextureSize,
    }))
  );

  useEffect(() => {
    const ctx = gl.getContext();
    setMaxTextureSize(ctx.getParameter(ctx.MAX_TEXTURE_SIZE));
    if (gl.capabilities.isWebGL2) {
      setMax3DTextureSize(ctx.getParameter(ctx.MAX_3D_TEXTURE_SIZE));
    }
  }, [gl, setMaxTextureSize, setMax3DTextureSize]);

  const { colormap } = useGlobalStore(
    useShallow((s) => ({ colormap: s.colormap }))
  );

  // Geometry data
  const {
    spherePositions,
    cubePositions,
    planePositions,
    spawnPositions,
    delays,
  } = useMemo(() => {
    const sphere = new Float32Array(COUNT * 3);
    const cube = new Float32Array(COUNT * 3);
    const plane = new Float32Array(COUNT * 3);
    const spawn = new Float32Array(COUNT * 3);
    const delays = new Float32Array(COUNT);

    // Sphere (Fibonacci)
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = phi * i;

      sphere[i * 3 + 0] = Math.cos(t) * r * 1.2;
      sphere[i * 3 + 1] = y * 1.2;
      sphere[i * 3 + 2] = Math.sin(t) * r * 1.2;

      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI;
      const d = 4 + Math.random() * 2;

      spawn[i * 3 + 0] = Math.sin(b) * Math.cos(a) * d;
      spawn[i * 3 + 1] = Math.sin(b) * Math.sin(a) * d;
      spawn[i * 3 + 2] = Math.cos(b) * d;

      delays[i] = Math.random();
    }

    // Cube
    const r = 25;
    let idx = 0;
    for (let x = 0; x < r; x++)
      for (let y = 0; y < r; y++)
        for (let z = 0; z < r; z++) {
          cube[idx * 3 + 0] = (x / (r - 1) - 0.5) * 2;
          cube[idx * 3 + 1] = (y / (r - 1) - 0.5) * 2;
          cube[idx * 3 + 2] = (z / (r - 1) - 0.5) * 2;
          idx++;
        }

    // Plane
    const p = 125;
    idx = 0;
    for (let x = 0; x < p; x++)
      for (let y = 0; y < p; y++) {
        plane[idx * 3 + 0] = (x / (p - 1) - 0.5) * 2.5;
        plane[idx * 3 + 1] = (y / (p - 1) - 0.5) * 2.5;
        plane[idx * 3 + 2] = 0;
        idx++;
      }

    return {
      spherePositions: sphere,
      cubePositions: cube,
      planePositions: plane,
      spawnPositions: spawn,
      delays,
    };
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uSphereMix: { value: 0 },
          uCubeMix: { value: 0 },
          uPlaneMix: { value: 0 },
          uRandomMix: { value: 0 },
          uArrivalProgress: { value: 0 },
          uHold: { value: 0 },
          uTime: { value: 0 },
          uSize: { value: 15 },
          cmap: { value: colormap },
        },
        vertexShader,
        fragmentShader,
      }),
    []
  );

  useEffect(() => {
    material.uniforms.cmap.value = colormap;
  }, [colormap, material]);

  useEffect(() => {
    const u = material.uniforms;
    const tl = gsap.timeline({ repeat: -1 });

    const arrive = 4.5;
    const morph = 2.5;
    const hold = 2.5;

    tl.to(u.uArrivalProgress, { value: 1, duration: arrive, ease: "power1.out" });
    tl.to(u.uSphereMix, { value: 1, duration: arrive }, "<");

    const addHold = () => {
      tl.to(u.uHold, { value: 1, duration: 0.01 });
      tl.to({}, { duration: hold });
      tl.to(u.uHold, { value: 0, duration: 0.01 });
    };

    addHold();

    tl.to([u.uSphereMix, u.uCubeMix], {
      value: (i) => (i === 0 ? 0 : 1),
      duration: morph,
    });

    addHold();

    tl.to([u.uCubeMix, u.uPlaneMix], {
      value: (i) => (i === 0 ? 0 : 1),
      duration: morph,
    });

    addHold();

    tl.to([u.uPlaneMix, u.uRandomMix], {
      value: (i) => (i === 0 ? 0 : 1),
      duration: morph,
    });

    addHold();

    tl.to(u.uArrivalProgress, { value: 0, duration: morph });
    tl.set([u.uRandomMix, u.uSphereMix], { value: 0 });

    return () => tl.kill();
  }, [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0002;
      pointsRef.current.rotation.x += 0.0001;
    }
  });

  return (
    <points ref={pointsRef} material={material} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[spawnPositions, 3]} />
        <bufferAttribute attach="attributes-aSpawnPosition" args={[spawnPositions, 3]} />
        <bufferAttribute attach="attributes-aRandomPosition" args={[spawnPositions, 3]} />
        <bufferAttribute attach="attributes-aSpherePosition" args={[spherePositions, 3]} />
        <bufferAttribute attach="attributes-aCubePosition" args={[cubePositions, 3]} />
        <bufferAttribute attach="attributes-aPlanePosition" args={[planePositions, 3]} />
        <bufferAttribute attach="attributes-aDelay" args={[delays, 1]} />
      </bufferGeometry>
    </points>
  );
};

export const LandingShapes = () => (
  <div className="w-[100vw] h-[100vh]">
    <Canvas camera={{ position: [0, 0, 3] }}>
      <OrbitControls minDistance={2} maxDistance={6} />
      <MorphingPoints />
    </Canvas>
  </div>
);
