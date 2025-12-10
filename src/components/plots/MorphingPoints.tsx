"use client";

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import fragmentShader from "@/components/textures/shaders/LandingFrag.glsl";
import vertexShader from "@/components/textures/shaders/LandingVertex.glsl";
import "./Plots.css";
import { useShallow } from "zustand/shallow";
import { useGlobalStore, usePlotStore } from "@/utils/GlobalStates";

// Define the type for our custom shader material's uniforms
type MorphMaterialType = THREE.ShaderMaterial & {
	uniforms: {
		uSphereMix: { value: number };
		uCubeMix: { value: number };
		uPlaneMix: { value: number };
		uSize: { value: number };
		uTime: { value: number };
	};
};

// Define the shader material using drei's helper

// Make the material available to extend

const MorphingPoints = () => {
	const pointsRef = useRef<THREE.Points>(null);
	const count = 15625; // Total number of points
	const { gl } = useThree();
	const { setMaxTextureSize, setMax3DTextureSize } = usePlotStore(
		useShallow((state) => ({
			setMaxTextureSize: state.setMaxTextureSize,
			setMax3DTextureSize: state.setMax3DTextureSize,
		})),
	);

	useEffect(() => {
		const context = gl.getContext();
		//@ts-expect-error This parameter does exist
		setMax3DTextureSize(context.getParameter(context.MAX_3D_TEXTURE_SIZE));
		setMaxTextureSize(context.getParameter(context.MAX_TEXTURE_SIZE));
	}, []);

	const { colormap } = useGlobalStore(
		useShallow((state) => ({
			colormap: state.colormap,
		})),
	);
	// Pre-calculate the point positions for each shape using useMemo for performance
	const { spherePositions, cubePositions, planePositions } = useMemo(() => {
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

		// --- Plane Positions (64x64 grid) ---
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

		return { spherePositions, cubePositions, planePositions };
	}, [count]);

	const MorphMaterial = useMemo(
		() =>
			new THREE.ShaderMaterial({
				glslVersion: THREE.GLSL3,
				uniforms: {
					uSphereMix: { value: 1.0 },
					uCubeMix: { value: 0.0 },
					uPlaneMix: { value: 0.0 },
					uTime: { value: 0.0 },
					cmap: { value: colormap },
				},
				vertexShader,
				fragmentShader,
			}),
		[],
	);
	// Animation effect
	useEffect(() => {
		let tl: gsap.core.Timeline | null = null;

		if (MorphMaterial) {
			const uniforms = MorphMaterial.uniforms;

			// Create a GSAP timeline for the morphing animation
			tl = gsap.timeline({
				repeat: -1, // Loop indefinitely
				yoyo: false,
			});

			const duration = 2; // Duration of each morph transition
			const delay = 3; // Time to hold each shape before morphing

			// 1. Morph from Sphere to Cube
			tl.to(uniforms.uCubeMix, {
				value: 1,
				duration,
				delay,
				ease: "power2.inOut",
			});

			// 2. Morph from Cube to Plane
			tl.to(uniforms.uCubeMix, {
				value: 0,
				duration,
				delay,
				ease: "power2.inOut",
			});
			tl.to(
				uniforms.uPlaneMix,
				{
					value: 1,
					duration,
					ease: "power2.inOut",
				},
				"<",
			); // Animate at the same time as the previous tween

			// 3. Morph from Plane back to Sphere
			tl.to(uniforms.uPlaneMix, {
				value: 0,
				duration,
				delay,
				ease: "power2.inOut",
			});
		}
		// Cleanup function - always return this
		return () => {
			if (tl) {
				tl.kill();
			}
		};
	}, []);

	// Update time uniform for the dynamic wave animation in the shader
	useFrame((state) => {
		if (MorphMaterial) {
			MorphMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
		}
		if (pointsRef.current) {
			pointsRef.current.rotation.y += 0.001; // Slow rotation around Y-axis
			pointsRef.current.rotation.x += 0.001;
		}
	});

	useEffect(() => {
		if (MorphMaterial) {
			MorphMaterial.uniforms.cmap.value = colormap;
		}
	}, [colormap]);

	return (
		<points ref={pointsRef} material={MorphMaterial}>
			<bufferGeometry>
				{/* The 'position' attribute is not used by the shader for final position,
            but it's good practice to have it. We'll use sphere positions as the base. */}
				<bufferAttribute
					attach="attributes-position"
					args={[spherePositions, 3]}
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
			</bufferGeometry>
			{/* Use the custom morphMaterial */}
		</points>
	);
};

export const LandingShapes = () => {
	return (
		<div className="w-[100vw] h-[100vh]">
			{/* <div className='landing-title'>
        Browzarr
      </div> */}
			<Canvas camera={{ position: [0, 0, 3] }}>
				<MorphingPoints />
			</Canvas>
		</div>
	);
};
