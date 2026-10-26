"use client";

import { createPlotLineMaterial, lu } from '@/gpu/tsl/line';
import { useValueScales } from '@/hooks';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useGraphStore } from '@/stores/GraphStore';
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { PlotPoints } from './PlotPoints';

function linspace(start: number, stop: number, num: number): number[] {
    const step = (stop - start) / (num - 1);
    return Array.from({ length: num }, (_, i) => start + step * i);
  }

interface pointSetters{
  setPointID:React.Dispatch<React.SetStateAction<[string, number]>>,
  setPointLoc:React.Dispatch<React.SetStateAction<number[]>>,
  setShowPointInfo:React.Dispatch<React.SetStateAction<boolean>>,
}

interface ThickLineProps {
	height: number;
	yScale: number,
  	xScale: number,
	pointSetters: pointSetters
}

const ThickLine = ({height, xScale, yScale, pointSetters} : ThickLineProps) => {
  const timeSeries = useGlobalStore(s => s.timeSeries);
  const {lineWidth, useLineColor, lineColor, showPoints, lineResolution, useCustomColor} = useGraphStore(useShallow(s => s));
  const {maxVal, minVal} = useValueScales();
  const material = useMemo(()=>createPlotLineMaterial(),[])

  useEffect(()=>{
    lu.xScale.value = xScale
    lu.yScale.value = yScale
    lu.thickness.value = lineWidth
    lu.useLineColor.value = useCustomColor
    lu.useMapColors.value = useLineColor
    lu.userColor.value = new THREE.Color(lineColor)
  },[lineWidth, xScale, yScale, useLineColor, useCustomColor, lineColor])

  const viewWidth = useMemo(()=>window.innerWidth,[window.innerWidth])
  const viewHeight = useMemo(()=>window.innerHeight - height, [window.innerWidth, height])

  const {geometries, instancePoints, instanceVals} = useMemo(()=>{
  const geomObj: Record<string, THREE.BufferGeometry> = {}
  const tempInstances: Record<string, THREE.Vector3[]> = {}
	const instanceVals: Record<string, number[]> = {}
    Object.keys(timeSeries).map((val, idx)=>{ 
      const tempTS = timeSeries[val]['data'] as number[]
      const normed = tempTS.map((i) => (i - minVal) / (maxVal - minVal))
	    instanceVals[val] = normed
      const size = tempTS.length;
      const xCoords = linspace(-viewWidth,viewWidth,size)
      const points = normed.map((val,idx) => new THREE.Vector3(xCoords[idx], (val-.5)*viewHeight, 5));
      tempInstances[val] = points;
      const curve = new THREE.CatmullRomCurve3(points);
      const linePoints = curve.getPoints(points.length*lineResolution-1)
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
      const normValues = []
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
          const i0 = i * 2;     // First vertex of current point (+1)
          const i1 = i0 + 1;    // Second vertex of current point (-1)
          const i2 = i0 + 2;    // First vertex of next point (+1)
          const i3 = i0 + 3;    // Second vertex of next point (-1)
          indices.push(i0, i1, i2); // First triangle
          indices.push(i1, i3, i2); // Second triangle
      }

      // Create geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('direction', new THREE.Float32BufferAttribute(directions, 1));
      geometry.setAttribute('previous', new THREE.Float32BufferAttribute(previous, 3));
      geometry.setAttribute('next', new THREE.Float32BufferAttribute(next, 3));
      geometry.setAttribute('normed', new THREE.Float32BufferAttribute(normValues, 1));
      geometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1));
      geomObj[val] = geometry
    })
    return {geometries:geomObj, instancePoints:tempInstances, instanceVals }
  },[timeSeries, lineResolution, minVal, maxVal, viewWidth, viewHeight]) 

  // --- CLEANUP --- //
  useEffect(()=> {return ()=>material.dispose() },[material])
  useEffect(()=> {return ()=>Object.values(geometries).forEach(g => g.dispose()) },[geometries])
  return (
    <>
		<group>
      {Object.keys(timeSeries).map((val, idx)=>(
        <mesh key={`lineMesh_${idx}`} 
          geometry={geometries[val]} 
          material={material} 
          userData={{lineColor: new THREE.Vector3(...timeSeries[val].color)}}
        />))}
      {showPoints && Object.keys(timeSeries).map((val, idx)=> 
        <PlotPoints key={`plotPoints_${idx}`} points={instancePoints[val]} tsID={val} instanceVals={instanceVals[val]} pointSetters={pointSetters} scalers={{xScale,yScale}}/>
      )}
      <mesh>
        <boxGeometry />
        <meshNormalMaterial />
      </mesh>
		</group>
		</>
  )
}

export { ThickLine };

