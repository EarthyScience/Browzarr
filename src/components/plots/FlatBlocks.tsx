import React, { useEffect, useMemo } from 'react'
import { useAnalysisStore, useErrorStore, useGlobalStore, usePlotStore } from '@/GlobalStates'
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { sphereBlocksFrag, flatBlocksVert, flatBlocksVert3D } from '../textures/shaders'
import { invalidate } from '@react-three/fiber'
import { deg2rad } from '@/utils/HelperFuncs'
import { useCoordBounds } from '@/hooks/useCoordBounds'

const FlatBlocks = ({textures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const {colormap, isFlat, valueScales, flipY,
            dataShape, textureArrayDepths} = useGlobalStore(useShallow(state=>({
        colormap: state.colormap,
        isFlat: state.isFlat,  
        valueScales: state.valueScales,
        flipY: state.flipY,
        dataShape: state.dataShape,
        textureArrayDepths: state.textureArrayDepths
    })))
    const { animProg, cOffset, cScale, nanColor, nanTransparency, displacement, offsetNegatives, rotateFlat, maskTexture, maskValue,
        } = usePlotStore(useShallow(state=> ({
        animate: state.animate, animProg: state.animProg, cOffset: state.cOffset,
        cScale: state.cScale, nanColor: state.nanColor, nanTransparency: state.nanTransparency,
        displacement: state.displacement, sphereResolution: state.sphereResolution,
        offsetNegatives: state.offsetNegatives, rotateFlat:state.rotateFlat,
        maskTexture:state.maskTexture, maskValue:state.maskValue,
    })))
    const {analysisMode, axis} = useAnalysisStore(useShallow(state => ({
        analysisMode: state.analysisMode, axis:state.axis
    })))
    const {width, height} = useMemo(()=>{
        if (dataShape.length == 2){
            return {width: dataShape[1], height: dataShape[0]}
        } else if (analysisMode){
            const thisShape = dataShape.filter((_val, idx) => idx != axis)
            return {width: thisShape[1], height: thisShape[0]}
        } else {
            return {width: dataShape[2], height: dataShape[1]}
        }
    },[analysisMode, axis, dataShape]) 
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
    const {lonBounds, latBounds} = useCoordBounds()

    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                map: { value: textures },
                maskTexture: {value: maskTexture},
                maskValue: {value: maskValue},
                latBounds: {value: new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))},
                lonBounds: {value: new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))},
                aspect: {value: width/height},
                textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
                cmap:{value: colormap},
                cOffset:{value: cOffset},
                cScale: {value: cScale},
                animateProg: {value: animProg},
                nanColor: {value: new THREE.Color(nanColor)},
                nanAlpha: {value: 1 - nanTransparency},
                displaceZero: {value: offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal)) },
                displacement: {value: displacement}
            },
            vertexShader: isFlat ? flatBlocksVert : flatBlocksVert3D,
            fragmentShader: sphereBlocksFrag,
            blending: THREE.NormalBlending,
            side:THREE.DoubleSide,
            depthWrite:true,
        })
        return shader
    },[width, height, isFlat])

    useEffect(()=>{
        if (shaderMaterial){
            const uniforms = shaderMaterial.uniforms;
            uniforms.map.value = textures;
            uniforms.animateProg.value =  animProg
            uniforms.displaceZero.value = -valueScales.minVal/(valueScales.maxVal-valueScales.minVal)
            uniforms.displacement.value = displacement
            uniforms.cmap.value =  colormap
            uniforms.cOffset.value = cOffset
            uniforms.cScale.value = cScale
            uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
            uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
            uniforms.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
            uniforms.aspect.value = width/height;
            uniforms.maskValue.value = maskValue
        }
        invalidate();
    },[animProg, valueScales, displacement, colormap, cScale, cOffset, offsetNegatives, textures, analysisMode, axis, width, height, latBounds, lonBounds, maskValue])

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
