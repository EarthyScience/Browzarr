import React, {useEffect, useMemo} from 'react'
import * as THREE from 'three'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { useShallow } from 'zustand/shallow'
import { deg2rad, parseUVCoords } from '@/utils/HelperFuncs'
import { useCoordBounds } from '@/hooks/useCoordBounds'

function remapToXYZ(uv: THREE.Vector2, latBounds: number[], lonBounds: number[]): THREE.Vector3 {
	const u = 1 - uv.x;
	const v = uv.y;
	const lon = u * (deg2rad(lonBounds[1]) - deg2rad(lonBounds[0])) + deg2rad(lonBounds[0]);
	const lat = v * (deg2rad(latBounds[1]) - deg2rad(latBounds[0])) + deg2rad(latBounds[0]);
	return new THREE.Vector3(
		Math.cos(lat) * Math.cos(lon),
		Math.sin(lat),
		Math.cos(lat) * Math.sin(lon)
	);
}

export const SquareMeshes = () => {
	const {timeSeries, dataShape, shape} = useGlobalStore(useShallow(state=>({
		timeSeries:state.timeSeries,
		dataShape: state.dataShape,
		shape: state.shape
	})))
	const {plotType} = usePlotStore(useShallow(state=>({
		plotType: state.plotType
	})))
	const {lonBounds, latBounds} = useCoordBounds()
	const meshes: THREE.Mesh[] = useMemo(() =>{
		const meshes = []
		const dataLen = dataShape.length;
		const xSteps = dataShape[dataLen-1];
		const ySteps = dataShape[dataLen-2];
		const normedXExtent = (lonBounds[1]-lonBounds[0])/360
		const normedYExtent = (latBounds[1]-latBounds[0])/180
		const isSphere = plotType == "sphere";
		const aspect = shape.y/shape.x;
		for (const [_tsID, tsObj] of Object.entries(timeSeries)){
			const {normal, uv, color} = tsObj
			if (normal.z != 1) break; // It should never be, but just in case, flat versions only do time. Skip all of these.
			let geometry = new THREE.PlaneGeometry(1, 1)
			// Color from 0-255 to 0-1 range
			const thisColor = color.map((c: number) => Math.pow((c/255), 2.2)) // Gamma correct the color
			const material = new THREE.MeshBasicMaterial({color: new THREE.Color(...thisColor)})
			const mesh = new THREE.Mesh(geometry, material)
			let position: THREE.Vector3;
			const uvX = (Math.floor(uv.x * xSteps)+0.5)/xSteps;
			const uvY = (Math.floor(uv.y * ySteps)+0.5)/ySteps;
			if (isSphere){
				const circum = 2*Math.PI;
				const xScale = circum/xSteps * normedXExtent;
				const yScale = circum/2/ySteps * normedYExtent;
				const xScaler = Math.cos((uvY - 0.5) * Math.PI);
				position = remapToXYZ(new THREE.Vector2(uvX, uvY), latBounds, lonBounds)	
				// Rotate the plane where position is also normal vector
				mesh.lookAt(position.x*2, position.y*2, position.z*2)
				geometry.scale(xScale*xScaler, yScale, 1)
			}
			else{
				const sqScale = 2/xSteps
				const posX = (uvX-0.5)*2;
				const posY = (uvY-0.5)*2*aspect;
				position = new THREE.Vector3(posX, posY, 0.001)
				geometry.scale(sqScale,sqScale,1)
			}
			mesh.position.set(position.x, position.y, position.z)			
			meshes.push(mesh)
		}
		return meshes
	}, [timeSeries, plotType, latBounds, lonBounds])
	return (
	<>
		{meshes.map((mesh, idx) => <primitive key={idx} object={mesh}/>)}
	</>
	)
}

export const ColumnMeshes = () => {
	const {timeSeries, dataShape, shape} = useGlobalStore(useShallow(state=>({
		timeSeries:state.timeSeries,
		dataShape: state.dataShape,
		shape: state.shape
	})))
	const {plotType} = usePlotStore(useShallow(state=>({
		plotType: state.plotType
	})))
	
	const meshes: THREE.Mesh[] = useMemo(()=>{
		const meshes: THREE.Mesh[] = []
		const dataLen = dataShape.length;
		const xSteps = dataShape[dataLen-1];
		const ySteps = dataShape[dataLen-2];
		const zSteps = dataShape[dataLen-3];
		for (const [tsID, tsObj] of Object.entries(timeSeries)){
			const {normal, uv, color} = tsObj
			
			if (Math.abs(normal.z) == 1) {
				const newX = (Math.floor(newV.x * xSteps)+0.5)/xSteps;
				const newY = (Math.floor(newV.y * ySteps)+0.5)/ySteps;
			}
			
			let geometry = new THREE.BoxGeometry()

		}
		return meshes

	},[timeSeries, plotType])

	useEffect(() =>{
		const aspect = shape.y/shape.x;
		const depth = shape.z/shape.x;
	},[meshes])
  return (
	<>
		{meshes.map((mesh, idx) => <primitive key={idx} object={mesh}/>)}
	</>
  )
}
