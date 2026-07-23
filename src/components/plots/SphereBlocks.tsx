import React, { useEffect, useMemo } from 'react'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { sphereBlocksFrag, sphereBlocksVert } from '../textures/shaders'
import { invalidate } from '@react-three/fiber'
import { deg2rad, getLogEps, parseColorToVec4 } from '@/utils/HelperFuncs';
import { useCoordBounds } from '@/hooks/useCoordBounds'
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { colorScaleToId, exprToGLSL } from '@/components/textures';
import { createCommonUniforms, updateCommonUniforms, useCommonPlotState } from '@/utils/plotUniforms';

const SphereBlocks = ({textures: propTextures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const textures = usePaddedTextures(propTextures);
    const commonState = useCommonPlotState();
    const { colormap, isFlat, valueScales, flipY, dataShape, textureArrayDepths, remapTexture,
            animProg, cOffset, cScale, nanColor, nanTransparency, fillValue, valueRange, maskTexture, maskValue,
            colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip, latBounds, lonBounds } = commonState;

    const { sphereDisplacement, offsetNegatives } = usePlotStore(useShallow(state => ({
        sphereDisplacement: state.displacement,
        offsetNegatives: state.offsetNegatives,
    })))

    const count = useMemo(()=>{
        const width = dataShape[dataShape.length-1];
        const height = dataShape[dataShape.length-1]/2;
        const count = width * height;
        if (count * 16 *4 > 2e9){
            useErrorStore.setState({ error:'largeArray' })
            return 0
        }
        return count
    },[dataShape])
    
    const geometry = useMemo(()=>{
        const width = dataShape[dataShape.length-1];
        const height = dataShape[dataShape.length-1]/2;
        const count = width * height;
        if (count * 16 *4 > 2e9){
            return undefined
        }
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
    },[dataShape])

    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                ...createCommonUniforms(commonState),
                map: { value: textures },
                remapTexture: { value: remapTexture },
                maskTexture: {value: maskTexture},
                textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
                displaceZero: {value: offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))},
                displacement: {value: sphereDisplacement},
            },
            defines:{
                ...(isFlat ? { IS_FLAT: true } : {}),
                ...(remapTexture ? { REPROJECT: true } : {}),
                'CUSTOM_EXPR(val)': colorScaleToId(colorScale) === 6 ? exprToGLSL(colorScale) : '(val)',
            },
            vertexShader: sphereBlocksVert,
            fragmentShader: sphereBlocksFrag,
            blending:THREE.NoBlending,
            depthWrite:true,
            depthTest:true,
        })
        return shader
    },[count, isFlat])

    useEffect(()=>{
        if (shaderMaterial){
            const uniforms = shaderMaterial.uniforms;
            uniforms.map.value = textures;
            uniforms.remapTexture.value = remapTexture;
            if (remapTexture) {
                shaderMaterial.defines.REPROJECT = true;
            } else {
                delete shaderMaterial.defines.REPROJECT;
            }
            updateCommonUniforms(shaderMaterial, commonState);
            uniforms.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
            uniforms.displacement.value = sphereDisplacement
            shaderMaterial.needsUpdate = true;
        }
        invalidate();
    },[animProg, valueScales, sphereDisplacement, colormap, cScale, cOffset, latBounds, lonBounds, valueRange, offsetNegatives, textures, remapTexture, maskValue, fillValue, colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip])

    const nanMaterial = useMemo(()=>new THREE.MeshBasicMaterial({color:nanColor}),[])
    nanMaterial.transparent = true;

    const nanSphereGeometry = useMemo(()=> new THREE.IcosahedronGeometry(1, 9),[])
    useEffect(()=>{
        if (nanMaterial ){
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
