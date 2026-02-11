import { OrbitControls } from '@react-three/drei';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PointCloud, UVCube, DataCube, FlatMap, Sphere, CountryBorders, AxisLines, SphereBlocks, FlatBlocks, KeyFramePreviewer } from '@/components/plots';
import { Canvas, invalidate, useThree } from '@react-three/fiber';
import { CreateTexture } from '@/components/textures';
import { useAnalysisStore, useGlobalStore, useImageExportStore, usePlotStore } from '@/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Navbar, Colorbar, ExportExtent, ShaderEditor, KeyFrames } from '../ui';
import AnalysisInfo from './AnalysisInfo';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import AnalysisWG from './AnalysisWG';
import ExportCanvas from '@/utils/ExportCanvas';
import { useDataFetcher } from '@/hooks/useDataFetcher';

const TransectNotice = () =>{
  const {selectTS} = usePlotStore(useShallow(state => ({selectTS: state.selectTS})))

  return (
    <>
    {selectTS && <div className="transect-notice">
      Transect Select Mode
    </div>}
    </>
  )
}

const Orbiter = ({isFlat} : {isFlat  : boolean}) =>{
  const {resetCamera, useOrtho, displaceSurface} = usePlotStore(useShallow(state => ({
      resetCamera: state.resetCamera,
      useOrtho: state.useOrtho,
      displaceSurface: state.displaceSurface
    })))
  const {setCameraRef} = useImageExportStore(useShallow(state=>({setCameraRef:state.setCameraRef})))
  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  const hasMounted = useRef(false);
  const cameraRef = useRef<THREE.Camera | null>(null)
  const {set, camera, size} = useThree()
  // Reset Camera Position and Target
  useEffect(()=>{
    if (!hasMounted.current) {
      hasMounted.current = true;
      return; // skip reset when changing between flat or not flat cameras
    }
    if (orbitRef.current){
      const controls = orbitRef.current
      let frameId: number;
      const duration = 1000; 
      const startTime = performance.now();
      const startPos = controls.object.position.clone();
      const endPos = isFlat ? new THREE.Vector3(0, 0, 5) : controls.position0.clone()

      const startTarget = controls.target.clone();
      const endTarget = controls.target0.clone()

      const startZoom = controls.object.zoom
      
      const animate = (time: number) => {
        invalidate();
        const elapsed = time - startTime;
        const t = Math.min(elapsed / duration, 1); // clamp between 0 and 1
        controls.object.position.lerpVectors(startPos, endPos, t);
        controls.target.lerpVectors(startTarget,endTarget,t)

        if (isFlat && useOrtho) {
          controls.object.zoom = THREE.MathUtils.lerp(startZoom, 50, t);
          controls.object.updateProjectionMatrix();
          controls.update()
        } 

        if (t < 1) {
          frameId = requestAnimationFrame(animate);
        }
      };

      frameId = requestAnimationFrame(animate);

      return () => cancelAnimationFrame(frameId);
    }
  },[resetCamera, isFlat])

  useEffect(()=>{
    if (hasMounted.current){
      let newCamera;
      const aspect = size.width / size.height
      if (useOrtho){
        newCamera = new THREE.OrthographicCamera()
        
        const frustumSize = 50 
        newCamera.left = -frustumSize * aspect / 2
        newCamera.right = frustumSize * aspect / 2
        newCamera.top = frustumSize / 2
        newCamera.bottom = -frustumSize / 2
        newCamera.zoom = 10;
        
        // For orthographic, use the target direction but normalize the position
        const target = orbitRef.current?.target || new THREE.Vector3(0, 0, 0)
        const direction = camera.position.clone().sub(target).normalize()
        newCamera.position.copy(target).add(direction.multiplyScalar(10)) // Fixed distance
        newCamera.lookAt(target)
        
        newCamera.updateProjectionMatrix()
      } else {
        newCamera = new THREE.PerspectiveCamera(50, aspect)
        newCamera.position.copy(camera.position.normalize().multiply(new THREE.Vector3(4, 4, 4))) // 4 seems like good distance
        newCamera.rotation.copy(camera.rotation)
      }
    cameraRef.current = newCamera
    setCameraRef(cameraRef)
    set({ camera: newCamera})
    if (orbitRef.current) {
      orbitRef.current.object = newCamera
      orbitRef.current.update()
    }
  }
  },[useOrtho])

  return (
    <OrbitControls 
      ref={orbitRef} 
      enableRotate={!isFlat || !useOrtho || !displaceSurface} 
      enablePan={true} 
      maxDistance={50}
      minZoom={1} 
      maxZoom={3000}
    />
  );
}

const Plot = () => {
  const {colormap, isFlat, DPR, valueScales, setIsFlat} = useGlobalStore(useShallow(state=>({
    colormap: state.colormap, 
    isFlat: state.isFlat, 
    DPR: state.DPR, 
    valueScales: state.valueScales,
    setIsFlat: state.setIsFlat, 
  })))
  const {keyFrameEditor} = useImageExportStore(useShallow(state => ({ keyFrameEditor:state.keyFrameEditor})))
  const {plotType, displaceSurface} = usePlotStore(useShallow(state => ({
    plotType: state.plotType,
    displaceSurface: state.displaceSurface,
  })))
  const {analysisMode, useEditor} = useAnalysisStore(useShallow(state => ({
    analysisMode: state.analysisMode,
    useEditor: state.useEditor
  })))
  const coords = useRef<number[]>([0,0])
  const val = useRef<number>(0)

  const [showInfo, setShowInfo] = useState<boolean>(false)
  const [loc, setLoc] = useState<number[]>([0,0])
  
  //DATA LOADING
  const {textures, show, stableMetadata, setTextures} = useDataFetcher()
  
  useEffect(()=>{ // Reset after analysis mode
    if(!analysisMode && show){
      const {dataShape} = useGlobalStore.getState();
      setIsFlat(dataShape.length == 2)
      const newText = CreateTexture(dataShape)
      if (newText){
        setTextures(newText)
      }
    }
  },[analysisMode])

  const infoSetters = useMemo(()=>({
    setLoc,
    setShowInfo,
    coords,
    val
  }),[])

  useEffect(()=>{ // Rotates flat back when changing away
    usePlotStore.setState({rotateFlat: false})
  },[plotType])
  
  const Nav = useMemo(()=>Navbar,[])
  return (
    <div id='main-canvas-div' className='main-canvas'
      style={{width:'100vw'}}
    >
      <ExportExtent /> 
      {keyFrameEditor && <KeyFrames />}
      <TransectNotice />
      <AnalysisWG setTexture={setTextures} />
      {show && <Colorbar units={stableMetadata?.units} metadata={stableMetadata} valueScales={valueScales}/>}
      <Nav />
      {(isFlat || plotType == "flat") && <AnalysisInfo loc={loc} show={showInfo} info={[...coords.current,val.current]}/> }
      <ShaderEditor visible={useEditor}/>
      <Canvas id='main-canvas' camera={{ position: isFlat ? [0,0,5] : [-4.5, 3, 4.5], fov: 50 }}
        frameloop={useEditor ? "never" : "demand"}
        gl={{ preserveDrawingBuffer: true }}
        dpr={[DPR,DPR]}
      >
        <KeyFramePreviewer/>
        <CountryBorders/>
        <ExportCanvas show={show}/>
        {show && <AxisLines />}
        {plotType == "volume" && show && 
          <>
            <DataCube volTexture={textures}/>
            <UVCube />
          </>
        }
        {plotType == "point-cloud" && show &&
          <>
            <PointCloud textures={{texture: textures as THREE.Data3DTexture[],colormap}}/>
          </> 
        }
        {plotType == "sphere" && show && 
          <>
            {displaceSurface ? <Sphere textures={textures} /> : <SphereBlocks textures={textures} />}
          </>
        }
        <Orbiter isFlat={plotType == "flat"} />
        {plotType == "flat" && show && <>
          {displaceSurface && <FlatMap textures={textures as THREE.DataTexture | THREE.Data3DTexture[]} infoSetters={infoSetters} /> }
          {!displaceSurface && <FlatBlocks textures={textures} />}
        </>
        }

      </Canvas>
 

    </div>
  )
}

export {Plot}
