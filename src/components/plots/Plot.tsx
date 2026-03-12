import { OrbitControls, useTexture } from '@react-three/drei';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PointCloud, UVCube, DataCube, FlatMap, Sphere, CountryBorders, AxisLines, SphereBlocks, FlatBlocks, KeyFramePreviewer } from '@/components/plots';
import { Canvas, invalidate, useThree, useLoader } from '@react-three/fiber';
import { CreateTexture } from '@/components/textures';
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useImageExportStore } from '@/GlobalStates/ImageExportStore';
import { usePlotTransformStore } from '@/GlobalStates/PlotTransformStore';
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
  const {resetCamera, useOrtho, displaceSurface, cameraPosition} = usePlotStore(useShallow(state => ({
      resetCamera: state.resetCamera,
      useOrtho: state.useOrtho,
      displaceSurface: state.displaceSurface,
      cameraPosition:state.cameraPosition
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
  },[cameraPosition])

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
  
  const {colormap, isFlat, DPR, valueScales, dimNames, dimUnits, dimArrays, dataShape, setIsFlat} = useGlobalStore(useShallow(state=>({
    colormap: state.colormap, 
    isFlat: state.isFlat, 
    DPR: state.DPR, 
    valueScales: state.valueScales,
    dimNames: state.dimNames, dimUnits: state.dimUnits, dimArrays: state.dimArrays, dataShape: state.dataShape,
    setIsFlat: state.setIsFlat, 
  })))
  const {setAxisDimArrays, setAxisDimNames, setAxisDimUnits, setAxisOrder, setAxisShape, setAxisFlipped} = useGlobalStore(useShallow(state => ({
    setAxisDimArrays: state.setAxisDimArrays,
    setAxisDimNames: state.setAxisDimNames,
    setAxisDimUnits: state.setAxisDimUnits,
    setAxisOrder: state.setAxisOrder,
    setAxisShape: state.setAxisShape,
    setAxisFlipped: state.setAxisFlipped
  })))
  const {keyFrameEditor} = useImageExportStore(useShallow(state => ({ keyFrameEditor:state.keyFrameEditor})))
  const {plotType, displaceSurface, zSlice, ySlice, xSlice,} = usePlotStore(useShallow(state => ({
    plotType: state.plotType,
    displaceSurface: state.displaceSurface,
    zSlice: state.zSlice, ySlice: state.ySlice, xSlice: state.xSlice,
  })))
  const {analysisMode, useEditor} = useAnalysisStore(useShallow(state => ({
    analysisMode: state.analysisMode,
    useEditor: state.useEditor
  })))
  const coords = useRef<number[]>([0,0])
  const val = useRef<number>(0)

  const [showInfo, setShowInfo] = useState<boolean>(false)
  const [loc, setLoc] = useState<number[]>([0,0])

  const {rotateX, rotateZ, mirrorHorizontal, mirrorVertical} = usePlotTransformStore(useShallow(state=> ({
    rotateX: state.rotateX,
    rotateZ: state.rotateZ,
    mirrorHorizontal: state.mirrorHorizontal,
    mirrorVertical: state.mirrorVertical
  })))

   // ---- Transformation Handlers ---- //  
  useEffect(()=>{
    let axisMapping = [0, 1, 2];
    let axisReversed = [false, false, false];
    const origSlices = [zSlice, ySlice, xSlice]

    if (rotateZ === 1){
      // 90: X=-Y, Y=X
      axisMapping = [axisMapping[0], axisMapping[2], axisMapping[1]];
      axisReversed = [axisReversed[0], axisReversed[2], !axisReversed[1]];
    } else if ( rotateZ === 2){
      // 180: X=-X, Y=-Y
      axisReversed = [axisReversed[0], !axisReversed[1], !axisReversed[2]];
    } else if (rotateZ === 3) {
      // 270: X=Y, Y=-X
      axisMapping = [axisMapping[0], axisMapping[2], axisMapping[1]];
      axisReversed = [axisReversed[0], !axisReversed[2], axisReversed[1]];
    }

    if (rotateX === 1){
      // 90: Y=-Z, Z=Y
      axisMapping = [axisMapping[1], axisMapping[0], axisMapping[2]];
      axisReversed = [axisReversed[1], !axisReversed[0], axisReversed[2]];
    }
    else if (rotateX === 2){
      // 180: Y=-Y, Z=-Z
       axisReversed = [!axisReversed[1], !axisReversed[0], axisReversed[2]];
    } else if (rotateX === 3){
      // 270: Y=Z, Z=-Y
      axisMapping = [axisMapping[1], axisMapping[0], axisMapping[2]];
      axisReversed = [!axisReversed[1], axisReversed[0], axisReversed[2]];
    }

    if (mirrorHorizontal) {
      axisReversed[2] = !axisReversed[2];
    }
    if (mirrorVertical) {
      axisReversed[1] = !axisReversed[1];
    }

    const transformedDimArrays = axisMapping.map((origIdx, newIdx) =>{
      const arr = dimArrays[origIdx].slice();
      if (axisReversed[newIdx]) arr.reverse()
      return  arr
    })
    const transformedDimNames = axisMapping.map(origIdx => dimNames[origIdx])
    const transformedDimUnits = axisMapping.map(origIdx => dimUnits[origIdx])
    const axisShape = axisMapping.map(origIdx => dataShape[origIdx]/dataShape[dataShape.length-1])
    const axisSlices = axisMapping.map(origIdx => origSlices[origIdx])
    setAxisDimArrays(transformedDimArrays)
    setAxisDimNames(transformedDimNames)
    setAxisDimUnits(transformedDimUnits)
    setAxisShape(axisShape)
    setAxisOrder(axisMapping)
    setAxisFlipped(axisReversed)
    usePlotStore.setState({
      zSlice:axisSlices[0],
      ySlice:axisSlices[1],
      xSlice:axisSlices[2]
    })

  },[rotateX, rotateZ, mirrorHorizontal, mirrorVertical, dimArrays, dimNames, dimUnits])
  
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
