import {  useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three/webgpu'
import { vertexShader, rayMarchFrag, orthoVertex , ddaFrag} from '@/components/textures/shaders';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { invalidate, useFrame } from '@react-three/fiber';
import { UVCube } from '@/components/plots'
import { ColumnMeshes } from './TransectMeshes';
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { uniformUpdater, updateCommonUniforms, useCommonUniforms } from '@/hooks/useCommonUniforms';
import * as vu from '@/components/textures/TSL/utils/volumeUniforms'
import { createDDAMaterial } from '../textures/TSL/dda';
interface DataCubeProps {
  volTexture: THREE.Data3DTexture[] | THREE.DataTexture[] | undefined,
}


export const DataCube = ({ volTexture: propVolTexture }: DataCubeProps ) => {
    const {shape, flipY, remapTexture, remapBorders, dataShape} = useGlobalStore(useShallow(s => s)) //We have to useShallow when returning an object instead of a state. I don't fully know the logic yet
    const {xRange, yRange, zRange, quality, useOrtho, useRayMarch, transparency, colorScale,
		vTransferRange, vTransferScale, revTransparency} = usePlotStore(useShallow(s => s))
    const meshRef = useRef<THREE.Mesh>(null!);
    
  	const shaderMaterial = createDDAMaterial();
  	const geometry = useMemo(() => new THREE.BoxGeometry(shape.x, shape.y, shape.z), [shape]);

  	const aspectRatio = shape.y/shape.x
	const timeRatio = shape.z/shape.x;
  useEffect(()=>{
    vu.scale.value = shape;
    vu.flatBounds.value = new THREE.Vector4(-xRange[1],-xRange[0],zRange[0] * timeRatio, zRange[1] * timeRatio);
    vu.vertBounds.value = flipY 
				? new THREE.Vector2(yRange[0]*aspectRatio,yRange[1]*aspectRatio)
				: new THREE.Vector2(yRange[0]*aspectRatio,yRange[1]*aspectRatio);
    vu.transparency.value = transparency;
    vu.dataShape.value = new THREE.Vector3(dataShape[2], dataShape[1], dataShape[0]);
	vu.opacityMag.value = vTransferScale;
	vu.steps.value = quality;
	vu.revTransparency.value = revTransparency;

  },[shape, transparency, xRange, yRange, zRange, dataShape, vTransferScale, revTransparency])
  useEffect(()=>{
      vu.dataShape.value = remapTexture 
        ? new THREE.Vector3(remapTexture.image.width, remapTexture.image.height, dataShape[0])
        : new THREE.Vector3(dataShape[2], dataShape[1], dataShape[0])
  },[remapTexture, dataShape])
  uniformUpdater();
    // export const scale = uniform(vec3());
    // export const steps = uniform(int());
    // export const flatBounds = uniform(vec4());
    // export const vertBounds = uniform(vec2());
    // export const transparency = uniform(float());
    // export const opacityMag = uniform(float());
    // export const useClipScale = uniform(bool());
    // export const revTransparency = uniform(bool());
    // export const dataShape = uniform(vec3())
  return (
    <group >
      <ColumnMeshes />
      <UVCube />  
      <mesh ref={meshRef} scale={[1,flipY ? -1 : 1,1]} geometry={geometry} material={shaderMaterial} />
    </group>
  )
}