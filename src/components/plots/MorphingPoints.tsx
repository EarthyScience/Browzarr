"use client";
import { useMemo } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createMorphingMaterial } from '../textures/TSL/morphingPoints';
import './Plots.css';
import { uniformUpdater } from '../textures/TSL/utils/uniformUpdater';
import { useEffect } from 'react';
import { pointerPos } from '../textures/TSL/morphingPoints';
import { WebGPUPlacard } from '../ui/Elements/WebGPUPlacard';
const MorphingPoints = () => {
  const count = 15625; // Total number of points
  const material = useMemo(()=>createMorphingMaterial(count), [count])
  return (
	<sprite count={count} material={material}/>
  );
};

export const LandingShapes = () =>{
	const setIsWebGPU = useGlobalStore(s => s.setIsWebGPU)
	const { setMaxTextureSize, setMax3DTextureSize } = usePlotStore(useShallow(s => ({
		setMaxTextureSize: s.setMaxTextureSize, setMax3DTextureSize:s.setMax3DTextureSize
	})))
	useEffect(()=>{
		async function getLimits(){
			const adapter = await navigator.gpu.requestAdapter()
			if (adapter){
				const max2DSize = adapter.limits.maxTextureDimension2D;
				const max3DSize = adapter.limits.maxTextureDimension3D;
				setIsWebGPU(true)
				setMaxTextureSize(max2DSize); setMax3DTextureSize(max3DSize)
				return 
			} else{
				setIsWebGPU(false)
				const canvas = document.createElement('canvas')
				let gl: WebGL2RenderingContext | WebGLRenderingContext | null = canvas.getContext('webgl2')
				if (!gl) gl = canvas.getContext('webgl')
				const max2DSize = gl?.getParameter(gl.MAX_TEXTURE_SIZE)
				const max3DSize = gl instanceof WebGL2RenderingContext
					? gl.getParameter(gl.MAX_3D_TEXTURE_SIZE)
					: 0
				setMaxTextureSize(max2DSize); setMax3DTextureSize(max3DSize)
				return 
			}
		}
		getLimits()
	}, [])
  	uniformUpdater();
	return(
		<div className='w-[100vw] h-[100vh]'>
		<WebGPUPlacard />
		<Canvas
			camera={{position:[0, 0, 3]}}
			flat
			linear
			gl={async (props) => {
				const renderer = new THREE.WebGPURenderer(props as any)
				await renderer.init()
				return renderer
			}}
		>
			<MorphingPoints/>
			<mesh scale={[10,5,5]}
				onPointerMove={e=>pointerPos.value.set(e.point.x, e.point.y)}
			>
				<planeGeometry />
				<meshBasicMaterial opacity={0} color={'red'} transparent depthWrite={false} />
			</mesh>
		</Canvas>
		</div>
	)
}