import * as su from '@/components/textures/TSL/sphereBlocks';
import * as d from '@/components/textures/TSL/utils/displacementUniforms';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useCoordBounds, useDimAxis, useValueScales } from '@/hooks';
import { uniformUpdater } from '@/hooks/useCommonUniforms';
import { invalidate, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createSphereBlocksMaterial, resolution } from '../textures/TSL/sphereBlocks';
const SphereBlocks = () => {
    const { nanColor, nanTransparency, displacement, offsetNegatives} = usePlotStore(useShallow(s => ({
        nanColor: s.nanColor, nanTransparency: s.nanTransparency, displacement: s.displacement, 
        offsetNegatives: s.offsetNegatives, colorScale: s.colorScale, 
    })))
    const valueScales = useValueScales();
    const {xArray, yArray} = useDimAxis()
    const width = xArray.length;
    const height = yArray.length;
    const count = useMemo(()=>{
        const count = width * height;
        if (count * 16 *4 > 2e9){
            useErrorStore.setState({ error:'largeArray' })
            return 0
        }
        resolution.value = new THREE.Vector2(width,height);
        return count
    },[width, height])
    const geometry = useMemo(()=>{
        const sqWidth = Math.PI*2;
        const boxHeight = 0.05;
        const geo = new THREE.BoxGeometry(sqWidth/width, boxHeight, sqWidth/height/2);
        geo.translate(0, boxHeight / 2, 0);
        return geo
    },[width, height])
    const {material, calcPositions} = createSphereBlocksMaterial(count)
    const mesh = useMemo(()=>{
        const newMesh = new THREE.Mesh(geometry, material)
        newMesh.count = count;
        newMesh.frustumCulled = false;
        return newMesh
    },[geometry, material])
    const {gl} = useThree();
    useEffect(()=>{
        //@ts-ignore it exists but not listed in the type
        calcPositions && gl.computeAsync(calcPositions)
    },[calcPositions])
    const nanMaterial = useMemo(()=>{
        const material = new THREE.MeshBasicMaterial({color:nanColor, opacity:(1-nanTransparency)})
        material.transparent = true;
        return material;
    },[])
    
    const nanSphereGeometry = useMemo(()=> new THREE.IcosahedronGeometry(1, 9),[])

    // --- UNIFORMS ---//
    useEffect(()=>{
        if (nanMaterial ){
            nanMaterial.dispose();
            nanMaterial.color.set(nanColor);
            nanMaterial.opacity = (1-nanTransparency);
            invalidate();
        }
    },[nanColor, nanTransparency])

    const {lonBounds, latBounds} = useCoordBounds()
    useEffect(()=>{
            d.displacement.value = displacement
            d.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
            su.widthFactor.value = Math.abs(lonBounds[1]-lonBounds[0])/(2.0*Math.PI)
            su.vertFactor.value =  Math.abs(latBounds[1]-latBounds[0])/(Math.PI)
    },[valueScales, displacement, offsetNegatives, lonBounds])

    uniformUpdater();
  return (
    <group scale={[1, 1, 1]}>
        <primitive object={mesh} />
        <mesh geometry={nanSphereGeometry} material={nanMaterial}/>
    </group>
  )
}

export { SphereBlocks };

