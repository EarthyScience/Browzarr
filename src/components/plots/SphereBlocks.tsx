import * as u from '@/components/textures/TSL/utils/uniforms';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useDimAxis } from '@/hooks';
import { uniformUpdater } from '@/components/textures/TSL/utils/uniformUpdater';
import { invalidate, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createSphereBlocksMaterial } from '../textures/TSL/sphereBlocks';
const SphereBlocks = () => {
    const { nanColor, nanTransparency, colorScale} = usePlotStore(useShallow(s => ({
        nanColor: s.nanColor, nanTransparency: s.nanTransparency, colorScale: s.colorScale
    })))
    const {xArray, yArray} = useDimAxis()
    const width = xArray.length;
    const height = yArray.length;
    const count = useMemo(()=>{
        const count = width * height;
        if (count * 16 *4 > 2e9){
            useErrorStore.setState({ error:'largeArray' })
            return 0
        }
        u.displacementResolution.value = new THREE.Vector2(width,height);
        return count
    },[width, height])
    const geometry = useMemo(()=>{
        const sqWidth = Math.PI*2;
        const boxHeight = 0.05;
        const geo = new THREE.BoxGeometry(sqWidth/width, boxHeight, sqWidth/height/2);
        geo.translate(0, boxHeight / 2, 0);
        return geo
    },[width, height])
    const material = useMemo(()=>createSphereBlocksMaterial(count), [count, colorScale])
    const mesh = useMemo(()=>{
        const newMesh = new THREE.Mesh(geometry, material)
        newMesh.count = count;
        newMesh.frustumCulled = false;
        return newMesh
    },[geometry, material])
    const nanMaterial = useMemo(()=>{
        const material = new THREE.MeshBasicMaterial({color:nanColor, opacity:(1-nanTransparency)})
        material.transparent = true;
        return material;
    },[])
    const nanSphereGeometry = useMemo(()=> new THREE.IcosahedronGeometry(1, 9),[])
    // --- UNIFORMS ---//
    useEffect(()=>{
        if (nanMaterial ){
            nanMaterial.color.set(nanColor);
            nanMaterial.opacity = (1-nanTransparency);
            invalidate();
        }
    },[nanColor, nanTransparency])
    uniformUpdater();
    // --- CLEANUP --- //
    useEffect(()=>()=>{ material.dispose() },[material])
    useEffect(()=>()=>{ nanMaterial.dispose() },[nanMaterial])
    useEffect(()=>()=>{ geometry.dispose() },[geometry])
    useEffect(()=>()=>{ nanSphereGeometry.dispose() },[nanSphereGeometry])
  return (
    <group scale={[1, 1, 1]}>
        <primitive object={mesh} />
        <mesh geometry={nanSphereGeometry} material={nanMaterial}/>
    </group>
  )
}

export { SphereBlocks };

