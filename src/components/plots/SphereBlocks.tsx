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
const SphereBlocks = ({textures: propTextures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const textures = usePaddedTextures(propTextures);
    const {colormap, isFlat, valueScales, 
            dataShape, textureArrayDepths, flipY, remapTexture} = useGlobalStore(useShallow(state=>({
        colormap: state.colormap,
        isFlat: state.isFlat,  
        valueScales: state.valueScales,
        dataShape: state.dataShape,
        textureArrayDepths: state.textureArrayDepths, 
        flipY: state.flipY,
        remapTexture: state.remapTexture
    })))
    const { animProg, cOffset, cScale, nanColor, nanTransparency, sphereDisplacement, offsetNegatives, fillValue, valueRange, maskTexture, maskValue,
        colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip} = usePlotStore(useShallow(state=> ({
        animate: state.animate,
        animProg: state.animProg,
        cOffset: state.cOffset,
        cScale: state.cScale,
        nanColor: state.nanColor,
        nanTransparency: state.nanTransparency,
        sphereDisplacement: state.displacement,
        sphereResolution: state.sphereResolution,
        offsetNegatives: state.offsetNegatives,
        fillValue:state.fillValue,
        valueRange: state.valueRange,
        maskTexture: state.maskTexture,
        maskValue: state.maskValue,
        colorScale: state.colorScale,
        logConstant: state.logConstant,
        lowclip: state.lowclip,
        highclip: state.highclip,
        useLowclip: state.useLowclip,
        useHighclip: state.useHighclip,
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
    const {lonBounds, latBounds} = useCoordBounds()

    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                map: { value: textures },
                remapTexture: { value: remapTexture },
                maskTexture: {value: maskTexture},
                maskValue: {value: maskValue},
                threshold: {value: new THREE.Vector2(valueRange[0],valueRange[1])},
                textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
                latBounds: {value: new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))},
                lonBounds: {value: new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))},
                cmap:{value: colormap},
                cOffset:{value: cOffset},
                cScale: {value: cScale},
                animateProg: {value: animProg},
                nanColor: {value: new THREE.Color(nanColor)},
                nanAlpha: {value: 1 - nanTransparency},
                displaceZero: {value: offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))},
                displacement: {value: sphereDisplacement},
                fillValue: {value: fillValue?? NaN},
                colorScale: {value: colorScaleToId(colorScale)},
                logConstant: {value: logConstant},
                logEps: {value: getLogEps(valueScales.minVal, valueScales.maxVal, (valueScales as any).minPosVal)},
                dataRange: {value: Math.max(valueScales.maxVal - valueScales.minVal, 0.000001)},
                minVal: {value: valueScales.minVal},
                lowclip: {value: parseColorToVec4(lowclip)},
                highclip: {value: parseColorToVec4(highclip)},
                useLowclip: {value: useLowclip},
                useHighclip: {value: useHighclip},
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
            const scaleId = colorScaleToId(colorScale);
            uniforms.colorScale.value = scaleId;
            const customDef = scaleId === 6 ? exprToGLSL(colorScale) : '(val)';
            if (shaderMaterial.defines['CUSTOM_EXPR(val)'] !== customDef) {
              shaderMaterial.defines['CUSTOM_EXPR(val)'] = customDef;
              shaderMaterial.needsUpdate = true;
            }
            shaderMaterial.needsUpdate = true;
            uniforms.animateProg.value =  animProg
            uniforms.displaceZero.value = -valueScales.minVal/(valueScales.maxVal-valueScales.minVal)
            uniforms.displacement.value = sphereDisplacement
            uniforms.cmap.value =  colormap
            uniforms.cOffset.value = cOffset
            uniforms.cScale.value = cScale
            uniforms.threshold.value.set(valueRange[0], valueRange[1])
            uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
            uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
            uniforms.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
            uniforms.fillValue.value = fillValue?? NaN
            uniforms.maskValue.value = maskValue
            uniforms.logConstant.value = logConstant;
            uniforms.logEps.value = getLogEps(valueScales.minVal, valueScales.maxVal, (valueScales as any).minPosVal);
            uniforms.dataRange.value = Math.max(valueScales.maxVal - valueScales.minVal, 0.000001);
            uniforms.minVal.value = valueScales.minVal;
            uniforms.lowclip.value = parseColorToVec4(lowclip);
            uniforms.highclip.value = parseColorToVec4(highclip);
            uniforms.useLowclip.value = useLowclip;
            uniforms.useHighclip.value = useHighclip;
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
