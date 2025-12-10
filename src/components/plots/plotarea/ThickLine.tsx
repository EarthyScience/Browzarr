"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePlotStore, useGlobalStore } from "@/utils/GlobalStates";
import { useShallow } from "zustand/shallow";
import vertexShader from "@/components/textures/shaders/thickLineVert.glsl";
import { PlotPoints } from "./PlotPoints";
import { useThree } from "@react-three/fiber";
import { invalidate } from "@react-three/fiber";

function linspace(start: number, stop: number, num: number): number[] {
	const step = (stop - start) / (num - 1);
	return Array.from({ length: num }, (_, i) => start + step * i);
}

interface pointSetters {
	setPointID: React.Dispatch<React.SetStateAction<[string, number]>>;
	setPointLoc: React.Dispatch<React.SetStateAction<number[]>>;
	setShowPointInfo: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ThickLineProps {
	height: number;
	yScale: number;
	xScale: number;
	pointSetters: pointSetters;
}

const ThickLine = ({
	height,
	xScale,
	yScale,
	pointSetters,
}: ThickLineProps) => {
	const { valueScales, timeSeries, colormap } = useGlobalStore(
		useShallow((state) => ({
			valueScales: state.valueScales,
			timeSeries: state.timeSeries,
			colormap: state.colormap,
		})),
	);
	const {
		lineWidth,
		useLineColor,
		lineColor,
		showPoints,
		lineResolution,
		useCustomColor,
	} = usePlotStore(
		useShallow((state) => ({
			lineWidth: state.lineWidth,
			linePointSize: state.linePointSize,
			showPoints: state.showPoints,
			useLineColor: state.useLineColor,
			lineColor: state.lineColor,
			lineResolution: state.lineResolution,
			useCustomColor: state.useCustomColor,
		})),
	);
	const { camera } = useThree();

	const { maxVal, minVal } = valueScales;
	const materials = useMemo(() => {
		const materialObj: { [key: string]: THREE.ShaderMaterial } = {};
		Object.keys(timeSeries)
			.reverse()
			.map((val, idx) => {
				const [r, g, b] = timeSeries[val]["color"];
				materialObj[val] = new THREE.ShaderMaterial({
					glslVersion: THREE.GLSL3,
					uniforms: {
						cmap: { value: colormap },
						xScale: { value: xScale },
						yScale: { value: yScale },
						aspect: { value: window.innerWidth / window.innerHeight },
						thickness: { value: lineWidth },
						miter: { value: 1 },
						useLineColor: { value: useCustomColor },
						useMapColors: { value: useLineColor },
						lineColor: {
							value: new THREE.Color().setRGB(r / 255, g / 255, b / 255),
						},
						userColor: { value: new THREE.Color(lineColor) },
						zoom: { value: camera.zoom },
					},
					vertexShader,
					fragmentShader: `
                out vec4 Color;
                uniform sampler2D cmap;
                uniform bool useLineColor;
                uniform bool useMapColors;
                uniform vec3 lineColor;
                uniform vec3 userColor;
                varying float vNormed;

                void main() {
                    vec4 texColor = texture(cmap, vec2(vNormed, 0.1));
                    texColor.a = 1.;
                    Color = useLineColor ? vec4(userColor, 1.0) : useMapColors ? texColor : vec4(lineColor, 1.0) ;
                }
                `,
					depthWrite: false,
				});
			});
		return materialObj;
	}, [timeSeries]);

	useEffect(() => {
		if (Object.values(materials)) {
			for (const material of Object.values(materials)) {
				const uniforms = material.uniforms;
				uniforms.cmap.value = colormap;
				uniforms.xScale.value = xScale;
				uniforms.yScale.value = yScale;
				uniforms.aspect.value = window.innerWidth / window.innerHeight;
				uniforms.thickness.value = lineWidth;
				uniforms.miter.value = 1;
				uniforms.useLineColor.value = useCustomColor;
				uniforms.useMapColors.value = useLineColor;
				uniforms.userColor.value = new THREE.Color(lineColor);
				uniforms.zoom.value = camera.zoom;
				invalidate();
			}
		}
	}, [
		colormap,
		lineWidth,
		xScale,
		yScale,
		window.innerWidth,
		window.innerHeight,
		useLineColor,
		lineColor,
		camera.zoom,
		useCustomColor,
	]);

	const viewWidth = useMemo(() => window.innerWidth, [window.innerWidth]);
	const viewHeight = useMemo(
		() => window.innerHeight - height,
		[window.innerWidth, height],
	);

	const [instancePoints, setInstancePoints] = useState<
		Record<string, THREE.Vector3[]>
	>({});
	const geometries = useMemo(() => {
		const geomObj: Record<string, THREE.BufferGeometry> = {};
		const tempInstances: Record<string, THREE.Vector3[]> = {};
		Object.keys(timeSeries).map((val, idx) => {
			const tempTS = timeSeries[val]["data"] as number[];
			const normed = tempTS.map((i) => (i - minVal) / (maxVal - minVal));
			const size = tempTS.length;
			const xCoords = linspace(-viewWidth, viewWidth, size);
			const points = normed.map(
				(val, idx) =>
					new THREE.Vector3(xCoords[idx], (val - 0.5) * viewHeight, 5),
			);
			tempInstances[val] = points;
			const curve = new THREE.CatmullRomCurve3(points);
			const linePoints = curve.getPoints(points.length * lineResolution - 1);
			const interp: number[] = [];
			for (let i = 0; i < linePoints.length; i++) {
				const t = i / (linePoints.length - 1);
				const idx = t * (normed.length - 1);
				const idx0 = Math.floor(idx);
				const idx1 = Math.min(normed.length - 1, Math.ceil(idx));
				const frac = idx - idx0;
				interp.push(normed[idx0] * (1 - frac) + normed[idx1] * frac);
			}
			const numPoints = linePoints.length;

			//Create Geometry
			const positions = [];
			const directions = [];
			const previous = [];
			const next = [];
			const normValues = [];
			const indices = [];

			for (let i = 0; i < numPoints; i++) {
				const point = linePoints[i];
				const prevPoint = linePoints[Math.max(0, i - 1)];
				const nextPoint = linePoints[Math.min(numPoints - 1, i + 1)];
				// Duplicate vertices
				positions.push(...point, ...point); // [x, y, z, x, y, z]
				directions.push(1.0, -1.0);
				previous.push(...prevPoint, ...prevPoint);
				next.push(...nextPoint, ...nextPoint);
				normValues.push(interp[i], interp[i]);
			}
			// Create triangle indices
			for (let i = 0; i < numPoints - 1; i++) {
				const i0 = i * 2; // First vertex of current point (+1)
				const i1 = i0 + 1; // Second vertex of current point (-1)
				const i2 = i0 + 2; // First vertex of next point (+1)
				const i3 = i0 + 3; // Second vertex of next point (-1)
				indices.push(i0, i1, i2); // First triangle
				indices.push(i1, i3, i2); // Second triangle
			}

			// Create geometry
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute(
				"position",
				new THREE.Float32BufferAttribute(positions, 3),
			);
			geometry.setAttribute(
				"direction",
				new THREE.Float32BufferAttribute(directions, 1),
			);
			geometry.setAttribute(
				"previous",
				new THREE.Float32BufferAttribute(previous, 3),
			);
			geometry.setAttribute("next", new THREE.Float32BufferAttribute(next, 3));
			geometry.setAttribute(
				"normed",
				new THREE.Float32BufferAttribute(normValues, 1),
			);
			geometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1));
			geomObj[val] = geometry;
		});
		setInstancePoints(tempInstances);
		return geomObj;
	}, [timeSeries, lineResolution]);

	useEffect(() => {
		invalidate();
	}, [showPoints]);
	return (
		<>
			<group>
				{Object.keys(timeSeries).map((val, idx) => (
					<mesh
						key={`lineMesh_${idx}`}
						geometry={geometries[val]}
						material={materials[val]}
					/>
				))}
				{showPoints &&
					Object.keys(timeSeries).map((val, idx) => (
						<PlotPoints
							key={`plotPoints_${idx}`}
							points={instancePoints[val]}
							tsID={val}
							pointSetters={pointSetters}
							scalers={{ xScale, yScale }}
						/>
					))}
			</group>
		</>
	);
};

export { ThickLine };
