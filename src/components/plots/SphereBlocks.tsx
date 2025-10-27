import React, { useEffect, useMemo, useRef } from 'react'
import { useGlobalStore, useAnalysisStore, useZarrStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { sphereBlocksVert, sphereBlocksVertFlat, sphereBlocksFrag } from '../textures/shaders'
import { invalidate } from '@react-three/fiber'
import { deg2rad } from '@/utils/HelperFuncs'
const SphereBlocks = ({textures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const {colormap, isFlat, valueScales, 
            dataShape, flipY, textureArrayDepths} = useGlobalStore(useShallow(state=>({
        colormap: state.colormap,
        isFlat: state.isFlat,  
        valueScales: state.valueScales,
        dataShape: state.dataShape,
        flipY: state.flipY,
        textureArrayDepths: state.textureArrayDepths
    })))
    const { animProg, cOffset, cScale, lonExtent, latExtent, lonResolution, latResolution, nanColor, nanTransparency, sphereDisplacement, offsetNegatives} = usePlotStore(useShallow(state=> ({
        animate: state.animate,
        animProg: state.animProg,
        cOffset: state.cOffset,
        cScale: state.cScale,
        lonExtent: state.lonExtent,
        latExtent: state.latExtent,
        lonResolution: state.lonResolution,
        latResolution: state.latResolution,
        nanColor: state.nanColor,
        nanTransparency: state.nanTransparency,
        sphereDisplacement: state.sphereDisplacement,
        sphereResolution: state.sphereResolution,
        offsetNegatives: state.offsetNegatives
    })))

    // Determine the actual dimensions from dataShape
    // Assuming dataShape is [..., dataHeight, dataWidth]
    const dataWidth = dataShape[dataShape.length - 1]; // Corresponds to 'width'
    const dataHeight = dataShape[dataShape.length - 2]; // Corresponds to 'height'

    // The number of instances to render.
    // Based on the original geometry creation, it seems only half of the height dimension is used for blocks.
    const numInstancesWidth = dataWidth;
    const numInstancesHeight = dataHeight / 2;

    const totalInstances = useMemo(() => {
        return numInstancesWidth * numInstancesHeight;
    },[dataShape])

    const instRef = useRef<THREE.InstancedMesh>(null);
    const geometry = useMemo(()=>{
        const sqWidth = 6.2; // Scaling factor for the sphere
        const geo = new THREE.BoxGeometry(sqWidth/numInstancesWidth, .05, sqWidth/numInstancesHeight/2);

        const uvs = new Float32Array(totalInstances * 2);
        let idx = 0;
        for (let i = 0; i < numInstancesWidth; i++) {
            for (let j = 0; j < numInstancesHeight; j++) {
                const u = (i + 0.5) / numInstancesWidth;
                const v = (j + 0.5) / numInstancesHeight;
                uvs[idx * 2] = u;
                uvs[idx * 2 + 1] = v;
                idx ++;
            }
        }
        console.log(uvs, totalInstances)
        geo.setAttribute(
            'instanceUV',
            new THREE.InstancedBufferAttribute(uvs, 2)
        );
        return geo
    },[totalInstances, numInstancesWidth, numInstancesHeight])

    const [lonBounds, latBounds] = useMemo(()=>{ //The bounds for the shader. It takes the middle point of the furthest coordinate and adds the distance to edge of pixel
        const newLatStep = latResolution/2;
        const newLonStep = lonResolution/2;
        const newLonBounds = [Math.max(lonExtent[0]-newLonStep, -180), Math.min(lonExtent[1]+newLonStep, 180)]
        const newLatBounds = [Math.max(latExtent[0]-newLatStep, -90), Math.min(latExtent[1]+newLatStep, 90)]
        return [newLonBounds, newLatBounds]
    },[latExtent, lonExtent, lonResolution, latResolution])

    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3, // This is a constant, no need to include `totalInstances` in dependencies
            uniforms: {
                map: { value: textures },
                textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
                latBounds: {value: new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))},
                lonBounds: {value: new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))},
                cmap:{value: colormap},
                cOffset:{value: cOffset},
                cScale: {value: cScale},
                animateProg: {value: animProg},
                nanColor: {value: new THREE.Color(nanColor)},
                nanAlpha: {value: 1 - nanTransparency},
                displaceZero: {value: offsetNegatives ? (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal)) : 0},
                displacement: {value: sphereDisplacement}
            },
            vertexShader: isFlat ? sphereBlocksVertFlat : sphereBlocksVert,
            fragmentShader: sphereBlocksFrag,
            blending: THREE.NormalBlending,
            side:THREE.DoubleSide,
            depthWrite:true,
        })
        return shader // Removed `totalInstances` as it's not used in shader definition, only in instancedMesh args.
    },[isFlat])

    useEffect(()=>{
        if (shaderMaterial){
            const uniforms = shaderMaterial.uniforms;
            uniforms.animateProg.value =  animProg
            uniforms.displaceZero.value = -valueScales.minVal/(valueScales.maxVal-valueScales.minVal)
            uniforms.displacement.value = sphereDisplacement
            uniforms.cmap.value =  colormap
            uniforms.cOffset.value = cOffset
            uniforms.cScale.value = cScale
            uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
            uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
            uniforms.displaceZero.value = offsetNegatives ? (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal)) : 0
        }
        invalidate();
    },[animProg, valueScales, sphereDisplacement, colormap, cScale, cOffset, latBounds, lonBounds, offsetNegatives ])

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

    console.log(instRef.current)
  return (
    <group scale={[1, flipY ? -1 : 1, 1]}>
        <instancedMesh 
            ref={instRef}
            args={[geometry, shaderMaterial, totalInstances]}
            frustumCulled={false}
        />
        <mesh geometry={nanSphereGeometry} material={nanMaterial}/>
    </group>
  )
}

export {SphereBlocks}
