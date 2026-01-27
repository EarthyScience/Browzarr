import React, {useRef, useMemo, useEffect, useState} from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGlobalStore, usePlotStore } from '@/GlobalStates'
import { useShallow } from 'zustand/shallow'

interface pointSetters{
  setPointID:React.Dispatch<React.SetStateAction<[string,number]>>,
  setPointLoc:React.Dispatch<React.SetStateAction<number[]>>,
  setShowPointInfo:React.Dispatch<React.SetStateAction<boolean>>,
}

function PlotPoints({ points, tsID, pointSetters, scalers }: { points: THREE.Vector3[]; tsID: string, pointSetters:pointSetters; scalers:{xScale:number,yScale:number} }) {
  const ref = useRef<THREE.InstancedMesh | null>(null);
  const count = points.length;
  const lastID = useRef<number | null>(null);
  const [_reRender,setreRender] = useState<boolean>(false);
  const {setPointID, setPointLoc,setShowPointInfo} = pointSetters;
  const [zoom,setZoom] = useState<number>(1);
  const {pointColor, pointSize, useCustomPointColor} = usePlotStore(useShallow(state => ({
    pointColor: state.pointColor, 
    pointSize: state.linePointSize, 
    showPoints: state.showPoints, 
    useCustomPointColor: state.useCustomPointColor
  })))
  const {xScale, yScale} = scalers;
  const {timeSeries} = useGlobalStore(useShallow(state =>({
    timeSeries: state.timeSeries
  })))
  const [r, g, b] = timeSeries[tsID]['color']
  const geometry = useMemo(() => new THREE.SphereGeometry(pointSize), [pointSize])
  const material = useMemo(()=> new THREE.MeshBasicMaterial({color: new THREE.Color().setRGB(r/300, g/300, b/300).convertSRGBToLinear()}),[pointColor, useCustomPointColor, timeSeries])  // It was converting to sRGB colorspace while the line shader uses linear

  useEffect(() => {
    if (ref.current){
      const dummy = new THREE.Object3D()
      for (let i = 0 ; i< count; i++){
        const position = points[i].toArray()
        dummy.position.set(position[0]*(xScale/2), position[1]*yScale, 1)
        // Apply both zoom scaling and data scaling to the instance matrix
        dummy.scale.set(pointSize/zoom, pointSize/zoom, pointSize/zoom)
        dummy.updateMatrix()
        ref.current.setMatrixAt(i, dummy.matrix)
      }
      ref.current.instanceMatrix.needsUpdate = true
      ref.current.computeBoundingSphere();
    }
  }, [points, zoom, geometry, material, xScale, yScale, pointSize]) // Add xScale, yScale as dependencies

  useFrame(({camera})=>{
    if (camera.zoom !== zoom){
      setZoom(camera.zoom)
    }
  })

  function scalePoint(e: any) {
    if (ref.current) {
      const thisID = e.instanceId;
      const dummy = new THREE.Object3D();
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      if (thisID != lastID.current && lastID.current){ //Revert last big point to small
        ref.current.getMatrixAt(lastID.current, matrix);
        position.setFromMatrixPosition(matrix)
        dummy.scale.set(pointSize/zoom, pointSize/zoom, pointSize/zoom)
        dummy.position.copy(position)
        dummy.updateMatrix()
        ref.current.setMatrixAt(lastID.current,dummy.matrix)
      }
      lastID.current = thisID;
      ref.current.getMatrixAt(thisID, matrix);
      position.setFromMatrixPosition(matrix);
      // Apply hover scale with data scaling
      dummy.scale.set(3 * pointSize/zoom, 3 * pointSize/zoom, 3/zoom);
      dummy.position.copy(position);
      dummy.updateMatrix();
      ref.current.setMatrixAt(e.instanceId, dummy.matrix);
      ref.current.instanceMatrix.needsUpdate = true;
      setreRender((x) => !x);
      setPointID([tsID, e.instanceId])
      setPointLoc([e.clientX,e.clientY])
      setShowPointInfo(true)
    }
  }

  function restorePoint(e: any){
    const exitID = e.instanceId;
    if (ref.current){
      const dummy = new THREE.Object3D();
      const matrix = new THREE.Matrix4()
      const position = new THREE.Vector3()
      if (lastID.current){
        ref.current.getMatrixAt(exitID,matrix)
        position.setFromMatrixPosition(matrix)
        // Restore normal scale with data scaling
        dummy.scale.set(pointSize/zoom, pointSize/zoom, pointSize/zoom)
        dummy.position.copy(position)
        dummy.updateMatrix()
        ref.current.setMatrixAt(exitID,dummy.matrix)
        ref.current.instanceMatrix.needsUpdate = true
        setreRender(x=>!x)
        const check = exitID == lastID.current;
        setShowPointInfo(check ? false : true)
      }
    }
  }

  return (
    <>
    <mesh position={[0, 0, 5]} onPointerEnter={scalePoint} onPointerLeave={restorePoint}>
      <instancedMesh ref={ref} args={[geometry, material, count]} />
    </mesh>
    </>
    )
  }

export {PlotPoints}
