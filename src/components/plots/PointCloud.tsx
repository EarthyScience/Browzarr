import * as u from '@/components/textures/TSL/utils/uniforms';
import { uniformUpdater } from '@/components/textures/TSL/utils/uniformUpdater';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createPointMaterial } from '../textures/TSL/points';
import { ColumnMeshes } from './TransectMeshes';
import { UVCube } from './UVCube';

const MappingCube = () =>{
  const {dataShape, shape} = useGlobalStore(useShallow(s => s))
  const timeScale = usePlotStore(s => s.timeScale)
  const globalScale = dataShape[2]/100
  const offset = 1/100; //I don't really understand that. But the cube is off by one pixel in each dimension
  const depthRatio = useMemo(()=> (shape && shape.x > 0 ? (shape.z / shape.x) * timeScale * 2: 1),[shape, timeScale]);
  const shapeRatio = useMemo(()=>dataShape[1]/dataShape[2], [dataShape])
  return(
    <group position={[-offset, -offset, -offset]}>
      <UVCube scale={new THREE.Vector3(2*globalScale, 2*shapeRatio*globalScale, 2*depthRatio*globalScale)} />
    </group>
  )
}

export const PointCloud = ( )=>{
    const { flipY, dataShape, remapTexture, shape, textureData, bivariate } = useGlobalStore(useShallow(s => ({
        flipY: s.flipY, dataShape: s.dataShape, remapTexture: s.remapTexture, shape: s.shape, 
        textureData: s.textureData, bivariate: s.bivariate
    })))
    const { colorScale, xRange, yRange, zRange} = usePlotStore(useShallow(s => ({
        colorScale: s.colorScale, xRange: s.xRange, yRange: s.yRange, zRange: s.zRange
    })))
    // --- INITIALIZE --- //
    const globalscale = dataShape[2]/100
    const count = dataShape.reduce((a, b) => a * b , 1)
    const {material, updateValues} = useMemo(() => {
      u.pointShape.value = new THREE.Vector3(...dataShape)
      return createPointMaterial(bivariate ? count*2 : count)
    },[count, colorScale])
    useEffect(()=>{
      textureData && updateValues(textureData as Uint8Array)
    },[textureData, updateValues])

    // --- UNIFORMS ---//
    uniformUpdater();
    // Unique scaling for points
    useEffect(()=>{
        u.volumeScale.value = shape;
        u.flatBounds.value = new THREE.Vector4(-xRange[1],-xRange[0],zRange[0], zRange[1]);
        u.vertBounds.value = flipY 
              ? new THREE.Vector2(yRange[0],yRange[1])
              : new THREE.Vector2(yRange[0],yRange[1]);
        u.dataShape.value = remapTexture 
          ? new THREE.Vector3(remapTexture.image.width, remapTexture.image.height, dataShape[0])
          : new THREE.Vector3(dataShape[2], dataShape[1], dataShape[0])
      },[shape, xRange, yRange, zRange, dataShape, flipY, remapTexture])
  return (
    <group>
      <group scale={[globalscale,globalscale,2*globalscale]}>
        <ColumnMeshes />
      </group>
      <group scale={[1, (flipY && !remapTexture) ? -1 : 1, 1]}>
        <sprite count={count} material={material} />
      </group>
      <MappingCube/>
    </group>

  );
  }