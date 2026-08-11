import { OrbitControls, useTexture } from '@react-three/drei';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PointCloud, DataCube, FlatMap, Sphere, CountryBorders, AxisLines, SphereBlocks, FlatBlocks, KeyFramePreviewer } from '@/components/plots';
import { Canvas, invalidate, useThree } from '@react-three/fiber';
import { CreateTexture } from '@/components/textures';
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useImageExportStore } from '@/GlobalStates/ImageExportStore';
import { useShallow } from 'zustand/shallow';
import { Navbar, Colorbar, ExportExtent, ShaderEditor, KeyFrames } from '../ui';
import AnalysisInfo from './AnalysisInfo';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import AnalysisWG from './AnalysisWG';
import ExportCanvas from '@/utils/ExportCanvas';
import { useDataFetcher } from '@/hooks/useDataFetcher';
import { reproject } from '@/components/textures/ProjectionTexture';

const TransectNotice = () =>{
  const {selectTS} = usePlotStore(useShallow(s => s))
  return (
    <>
    {selectTS && <div className="transect-notice">
      Transect Select Mode
    </div>}
    </>
  )
}

const Orbiter = ({isFlat} : {isFlat  : boolean}) =>{
  const {resetCamera, useOrtho, displaceFaces, cameraPosition, overRideCamera} = usePlotStore(useShallow(s => s))
  const {setCameraRef} = useImageExportStore(useShallow(s => s))
  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  const hasMounted = useRef(false);
  const cameraRef = useRef<THREE.Camera | null>(null)
  const {set, camera, size} = useThree()
  // Reset Camera Position and Target
  useEffect(()=>{
    /* cameraPosition from StoreInitializer is set before this component is mounted. 
    /* overRideCamera is set when Browzarr is accessed via code. On this component mount, setCameraPosition
    /* sets the cameraPosition based either on value from code or default. Then overRideCamera
    /* is disabled and reset can function normally */
    if (!hasMounted.current){
      hasMounted.current = true;
      return; // never animate on the very first mount
    }
    if (overRideCamera) return // a URL/code-driven position is pending; let the position effect handle it
    if (!orbitRef.current) return
    const controls = orbitRef.current
    let frameId: number;
    const duration = 1000; 
    const startTime = performance.now();
    const startPos = controls.object.position.clone();
    const endPos = isFlat ? new THREE.Vector3(0, 0, 5) : new THREE.Vector3(-4.5, 3, 4.5)
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
  },[resetCamera, isFlat])

  // ---- Switch from Perspective to Orthographic ---- //
  useEffect(()=>{
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
  },[useOrtho])

  // ---- Move camera to position ---- //
  useEffect(()=>{
    const cam = cameraRef.current
    const controls = orbitRef.current
    if (cam && controls){
      const wasDamping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update() //Need this extra update to clear the internal inertia buffer. Cant seem to access it in code. 
      invalidate()
      cam.position.copy(cameraPosition)
      controls.target.copy(new THREE.Vector3(0, 0, 0))
      //@ts-ignore the check means cam will have that method
      if (useOrtho) cam.updateProjectionMatrix()
      else cam.updateMatrix()
      controls.update()
      controls.enableDamping = wasDamping
      invalidate()
    }
    usePlotStore.setState({overRideCamera: false}) // Allow camera updating
  },[cameraPosition])

  return (
    <OrbitControls 
      ref={orbitRef} 
      enableRotate={!isFlat || !useOrtho || !displaceFaces} 
      enablePan={true} 
      maxDistance={50}
      minZoom={1} 
      maxZoom={3000}
    />
  );
}

const MemoOrbit = React.memo(Orbiter)

const Plot = () => {
  const {colormap, isFlat, DPR, valueScales, setIsFlat, dataShape} = useGlobalStore(useShallow(s => s))
  const {keyFrameEditor} = useImageExportStore(useShallow(s => s))
  const {plotType, displaceFaces, setPlotType} = usePlotStore(useShallow(s => s))
  const {analysisMode, useEditor} = useAnalysisStore(useShallow(s => s))
  const coords = useRef<number[]>([0,0])
  const val = useRef<number>(0)

  const [showInfo, setShowInfo] = useState<boolean>(false)
  const [loc, setLoc] = useState<number[]>([0,0])
  
  //DATA LOADING
  const {textures, show, stableMetadata, setTextures} = useDataFetcher()
  
  useEffect(()=>{
    if (analysisMode || !show) return;
    const isEffectivelyFlat = dataShape.length === 2 || (dataShape.length === 3 && dataShape.includes(1));
    if (isEffectivelyFlat && plotType != "flat" && plotType != "sphere"){
      setPlotType("flat")
      setIsFlat(true)
    } else if (!isEffectivelyFlat && plotType != "volume" && plotType != "isosurface") {
      setPlotType("volume")
      setIsFlat(false)
    }
  },[analysisMode])

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
    reproject();
  },[plotType])

  useEffect(()=>{
    const loader = new THREE.TextureLoader()
    async function SetTextures(){
      const maskTexture = await loader.loadAsync('./land_mask.webp');
      const borderTexture = await loader.loadAsync('./border_distance_sdf.png');
      usePlotStore.setState({borderTexture, maskTexture});
    }
    SetTextures()
  },[])
  
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
        {/* <KeyFramePreviewer/> */}
        <CountryBorders/>
        <ExportCanvas show={show}/>
        {show && <AxisLines />}
        {plotType == "volume" && show && 
            <DataCube volTexture={textures}/>
        }
        {plotType == "point-cloud" && show &&
          <>
            <PointCloud textures={{texture: textures as THREE.Data3DTexture[],colormap}}/>
          </> 
        }
        {plotType == "sphere" && show && 
          <>
            {displaceFaces ? <SphereBlocks textures={textures} /> : <Sphere textures={textures} /> }
          </>
        }
        <MemoOrbit isFlat={plotType == "flat"} />
        {plotType == "flat" && show && <>
          {!displaceFaces && <FlatMap textures={textures as THREE.DataTexture[] | THREE.Data3DTexture[]} infoSetters={infoSetters} /> }
          {displaceFaces && <FlatBlocks textures={textures} />}
        </>
        }

      </Canvas>
 

    </div>
  )
}

export {Plot}
