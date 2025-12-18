import { OrbitControls } from '@react-three/drei';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PointCloud, UVCube, DataCube, FlatMap, Sphere, CountryBorders, AxisLines, SphereBlocks, FlatBlocks, KeyFramePreviewer } from '@/components/plots';
import { Canvas, invalidate, useThree } from '@react-three/fiber';
import { ArrayToTexture, CreateTexture } from '@/components/textures';
import { GetArray, GetAttributes, GetDimArrays } from '../zarr/ZarrLoaderLRU';
import { useAnalysisStore, useGlobalStore, useImageExportStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Navbar, Colorbar, ExportExtent } from '../ui';
import AnalysisInfo from './AnalysisInfo';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import AnalysisWG from './AnalysisWG';
import { ParseExtent } from '@/utils/HelperFuncs';
import ExportCanvas from '@/utils/ExportCanvas';
import KeyFrames from '../ui/KeyFrames';


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
    const {
      setShape, setDataShape, setFlipY, setValueScales, setMetadata, setDimArrays, 
      setDimNames, setDimUnits, setPlotOn, setStatus} = useGlobalStore(
        useShallow(state => ({  //UseShallow for object returns
          setShape:state.setShape,
          setDataShape: state.setDataShape,
          setFlipY:state.setFlipY,
          setValueScales:state.setValueScales,
          setMetadata: state.setMetadata,
          setDimArrays:state.setDimArrays, 
          setDimNames:state.setDimNames,
          setDimUnits:state.setDimUnits,
          setPlotOn: state.setPlotOn,
          setStatus: state.setStatus  
        }
        )))
    const {colormap, variable, isFlat, DPR, valueScales, is4D, setIsFlat} = useGlobalStore(useShallow(state=>({
      colormap: state.colormap, 
      variable: state.variable, 
      isFlat: state.isFlat, 
      DPR: state.DPR, 
      valueScales: state.valueScales,
      is4D: state.is4D,
      setIsFlat: state.setIsFlat, 
    })))
    const {keyFrameEditor} = useImageExportStore(useShallow(state => ({ keyFrameEditor:state.keyFrameEditor})))
    const {plotType, displaceSurface, interpPixels, setPlotType} = usePlotStore(useShallow(state => ({
      plotType: state.plotType,
      displaceSurface: state.displaceSurface,
      interpPixels: state.interpPixels,
      setPlotType: state.setPlotType
    })))

    const {zSlice, ySlice, xSlice, reFetch} = useZarrStore(useShallow(state=> ({
      zSlice: state.zSlice,
      ySlice: state.ySlice,
      xSlice: state.xSlice,
      reFetch: state.reFetch
    })))
    const {analysisMode} = useAnalysisStore(useShallow(state => ({
      analysisMode: state.analysisMode
    })))
    const coords = useRef<number[]>([0,0])
    const val = useRef<number>(0)

    const [showInfo, setShowInfo] = useState<boolean>(false)
    const [loc, setLoc] = useState<number[]>([0,0])

    const [textures, setTextures] = useState<THREE.DataTexture[] | THREE.Data3DTexture[] | null>(null)
    const [show, setShow] = useState<boolean>(true) //Prevents rendering of 3D objects until data is fully loaded in
    const [stableMetadata, setStableMetadata] = useState<Record<string, any>>({});
  //DATA LOADING
  useEffect(() => {
    if (variable != "Default") {
      setShow(false)
      try{
        if (textures) {
          textures.forEach(tex =>{
            tex.dispose();
            tex.source.data = null
          });
        }
        const {setZSlice, setYSlice, setXSlice} = usePlotStore.getState() // Set the plot slices with zarr slices
        setZSlice(zSlice);
        setYSlice(ySlice);
        setXSlice(xSlice);
        GetArray().then((result) => {
        const [tempTexture, scaling] = ArrayToTexture({
          data: result.data,
          shape: result.shape
        })
        setTextures(tempTexture)
        if (result.scalingFactor){
          const {maxVal, minVal} = scaling
          setValueScales({ maxVal: maxVal*(Math.pow(10,result.scalingFactor)), minVal: minVal*(Math.pow(10,result.scalingFactor)) });
        }else{
          setValueScales(scaling as { maxVal: number; minVal: number });
        }
        const shapeLength = result.shape.length
        if (shapeLength == 2){
          setIsFlat(true)
          if (!["flat", "sphere"].includes(plotType)){// If the plottype isn't already sphere or flat, change it to sphere
            setPlotType("sphere")
          }
        }
        else{
          setIsFlat(false)
        }
        const aspectRatio = result.shape[shapeLength-2] / result.shape[shapeLength-1];
        const timeRatio = result.shape[shapeLength-3] / result.shape[shapeLength-1];
        setShape(new THREE.Vector3(2, aspectRatio * 2, Math.max(timeRatio, 2)));
        setDataShape(result.shape)
        setShow(true)
        setPlotOn(true)
        setStatus(null)
      })
      }catch{
        setStatus(null);
        return;
      }
      //Get Metadata
      GetAttributes().then((result)=>{
        setMetadata(result);
        setStableMetadata(result);
        let [dimArrs, dimUnits, dimNames] = GetDimArrays()
        if (is4D){
          dimArrs = dimArrs.slice(1);
          dimUnits = dimUnits.slice(1);
          dimNames = dimNames.slice(1);
        }
        setDimArrays(dimArrs)
        setDimNames(dimNames)
        if (dimArrs.length > 2){
          if (dimArrs[1][1] < dimArrs[1][0])
            {setFlipY(true)}
          else
            {setFlipY(false)}
        }
        else{
          if (dimArrs[0][1] < dimArrs[0][0])
            {setFlipY(true)}
          else
            {setFlipY(false)}
        }
        setDimUnits(dimUnits)
        ParseExtent(dimUnits, dimArrs)
      })
    }else{
      setMetadata(null)
    }
  }, [reFetch])

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

  useEffect(() => {
    // This cleanup function will run when the `textures` state is about to change,
    // or when the component unmounts.
    return () => {
      if (textures) {
        textures.forEach(tex => {
          tex.dispose();
        });
      }
    };
  }, [textures]);

  useEffect(()=> {
    if (!textures) return;
    const updated = textures.map(tex => {
      const clone = tex.clone(); 
      if (interpPixels) {
        clone.minFilter = THREE.LinearFilter;
        clone.magFilter = THREE.LinearFilter;
      } else {
        clone.minFilter = THREE.NearestFilter;
        clone.magFilter = THREE.NearestFilter;
      }
      clone.needsUpdate = true; 
      return clone ;
    });
    setTextures(updated as THREE.Data3DTexture[] | THREE.DataTexture[]);
  },[interpPixels])

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
      <Canvas id='main-canvas' camera={{ position: isFlat ? [0,0,5] : [-4.5, 3, 4.5], fov: 50 }}
        frameloop="demand"
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
