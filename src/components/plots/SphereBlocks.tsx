import React, { useEffect, useMemo } from 'react'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { sphereBlocksFrag, sphereBlocksVert } from '../textures/shaders'
import { invalidate } from '@react-three/fiber'
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { updateCommonUniforms, useCommonUniforms } from '@/hooks/useCommonUniforms';
import { functionInjector } from '../ui/Elements/ColorAdjuster';
import { useCoordBounds, useDimAxis } from '@/hooks';
import { deg2rad } from '@/utils/HelperFuncs';
const SphereBlocks = ({textures: propTextures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const textures = usePaddedTextures(propTextures);
    const {isFlat, valueScales, remapTexture} = useGlobalStore(useShallow(s => s))
    const { nanColor, nanTransparency, displacement, offsetNegatives, colorScale} = usePlotStore(
        useShallow(s => s))
    const {xArray, yArray} = useDimAxis()
    const width = xArray.length;
    const height = yArray.length;
    const count = useMemo(()=>{
        const count = width * height;
        if (count * 16 *4 > 2e9){
            useErrorStore.setState({ error:'largeArray' })
            return 0
        }
        return count
    },[width, height])
    const geometry = useMemo(()=>{
        const sqWidth = Math.PI*2;
        const geo = new THREE.BoxGeometry(sqWidth/width, .05, sqWidth/height/2);
        const uvs = new Float32Array(count * 2);
        let idx = 0;
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                const u = (i + 0.5) / width;
                const v = (j + 0.5) / height;
                uvs[idx * 2] = u;
                uvs[idx * 2 + 1] = v;
                idx ++;
            }
        }
        geo.setAttribute(
            'instanceUV',
            new THREE.InstancedBufferAttribute(uvs, 2)
        );
        return geo
    },[count])
    
    const uniforms = useCommonUniforms()
    const {lonBounds, latBounds} = useCoordBounds()
    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                map: { value: textures },
                remapTexture: { value: remapTexture },
                displaceZero: {value: offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))},
                displacement: {value: displacement},
                widthFactor: {value: Math.abs(deg2rad(lonBounds[1])-deg2rad(lonBounds[0]))/(2.0*Math.PI)},
                vertFactor: {value: Math.abs(deg2rad(latBounds[1])-deg2rad(latBounds[0]))/(Math.PI)},
                ...uniforms
            },
            defines:{
                ...(isFlat ? { IS_FLAT: true } : {}),
                ...(remapTexture ? { REPROJECT: true } : {})
            },
            vertexShader: functionInjector(sphereBlocksVert, colorScale),
            fragmentShader: sphereBlocksFrag,
            blending:THREE.NoBlending,
            depthWrite:true,
            depthTest:true,
            side: THREE.BackSide,
        })
        return shader
    },[isFlat, colorScale, remapTexture])
    updateCommonUniforms(shaderMaterial);
    useEffect(()=>{
        if (shaderMaterial){
            const uniforms = shaderMaterial.uniforms;
            uniforms.map.value = textures;
            uniforms.displacement.value = displacement
            uniforms.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
            uniforms.widthFactor.value = Math.abs(deg2rad(lonBounds[1])-deg2rad(lonBounds[0]))/(2.0*Math.PI)
            uniforms.vertFactor.value =  Math.abs(deg2rad(latBounds[1])-deg2rad(latBounds[0]))/(Math.PI)
        }
        invalidate();
    },[valueScales, displacement, offsetNegatives, lonBounds, textures])

    const nanMaterial = useMemo(()=>new THREE.MeshBasicMaterial({color:nanColor, opacity:(1-nanTransparency)}),[])
    nanMaterial.transparent = true;

    const nanSphereGeometry = useMemo(()=> new THREE.IcosahedronGeometry(1, 9),[])

    useEffect(()=>{
        if (nanMaterial ){
            nanMaterial.dispose();
            nanMaterial.color.set(nanColor)
            nanMaterial.opacity = (1-nanTransparency)
            invalidate();
        }
    },[nanColor, nanTransparency])

  return (
    <group scale={[1, 1, 1]}>
        <instancedMesh 
            args={[geometry, shaderMaterial, count]}
            frustumCulled={false}
        />
        <mesh geometry={nanSphereGeometry} material={nanMaterial}/>
    </group>
  )
}

export {SphereBlocks}
