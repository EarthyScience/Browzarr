import {  useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader, fragOpt, orthoVertex } from '@/components/textures/shaders';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { colorScaleToId, exprToGLSL } from '@/components/textures';
import { useShallow } from 'zustand/shallow';
import { invalidate, useFrame } from '@react-three/fiber';
import { UVCube } from '@/components/plots'
import { ColumnMeshes } from './TransectMeshes';
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { createCommonUniforms, updateCommonUniforms, useCommonPlotState } from '@/utils/plotUniforms';

interface DataCubeProps {
  volTexture: THREE.Data3DTexture[] | THREE.DataTexture[] | null,
}

export const DataCube = ({ volTexture: propVolTexture }: DataCubeProps ) => {
    const volTexture = usePaddedTextures(propVolTexture);
    const commonState = useCommonPlotState();
    const { colormap, valueScales, flipY, shape, textureArrayDepths, remapTexture,
            animProg, cOffset, cScale, nanColor, nanTransparency, fillValue, valueRange, maskTexture, maskValue,
            colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip, latBounds, lonBounds } = commonState;

    const { xRange, yRange, zRange, quality, useOrtho, useFragOpt, transparency, vTransferRange, vTransferScale } = usePlotStore(useShallow(state => ({
      xRange: state.xRange, yRange: state.yRange, zRange: state.zRange,
      quality: state.quality, useOrtho: state.useOrtho, useFragOpt: state.useFragOpt,
      transparency: state.transparency, vTransferRange: state.vTransferRange, vTransferScale: state.vTransferScale
    })))
    const meshRef = useRef<THREE.Mesh>(null!);
    const aspectRatio = shape.y/shape.x
    const timeRatio = shape.z/shape.x;
    const shaderMaterial = useMemo(()=>new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
          ...createCommonUniforms(commonState),
          modelViewMatrixInverse: { value: new THREE.Matrix4() }, // Used for Orthographic RayMarcher
          map: { value: volTexture},
          textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
          remapTexture: { value: remapTexture},
          scale: {value: shape},
          flatBounds:{value: new THREE.Vector4(-xRange[1],-xRange[0],zRange[0] * timeRatio, zRange[1] * timeRatio)},
          vertBounds:{value: new THREE.Vector2(yRange[0]*aspectRatio,yRange[1]*aspectRatio)},
          steps: { value: quality },
          transparency: {value: transparency},
          opacityMag: {value: vTransferScale},
          useClipScale: {value: vTransferRange},
      },
      defines: {
        USE_VORIGIN: 1,
        USE_VDIRECTION: 1,
        ...(remapTexture ? { REPROJECT: true } : {}),
        'CUSTOM_EXPR(val)': colorScaleToId(colorScale) === 6 ? exprToGLSL(colorScale) : '(val)',
      },
      vertexShader: useOrtho ? orthoVertex : vertexShader,
      fragmentShader: useFragOpt ?  fragOpt : fragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: useOrtho ? THREE.FrontSide : THREE.BackSide,
    }),[useFragOpt, useOrtho, volTexture, remapTexture]);

    const geometry = useMemo(() => new THREE.BoxGeometry(shape.x, shape.y, shape.z), [shape]);
    useEffect(() => {
      if (shaderMaterial) {
        updateCommonUniforms(shaderMaterial, commonState);
        const uniforms = shaderMaterial.uniforms
        uniforms.scale.value = shape;
        uniforms.flatBounds.value.set(-xRange[1], -xRange[0], zRange[0] * timeRatio, zRange[1] * timeRatio);
        uniforms.vertBounds.value.set(yRange[0] * aspectRatio, yRange[1] * aspectRatio);
        uniforms.steps.value = quality;
        uniforms.transparency.value = transparency;
        uniforms.opacityMag.value = vTransferScale;
        uniforms.useClipScale.value = vTransferRange;
        const scaleId = colorScaleToId(colorScale);
        const customDef = scaleId === 6 ? exprToGLSL(colorScale) : '(val)';
        if (shaderMaterial.defines['CUSTOM_EXPR(val)'] !== customDef) {
          shaderMaterial.defines['CUSTOM_EXPR(val)'] = customDef;
          shaderMaterial.needsUpdate = true;
        }
        invalidate(); // Needed because Won't trigger re-render if camera is stationary. 
      }
    }, [colormap, cOffset, cScale, valueRange, shape, xRange, timeRatio, yRange, aspectRatio, quality, animProg, transparency, nanTransparency, nanColor, vTransferScale, vTransferRange, fillValue, maskValue, latBounds, lonBounds, colorScale, logConstant, valueScales, lowclip, highclip, useLowclip, useHighclip]);
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