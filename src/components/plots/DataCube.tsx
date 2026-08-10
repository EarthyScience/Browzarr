import {  useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader, fragOpt, orthoVertex , ddaFrag} from '@/components/textures/shaders';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { invalidate, useFrame } from '@react-three/fiber';
import { deg2rad } from '@/utils/HelperFuncs';
import { useCoordBounds } from '@/hooks/useCoordBounds';
import { UVCube } from '@/components/plots'
import { ColumnMeshes } from './TransectMeshes';
import { usePaddedTextures } from '@/hooks/usePaddedTextures';

interface DataCubeProps {
  volTexture: THREE.Data3DTexture[] | THREE.DataTexture[] | null,
}

export const DataCube = ({ volTexture: propVolTexture }: DataCubeProps ) => {
    const volTexture = usePaddedTextures(propVolTexture);
    const {shape, colormap, flipY, textureArrayDepths, remapTexture, dataShape} = useGlobalStore(useShallow(s => s)) //We have to useShallow when returning an object instead of a state. I don't fully know the logic yet
    const {
      valueRange, xRange, yRange, zRange, quality, useOrtho, interpPixels,
      animProg, cScale, cOffset, useRayMarch, transparency, maskTexture, maskValue,
      nanTransparency, nanColor, vTransferRange, vTransferScale, fillValue} = usePlotStore(useShallow(s => s))
    const meshRef = useRef<THREE.Mesh>(null!);
    const aspectRatio = shape.y/shape.x
    const timeRatio = shape.z/shape.x;
    const {lonBounds, latBounds} = useCoordBounds()
	const gridShape = useMemo(()=>{
		if (remapTexture){
			return new THREE.Vector3(remapTexture.image.width, remapTexture.image.height, dataShape[0])
		} else return new THREE.Vector3(dataShape[2], dataShape[1], dataShape[0])
		
	},[remapTexture, dataShape])
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
          modelViewMatrixInverse: { value: new THREE.Matrix4() }, // Used for Orthographic RayMarcher
          map: { value: volTexture},
          maskTexture: { value: maskTexture },
          maskValue: {value: maskValue },
          dataShape: {value: gridShape},
          textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
          cmap:{value: colormap},
          remapTexture: { value: remapTexture},
          cOffset:{value: cOffset},
          cScale: {value: cScale},
          threshold: {value: new THREE.Vector2(valueRange[0],valueRange[1])},
          scale: {value: shape},
          flatBounds:{value: new THREE.Vector4(-xRange[1],-xRange[0],zRange[0] * timeRatio, zRange[1] * timeRatio)},
          vertBounds:{value: new THREE.Vector2(yRange[0]*aspectRatio,yRange[1]*aspectRatio)},
          latBounds: {value: new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))},
          lonBounds: {value: new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))},
          steps: { value: quality },
          animateProg: {value: animProg},
          transparency: {value: transparency},
          opacityMag: {value: vTransferScale},
          useClipScale: {value: vTransferRange},
          nanAlpha: {value: 1-nanTransparency},
          nanColor: {value: new THREE.Color(nanColor)},
          fillValue: {value: fillValue?? NaN}
      },
      defines: {
        USE_VORIGIN: 1,
        USE_VDIRECTION: 1,
        ...(remapTexture ? { REPROJECT: true } : {})
      },
      vertexShader: useOrtho ? orthoVertex : vertexShader,
      fragmentShader: useRayMarch ? fragmentShader : ddaFrag,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: useOrtho ? THREE.FrontSide : THREE.BackSide,
    }),[useRayMarch, useOrtho, volTexture, remapTexture]);

    const geometry = useMemo(() => new THREE.BoxGeometry(shape.x, shape.y, shape.z), [shape]);
    useEffect(() => {
      if (shaderMaterial) {
        const uniforms = shaderMaterial.uniforms
		uniforms.dataShape.value = gridShape;
        uniforms.cmap.value = colormap;
        uniforms.cOffset.value = cOffset;
        uniforms.cScale.value = cScale;
        uniforms.threshold.value.set(valueRange[0], valueRange[1]);
        uniforms.scale.value = shape;
        uniforms.flatBounds.value.set(-xRange[1], -xRange[0], zRange[0] * timeRatio, zRange[1] * timeRatio);
        uniforms.vertBounds.value.set(yRange[0] * aspectRatio, yRange[1] * aspectRatio);
        uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
        uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
        uniforms.steps.value = quality;
        uniforms.animateProg.value = animProg;
        uniforms.transparency.value = transparency;
        uniforms.nanAlpha.value = 1 - nanTransparency;
        uniforms.nanColor.value.set(nanColor);
        uniforms.opacityMag.value = vTransferScale;
        uniforms.useClipScale.value = vTransferRange;
        uniforms.fillValue.value = fillValue?? NaN;
        uniforms.maskValue.value = maskValue
        invalidate() // Needed because Won't trigger re-render if camera is stationary. 
      }
    }, [shape, colormap, gridShape, cOffset, cScale, valueRange, xRange, yRange, zRange, aspectRatio, latBounds, lonBounds, quality, animProg, transparency, nanTransparency, nanColor, maskValue, fillValue, vTransferScale, vTransferRange]);
    useFrame(({camera})=>{ // This calculates InverseModel matrix for the orthographic raymarcher
      if (!useOrtho || !meshRef.current || !shaderMaterial) return;
      meshRef.current.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, meshRef.current.matrixWorld);
      shaderMaterial.uniforms.modelViewMatrixInverse.value
          .copy(meshRef.current.modelViewMatrix)
          .invert();
    })
  return (
    <group >
      <ColumnMeshes />
      <UVCube />  
      <mesh ref={meshRef} scale={[1,flipY ? -1 : 1,1]} geometry={geometry} material={shaderMaterial} />
    </group>
  )
}