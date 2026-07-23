import React, { useEffect, useMemo } from 'react'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { flatBlocksVert, sphereBlocksFrag } from '../textures/shaders'
import { invalidate } from '@react-three/fiber'
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { useAxisIndices } from '@/hooks';
import { colorScaleToId, exprToGLSL } from '@/components/textures';

import { createCommonUniforms, updateCommonUniforms, useCommonPlotState } from '@/utils/plotUniforms';

const FlatBlocks = ({textures: propTextures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const textures = usePaddedTextures(propTextures);
    const commonState = useCommonPlotState();
    const { colormap, isFlat, valueScales, flipY, dataShape, textureArrayDepths, axisDimArrays, remapTexture,
            animProg, cOffset, cScale, nanColor, nanTransparency, fillValue, valueRange, maskTexture, maskValue,
            colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip, latBounds, lonBounds } = commonState;

    const { displacement, offsetNegatives, rotateFlat } = usePlotStore(useShallow(state => ({
        displacement: state.displacement,
        offsetNegatives: state.offsetNegatives,
        rotateFlat: state.rotateFlat,
    })))
    const {analysisMode, axis} = useAnalysisStore(useShallow(state => ({
        analysisMode: state.analysisMode, axis:state.axis
    })))
    const {xIdx, yIdx} = useAxisIndices()
    const {width, height} = useMemo(()=>{
        if (analysisMode){
            const thisShape = dataShape.filter((_val, idx) => idx != axis)
            return {width: thisShape[1], height: thisShape[0]}
        } else {
            return {width: axisDimArrays[xIdx].length, height: axisDimArrays[yIdx].length}
        }
    },[analysisMode, axis, dataShape, axisDimArrays]) 
    
    const rotateMap = analysisMode && axis == 2;
    const count = useMemo(()=>{
        const count = width * height;
        if (count * 16 *4 > 2e9){
            useErrorStore.setState({ error:'largeArray' })
            return 0
        }
        return count
    },[width, height])
    const geometry = useMemo(()=>{
            const count = width * height;
            if (count * 16 *4 > 2e9){
                return undefined
            }
            const sqWidth = 2;
            const aspect = width/height
            const geo = new THREE.BoxGeometry(sqWidth/width, sqWidth/height/aspect, .01);
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
        },[width, height])

    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                ...createCommonUniforms(commonState),
                map: { value: textures },
                remapTexture: { value: remapTexture },
                aspect: {value: width/height},
                textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
                displaceZero: {value: offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal)) },
                displacement: {value: displacement},
            },
            defines:{
                ...(isFlat ? { IS_FLAT: true } : {}),
                ...(remapTexture ? { REPROJECT: true } : {}),
                'CUSTOM_EXPR(val)': colorScaleToId(colorScale) === 6 ? exprToGLSL(colorScale) : '(val)',
            },
            vertexShader: flatBlocksVert,
            fragmentShader: sphereBlocksFrag,
            blending: THREE.NoBlending,
            depthWrite:true,
            depthTest:true,
        })
        return shader
    },[width, height, isFlat, remapTexture])

    useEffect(()=>{
        if (shaderMaterial){
            const uniforms = shaderMaterial.uniforms;
            uniforms.map.value = textures;
            updateCommonUniforms(shaderMaterial, commonState);
            uniforms.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
            uniforms.displacement.value = displacement
            uniforms.aspect.value = width/height;
        }
        invalidate();
    },[animProg, valueScales, displacement, colormap, cScale, cOffset, offsetNegatives, valueRange, textures, fillValue, analysisMode, axis, width, height, latBounds, lonBounds, maskValue, colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip])

  return (

    <instancedMesh 
        scale={[((analysisMode && axis == 2) && flipY) ? -1:  1, flipY ? -1 : ((analysisMode && axis == 2) ? -1 : 1) , 1]}
        rotation={[rotateFlat ? -Math.PI/2 : 0, 0, rotateMap ? Math.PI/2 : 0]}
        args={[geometry, shaderMaterial, count]}
        frustumCulled={false}
    />
  )
}

export {FlatBlocks}
