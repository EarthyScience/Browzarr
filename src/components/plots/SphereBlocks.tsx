import React, { useEffect, useMemo } from 'react'
import { useGlobalStore, useAnalysisStore, useZarrStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { sphereBlocksVert, sphereBlocksVertFlat, sphereBlocksFrag } from '../textures/shaders'
import { invalidate } from '@react-three/fiber'

const SphereBlocks = ({textures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const {analysisMode, analysisArray} = useAnalysisStore(useShallow(state => ({
          analysisMode: state.analysisMode,
          analysisArray: state.analysisArray
        })))
    const {colormap, isFlat, dimArrays, dimNames, dimUnits, valueScales, 
            timeSeries, dataShape, strides, flipY, textureArrayDepths} = useGlobalStore(useShallow(state=>({
        colormap: state.colormap,
        isFlat: state.isFlat,  
        dimArrays:state.dimArrays,
        dimNames:state.dimNames,
        dimUnits:state.dimUnits,
        valueScales: state.valueScales,
        timeSeries: state.timeSeries,
        dataShape: state.dataShape,
        strides: state.strides,
        flipY: state.flipY,
        textureArrayDepths: state.textureArrayDepths
    })))
    const {zSlice, ySlice, xSlice} = useZarrStore(useShallow(state => ({
                zSlice: state.zSlice,
                ySlice: state.ySlice,
                xSlice: state.xSlice
    })))
    const dimSlices = [
        dimArrays[0].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
        dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
        dimArrays.length > 2 ? dimArrays[2].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined) : [],
    ]
    const {animate, animProg, cOffset, cScale, selectTS, lonExtent, latExtent, 
        lonResolution, latResolution, nanColor, nanTransparency, sphereDisplacement, sphereResolution,
        getColorIdx, incrementColorIdx} = usePlotStore(useShallow(state=> ({
        animate: state.animate,
        animProg: state.animProg,
        cOffset: state.cOffset,
        cScale: state.cScale,
        selectTS: state.selectTS,
        lonExtent: state.lonExtent,
        latExtent: state.latExtent,
        lonResolution: state.lonResolution,
        latResolution: state.latResolution,
        nanColor: state.nanColor,
        nanTransparency: state.nanTransparency,
        sphereDisplacement: state.sphereDisplacement,
        sphereResolution: state.sphereResolution,
        getColorIdx: state.getColorIdx,
        incrementColorIdx: state.incrementColorIdx
    })))
    const count = useMemo(()=>{
        const width = dataShape[dataShape.length-1];
        const height = dataShape[dataShape.length-1];
        const count = width * height;
        return count
    },[dataShape])
    
    const geometry = useMemo(()=>{
        const width = dataShape[dataShape.length-1];
        const height = dataShape[dataShape.length-1]/2;
        const count = width * height;
        const sqWidth = 6.2;
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
                map: { value: textures },
                textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
                selectTS: {value: selectTS},
                cmap:{value: colormap},
                cOffset:{value: cOffset},
                cScale: {value: cScale},
                animateProg: {value: animProg},
                nanColor: {value: new THREE.Color(nanColor)},
                nanAlpha: {value: 1 - nanTransparency},
                displaceZero: {value: -valueScales.minVal/(valueScales.maxVal-valueScales.minVal)},
                displacement: {value: sphereDisplacement}
            },
            vertexShader: isFlat ? sphereBlocksVertFlat : sphereBlocksVert,
            fragmentShader: sphereBlocksFrag,
            blending: THREE.NormalBlending,
            side:THREE.DoubleSide,
            depthWrite:true,
        })
        return shader
    },[count, isFlat])

    useEffect(()=>{
        if (shaderMaterial){
            const uniforms = shaderMaterial.uniforms;
            uniforms.animateProg.value =  animProg
            uniforms.displaceZero.value = -valueScales.minVal/(valueScales.maxVal-valueScales.minVal)
            uniforms.displacement.value = sphereDisplacement
            uniforms.cmap.value =  colormap
            uniforms.cOffset.value = cOffset
            uniforms.cScale.value = cScale
        }
        invalidate();
    },[animProg, valueScales, sphereDisplacement, colormap, cScale, cOffset])

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
    <group scale={[1, flipY ? -1 : 1, 1]}>
        <instancedMesh 
            args={[geometry, shaderMaterial, count]}
            frustumCulled={false}
        />
        <mesh geometry={nanSphereGeometry} material={nanMaterial}/>
    </group>
  )
}

export {SphereBlocks}
