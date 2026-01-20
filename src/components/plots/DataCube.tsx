import {  useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader, fragOpt, orthoVertex } from '@/components/textures/shaders';
import { useGlobalStore, usePlotStore, usePlotTransformStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { invalidate, useFrame } from '@react-three/fiber';
import { UVCube } from './UVCube';
interface DataCubeProps {
  volTexture: THREE.Data3DTexture[] | THREE.DataTexture[] | null,
}

export const DataCube = ({ volTexture }: DataCubeProps ) => {
    const {shape, colormap, flipY, textureArrayDepths} = useGlobalStore(useShallow(state=>({
      shape:state.shape, 
      colormap:state.colormap, 
      flipY:state.flipY,
      textureArrayDepths: state.textureArrayDepths
    }))) //We have to useShallow when returning an object instead of a state. I don't fully know the logic yet
    const {
      valueRange, xRange, yRange, zRange, quality, useOrtho, 
      animProg, cScale, cOffset, useFragOpt, transparency, 
      nanTransparency, nanColor, vTransferRange, vTransferScale, fillValue} = usePlotStore(useShallow(state => ({
      valueRange: state.valueRange,
      xRange: state.xRange,
      yRange: state.yRange,
      zRange: state.zRange,
      quality: state.quality,
      useOrtho: state.useOrtho,
      animProg: state.animProg,
      cScale: state.cScale,
      cOffset: state.cOffset,
      useFragOpt: state.useFragOpt,
      transparency: state.transparency,
      nanTransparency: state.nanTransparency,
      nanColor: state.nanColor,
      vTransferRange: state.vTransferRange,
      vTransferScale: state.vTransferScale,
      fillValue: state.fillValue,
    })))
    const {rotateX, rotateZ, mirrorHorizontal, mirrorVertical} = usePlotTransformStore(useShallow(state=> ({
      rotateX: state.rotateX,
      rotateZ: state.rotateZ,
      mirrorHorizontal: state.mirrorHorizontal,
      mirrorVertical: state.mirrorVertical
    })))

    const meshRef = useRef<THREE.Mesh>(null!);
    const aspectRatio = shape.y/shape.x
    const timeRatio = shape.z/shape.x;
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
          modelViewMatrixInverse: { value: new THREE.Matrix4() }, // Used for Orthographic RayMarcher
          map: { value: volTexture },
          textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
          cmap:{value: colormap},
          cOffset:{value: cOffset},
          cScale: {value: cScale},
          threshold: {value: new THREE.Vector2(valueRange[0],valueRange[1])},
          scale: {value: shape},
          flatBounds:{value: new THREE.Vector4(-xRange[1],-xRange[0],zRange[0] * timeRatio, zRange[1] * timeRatio)},
          vertBounds:{value: new THREE.Vector2(yRange[0]*aspectRatio,yRange[1]*aspectRatio)},
          steps: { value: quality },
          animateProg: {value: animProg},
          transparency: {value: transparency},
          opacityMag: {value: vTransferScale},
          useClipScale: {value: vTransferRange},
          nanAlpha: {value: 1-nanTransparency},
          nanColor: {value: new THREE.Color(nanColor)},
          fillValue: {value: fillValue}
      },
      vertexShader: useOrtho ? orthoVertex : vertexShader,
      fragmentShader: useFragOpt ?  fragOpt : fragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: useOrtho ? THREE.FrontSide : THREE.BackSide,
    }),[useFragOpt, useOrtho]);

    const geometry = useMemo(() => new THREE.BoxGeometry(shape.x, shape.y, shape.z), [shape]);
    useEffect(() => {
      if (shaderMaterial) {
        const uniforms = shaderMaterial.uniforms
        uniforms.map.value = volTexture;
        uniforms.cmap.value = colormap;
        uniforms.cOffset.value = cOffset;
        uniforms.cScale.value = cScale;
        uniforms.threshold.value.set(valueRange[0], valueRange[1]);
        uniforms.scale.value = shape;
        uniforms.flatBounds.value.set(-xRange[1], -xRange[0], zRange[0] * timeRatio, zRange[1] * timeRatio);
        uniforms.vertBounds.value.set(yRange[0] * aspectRatio, yRange[1] * aspectRatio);
        uniforms.steps.value = quality;
        uniforms.animateProg.value = animProg;
        uniforms.transparency.value = transparency;
        uniforms.nanAlpha.value = 1 - nanTransparency;
        uniforms.nanColor.value.set(nanColor);
        uniforms.opacityMag.value = vTransferScale;
        uniforms.useClipScale.value = vTransferRange;
        uniforms.fillValue.value = fillValue;
        invalidate() // Needed because Won't trigger re-render if camera is stationary. 
      }
    }, [volTexture, shape, colormap, cOffset, cScale, valueRange, xRange, yRange, zRange, aspectRatio, quality, animProg, transparency, nanTransparency, nanColor, fillValue, vTransferScale, vTransferRange]);
    useFrame(({camera})=>{ // This calculates InverseModel matrix for the orthographic raymarcher
      if (!useOrtho || !meshRef.current || !shaderMaterial) return;
      meshRef.current.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, meshRef.current.matrixWorld);
      shaderMaterial.uniforms.modelViewMatrixInverse.value
          .copy(meshRef.current.modelViewMatrix)
          .invert();
    })
    const flipState = flipY ? -1: 1
  return (
    <group
      rotation={[rotateX * Math.PI/2, 0, -rotateZ * Math.PI/2]}
      scale={[
        mirrorHorizontal ? 1 : -1,
        mirrorVertical ? -flipState : flipState,
        1
      ]}
    >
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        material={shaderMaterial}
      />
      <UVCube />
    </group>
  )
}