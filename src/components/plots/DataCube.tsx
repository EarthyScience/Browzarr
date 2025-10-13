import {  useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader, fragOpt } from '@/components/textures/shaders';
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { invalidate } from '@react-three/fiber';

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
      valueRange, xRange, yRange, zRange, quality, 
      animProg, cScale, cOffset, useFragOpt, transparency, 
      nanTransparency, nanColor, vTransferRange, vTransferScale} = usePlotStore(useShallow(state => ({
      valueRange: state.valueRange,
      xRange: state.xRange,
      yRange: state.yRange,
      zRange: state.zRange,
      quality: state.quality,
      animProg: state.animProg,
      cScale: state.cScale,
      cOffset: state.cOffset,
      useFragOpt: state.useFragOpt,
      transparency: state.transparency,
      nanTransparency: state.nanTransparency,
      nanColor: state.nanColor,
      vTransferRange: state.vTransferRange,
      vTransferScale: state.vTransferScale,
    })))
    const aspectRatio = shape.y/shape.x
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
          map: { value: volTexture },
          textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
          cmap:{value: colormap},
          cOffset:{value: cOffset},
          cScale: {value: cScale},
          threshold: {value: new THREE.Vector2(valueRange[0],valueRange[1])},
          scale: {value: shape},
          flatBounds:{value: new THREE.Vector4(-xRange[1],-xRange[0],zRange[0],zRange[1])},
          vertBounds:{value: new THREE.Vector2(yRange[0]*aspectRatio,yRange[1]*aspectRatio)},
          steps: { value: quality },
          animateProg: {value: animProg},
          transparency: {value: transparency},
          opacityMag: {value: vTransferScale},
          useClipScale: {value: vTransferRange},
          nanAlpha: {value: 1-nanTransparency},
          nanColor: {value: new THREE.Color(nanColor)}
      },
      vertexShader,
      fragmentShader: useFragOpt ?  fragOpt : fragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.BackSide,
    }),[useFragOpt]);
  // Use geometry once, avoid recreating -- Using a sphere to avoid the weird angles you get with cube
    const geometry = useMemo(() => new THREE.IcosahedronGeometry(12, 4), []);
    useEffect(() => {
      if (shaderMaterial) {
        const uniforms = shaderMaterial.uniforms
        uniforms.map.value = volTexture;
        uniforms.cmap.value = colormap;
        uniforms.cOffset.value = cOffset;
        uniforms.cScale.value = cScale;
        uniforms.threshold.value.set(valueRange[0], valueRange[1]);
        uniforms.scale.value = shape;
        uniforms.flatBounds.value.set(-xRange[1], -xRange[0], zRange[0], zRange[1]);
        uniforms.vertBounds.value.set(yRange[0] * aspectRatio, yRange[1] * aspectRatio);
        uniforms.steps.value = quality;
        uniforms.animateProg.value = animProg;
        uniforms.transparency.value = transparency;
        uniforms.nanAlpha.value = 1 - nanTransparency;
        uniforms.nanColor.value.set(nanColor);
        uniforms.opacityMag.value = vTransferScale;
        uniforms.useClipScale.value = vTransferRange;
        invalidate() // Needed because Won't trigger re-render if camera is stationary. 
      }
    }, [volTexture, shape, colormap, cOffset, cScale, valueRange, xRange, yRange, zRange, aspectRatio, quality, animProg, transparency, nanTransparency, nanColor, vTransferScale, vTransferRange]);
  
  return (
    <>
    <mesh geometry={geometry} scale={[1,flipY ? -1: 1,1]}>
      <primitive attach="material" object={shaderMaterial} />
    </mesh>
    </>
  )
}