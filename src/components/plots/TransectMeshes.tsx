import React, {useMemo} from 'react'
import * as THREE from 'three'
import { usePlotStore } from '@/GlobalStates/PlotStore'
import { useGlobalStore } from '@/GlobalStates/GlobalStore'
import { useShallow } from 'zustand/shallow'
import { deg2rad } from '@/utils/HelperFuncs'
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
		const circum = 2*Math.PI;
		const dataLen = dataShape.length;
		const xSteps = dataShape[dataLen-1];
		const ySteps = dataShape[dataLen-2];
		const normedXExtent = (lonBounds[1]-lonBounds[0])/360
		const normedYExtent = (latBounds[1]-latBounds[0])/180
		const yScale = circum/2/ySteps * normedYExtent;
		const isSphere = plotType == "sphere";
		let xScale = circum/xSteps * normedXExtent;
		const aspect = shape.x/shape.y;

		for (const [tsID, tsObj] of Object.entries(timeSeries)){
			const {normal, uv, color} = tsObj
			if (normal.z != 1) break; // Flat versions only do time. Skip all of these.
			let geometry = new THREE.PlaneGeometry(xScale, yScale)
			// Color from 0-255 to 0-1 range
			const thisColor = color.map((c: number) => Math.pow((c/255), 2.2)) // Gamma correct the color for better visibility
			const material = new THREE.MeshBasicMaterial({color: new THREE.Color(...thisColor)})
			const mesh = new THREE.Mesh(geometry, material)
			let position: THREE.Vector3;
			const uvX = (Math.floor(uv.x * xSteps)+0.5)/xSteps;
			const uvY = (Math.floor(uv.y * ySteps)+0.5)/ySteps;
			if (isSphere){
				const xScaler = Math.cos((uvY - 0.5) * Math.PI);
				position = remapToXYZ(new THREE.Vector2(uvX, uvY), latBounds, lonBounds)	
				// Rotate the plane where position is also normal vector
				mesh.lookAt(position.x*2, position.y*2, position.z*2)
				geometry.scale(xScaler, 1, 1)
			}
			else{
				const posX = (uvX-0.5)*2;
				const posY = (uvY-0.5)*aspect/2;
				position = new THREE.Vector3(posX, posY, 0.1)
				geometry.scale(0.25,0.25,1)
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
  return (
    <div>TransectMeshes</div>
  )
}
