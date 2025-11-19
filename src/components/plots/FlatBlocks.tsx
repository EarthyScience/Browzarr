import React, { useEffect, useMemo } from 'react'
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { sphereBlocksFrag, flatBlocksVert, flatBlocksVert3D } from '../textures/shaders'
import { invalidate } from '@react-three/fiber'
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
    const { animProg, cOffset, cScale, nanColor, nanTransparency, displacement, offsetNegatives, rotateFlat} = usePlotStore(useShallow(state=> ({
        animate: state.animate, animProg: state.animProg, cOffset: state.cOffset,
        cScale: state.cScale, nanColor: state.nanColor, nanTransparency: state.nanTransparency,
        displacement: state.displacement, sphereResolution: state.sphereResolution,
        offsetNegatives: state.offsetNegatives, rotateFlat:state.rotateFlat
    })))

    const width = dataShape[dataShape.length-1]
    const height = dataShape[dataShape.length-2]
    const geometry = useMemo(()=>{
            const count = width * height;
            const sqWidth = 1;
            const aspect = width/height
            const geo = new THREE.BoxGeometry(sqWidth/width*aspect, sqWidth/height, .01);
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
                map: { value: textures },
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
            uniforms.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
        }
        invalidate();
    },[animProg, valueScales, displacement, colormap, cScale, cOffset, offsetNegatives, textures])

  return (

    <instancedMesh 
        scale={[1, flipY ? -1 : 1, 1]}
        rotation={[rotateFlat ? -Math.PI/2 : 0, 0, 0]}
        args={[geometry, shaderMaterial, (width * height)]}
        frustumCulled={false}
    />
  )
}

export {FlatBlocks}
