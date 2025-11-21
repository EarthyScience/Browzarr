import React, { useEffect, useMemo, useRef } from 'react'
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import * as THREE from 'three'
import { sphereBlocksVert, sphereBlocksVertFlat, sphereBlocksFrag } from '../textures/shaders'
import { invalidate } from '@react-three/fiber'
import { deg2rad } from '@/utils/HelperFuncs'
import { useThree, useFrame } from '@react-three/fiber'

function useDepthTarget() {
  const { size } = useThree();

  return useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height);
    target.depthTexture = new THREE.DepthTexture(size.width, size.height);
    target.depthTexture.format = THREE.DepthFormat;
    target.depthTexture.type = THREE.UnsignedShortType;
    return target;
  }, [size]);
}

function DepthPass({ target, meshRef }: { target: THREE.WebGLRenderTarget, meshRef: React.RefObject<THREE.InstancedMesh>  }) {
  const { gl, scene, camera } = useThree();

  useFrame(() => {
    if (meshRef) meshRef.current.visible = true;
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(null); // reset back to default framebuffer

    if (meshRef) meshRef.current.visible = true;
  });

  return null;
}


const SphereBlocks = ({textures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const {colormap, isFlat, valueScales, 
            dataShape, textureArrayDepths} = useGlobalStore(useShallow(state=>({
        colormap: state.colormap,
        isFlat: state.isFlat,  
        valueScales: state.valueScales,
        dataShape: state.dataShape,
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
        sphereDisplacement: state.displacement,
        sphereResolution: state.sphereResolution,
        offsetNegatives: state.offsetNegatives
    })))
    const {camera, size} = useThree()
    const depthTarget = useDepthTarget();
    const count = useMemo(()=>{
        const width = dataShape[dataShape.length-1];
        const height = dataShape[dataShape.length-1]/2;
        const count = width * height;
        return count
    },[dataShape])
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const geometry = useMemo(()=>{
        const width = dataShape[dataShape.length-1];
        const height = dataShape[dataShape.length-1]/2;
        const count = width * height;
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

    const [lonBounds, latBounds] = useMemo(()=>{ //The bounds for the shader. It takes the middle point of the furthest coordinate and adds the distance to edge of pixel
        const newLatStep = latResolution/2;
        const newLonStep = lonResolution/2;
        const newLonBounds = [Math.max(lonExtent[0]-newLonStep, -180), Math.min(lonExtent[1]+newLonStep, 180)]
        const newLatBounds = [Math.max(latExtent[0]-newLatStep, -90), Math.min(latExtent[1]+newLatStep, 90)]
        return [newLonBounds, newLatBounds]
    },[latExtent, lonExtent, lonResolution, latResolution])

    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                map: { value: textures },
                depthMap: {value: depthTarget.depthTexture},
                cameraNear: {value: camera.near},
                cameraFar: {value: camera.far},
                resolution: {value: new THREE.Vector2(size.width, size.height)},
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
                displacement: {value: sphereDisplacement}
            },
            vertexShader: isFlat ? sphereBlocksVertFlat : sphereBlocksVert,
            fragmentShader: sphereBlocksFrag,
            blending: THREE.NormalBlending,
            side:THREE.DoubleSide,
            depthWrite:true,
            depthTest: true,
        })
        return shader
    },[count, isFlat])

    useEffect(()=>{
        if (shaderMaterial){
            const uniforms = shaderMaterial.uniforms;
            uniforms.map.value = textures;
            uniforms.depthMap.value = depthTarget.depthTexture;
            uniforms.animateProg.value =  animProg
            uniforms.displaceZero.value = -valueScales.minVal/(valueScales.maxVal-valueScales.minVal)
            uniforms.displacement.value = sphereDisplacement
            uniforms.cmap.value =  colormap
            uniforms.cOffset.value = cOffset
            uniforms.cScale.value = cScale
            uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
            uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
            uniforms.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
        }
        invalidate();
    },[animProg, valueScales, sphereDisplacement, colormap, cScale, cOffset, latBounds, lonBounds, offsetNegatives, textures, depthTarget])


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
        <DepthPass target={depthTarget} meshRef={meshRef as React.RefObject<THREE.InstancedMesh>}/>
        <instancedMesh 
            ref={meshRef}
            args={[geometry, shaderMaterial, count]}
            frustumCulled={false}
        />
        <mesh geometry={nanSphereGeometry} material={nanMaterial}/>
    </group>
  )
}

export {SphereBlocks}
