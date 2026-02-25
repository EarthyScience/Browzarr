import {  useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader, fragOpt, orthoVertex } from '@/components/textures/shaders';
import { useGlobalStore, usePlotStore } from '@/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { invalidate, useFrame } from '@react-three/fiber';
import { deg2rad } from '@/utils/HelperFuncs';

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
      animProg, cScale, cOffset, useFragOpt, transparency, maskTexture, maskValue,
      nanTransparency, nanColor, vTransferRange, vTransferScale, fillValue, lonExtent, latExtent, 
      lonResolution, latResolution} = usePlotStore(useShallow(state => ({
      valueRange: state.valueRange, xRange: state.xRange,
      yRange: state.yRange, zRange: state.zRange,
      quality: state.quality, useOrtho: state.useOrtho,
      animProg: state.animProg, cScale: state.cScale,
      cOffset: state.cOffset, useFragOpt: state.useFragOpt,
      transparency: state.transparency,
      maskTexture: state.maskTexture,
      maskValue: state.maskValue,
      nanTransparency: state.nanTransparency,
      nanColor: state.nanColor,
      vTransferRange: state.vTransferRange,
      vTransferScale: state.vTransferScale,
      fillValue: state.fillValue,
      lonExtent: state.lonExtent,
      latExtent: state.latExtent,
      lonResolution: state.lonResolution,
      latResolution: state.latResolution,
    })))
    const meshRef = useRef<THREE.Mesh>(null!);
    const aspectRatio = shape.y/shape.x
    const timeRatio = shape.z/shape.x;
     const [lonBounds, latBounds] = useMemo(()=>{ //The bounds for the shader. It takes the middle point of the furthest coordinate and adds the distance to edge of pixel
          const newLatStep = latResolution/2;
          const newLonStep = lonResolution/2;
          const newLonBounds = [lonExtent[0]-newLonStep, lonExtent[1]+newLonStep]
          const newLatBounds = [latExtent[0]-newLatStep, latExtent[1]+newLatStep]
          return [newLonBounds, newLatBounds]
    },[latExtent, lonExtent, lonResolution, latResolution])
    console.log(lonBounds)
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
          modelViewMatrixInverse: { value: new THREE.Matrix4() }, // Used for Orthographic RayMarcher
          map: { value: volTexture },
          maskTexture: { value: maskTexture },
          maskValue: {value: maskValue },
          textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
          cmap:{value: colormap},
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
        uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
        uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
        uniforms.steps.value = quality;
        uniforms.animateProg.value = animProg;
        uniforms.transparency.value = transparency;
        uniforms.nanAlpha.value = 1 - nanTransparency;
        uniforms.nanColor.value.set(nanColor);
        uniforms.opacityMag.value = vTransferScale;
        uniforms.useClipScale.value = vTransferRange;
        uniforms.fillValue.value = fillValue;
        uniforms.maskValue.value = maskValue
        invalidate() // Needed because Won't trigger re-render if camera is stationary. 
      }
    }, [volTexture, shape, colormap, cOffset, cScale, valueRange, xRange, yRange, zRange, aspectRatio, latBounds, lonBounds, quality, animProg, transparency, nanTransparency, nanColor, maskValue, fillValue, vTransferScale, vTransferRange]);
    useFrame(({camera})=>{ // This calculates InverseModel matrix for the orthographic raymarcher
      if (!useOrtho || !meshRef.current || !shaderMaterial) return;
      meshRef.current.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, meshRef.current.matrixWorld);
      shaderMaterial.uniforms.modelViewMatrixInverse.value
          .copy(meshRef.current.modelViewMatrix)
          .invert();
    })
  return (
    <>
    <mesh ref={meshRef} geometry={geometry} scale={[1,flipY ? -1: 1,1]}>
      <primitive attach="material" object={shaderMaterial} />
    </mesh>
    </>
  )
}