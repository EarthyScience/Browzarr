import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useDimAxis } from '@/hooks';
import { invalidate, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createSphereBlocksMaterial } from '../textures/TSL/sphereBlocks';
import { resolution } from '../textures/TSL/sphereBlocks';

const SphereBlocks = () => {
    const { nanColor, nanTransparency, displacement, offsetNegatives, colorScale} = usePlotStore(useShallow(s => ({
        nanColor: s.nanColor, nanTransparency: s.nanTransparency, displacement: s.displacement, 
        offsetNegatives: s.offsetNegatives, colorScale: s.colorScale
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
        resolution.value = new THREE.Vector2(width,height);
        return count
    },[width, height])
    const geometry = useMemo(()=>{
        const sqWidth = Math.PI*2;
        const geo = new THREE.BoxGeometry(sqWidth/width, .05, sqWidth/height/2);
        return geo
    },[width, height])
    const {material, calcPositions, positions, instanceUVs} = createSphereBlocksMaterial(count)
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.count = count;
    const {gl} = useThree();
    useEffect(()=>{
        //@ts-ignore it exists but not listed in the type
        calcPositions && gl.computeAsync(calcPositions).then(()=> console.log(positions))
    },[calcPositions])

    const nanMaterial = useMemo(()=>new THREE.MeshBasicMaterial({color:nanColor, opacity:(1-nanTransparency)}),[])
    nanMaterial.transparent = true;

    const nanSphereGeometry = useMemo(()=> new THREE.IcosahedronGeometry(1, 9),[])

    useEffect(()=>{
        if (nanMaterial ){
            nanMaterial.dispose();
            nanMaterial.color.set(nanColor);
            nanMaterial.opacity = (1-nanTransparency);
            invalidate();
        }
    },[nanColor, nanTransparency])

  return (
    <group scale={[1, 1, 1]}>
        <primitive object={mesh} />
        <mesh geometry={nanSphereGeometry} material={nanMaterial}/>
    </group>
  )
}

export { SphereBlocks };

