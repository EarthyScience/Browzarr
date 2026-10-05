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
import { updateCommonUniforms, useCommonUniforms } from '@/hooks/useCommonUniforms';
import { functionInjector } from '../ui/Elements/ColorAdjuster';
import { rayMarchingMaterial } from '../textures/TSL/rayMarcher';
interface DataCubeProps {
  volTexture: THREE.Data3DTexture[] | THREE.DataTexture[] | undefined,
}


export const DataCube = ({ volTexture: propVolTexture }: DataCubeProps ) => {
    const volTexture = usePaddedTextures(propVolTexture);
    const {shape, flipY, remapTexture, remapBorders, dataShape} = useGlobalStore(useShallow(s => s)) //We have to useShallow when returning an object instead of a state. I don't fully know the logic yet
    const {xRange, yRange, zRange, quality, useOrtho, useRayMarch, transparency, colorScale,
		vTransferRange, vTransferScale, revTransparency} = usePlotStore(useShallow(s => s))
    const meshRef = useRef<THREE.Mesh>(null!);
    const aspectRatio = shape.y/shape.x
    const timeRatio = shape.z/shape.x;
    const gridShape = useMemo(()=>{
		if (remapTexture){
			return new THREE.Vector3(remapTexture.image.width, remapTexture.image.height, dataShape[0])
		} else return new THREE.Vector3(dataShape[2], dataShape[1], dataShape[0])
      
    },[remapTexture, dataShape])
	const uniforms = useCommonUniforms()
  const shaderMaterial = useMemo(()=> 
    rayMarchingMaterial()
  ,[useRayMarch, useOrtho, volTexture, colorScale, remapTexture]);
	
  const geometry = useMemo(() => new THREE.BoxGeometry(shape.x, shape.y, shape.z), [shape]);
    
  return (
    <group >
      <ColumnMeshes />
      <UVCube />  
      <mesh ref={meshRef} scale={[1,flipY ? -1 : 1,1]} geometry={geometry} material={shaderMaterial} />
    </group>
  )
}