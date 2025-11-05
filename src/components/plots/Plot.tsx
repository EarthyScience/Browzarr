import { OrbitControls } from '@react-three/drei';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PointCloud, UVCube, DataCube, FlatMap, Sphere, CountryBorders, AxisLines, SphereBlocks } from '@/components/plots';
import { Canvas, invalidate, useThree } from '@react-three/fiber';
import { ArrayToTexture, CreateTexture } from '@/components/textures';
import { ZarrDataset } from '../zarr/ZarrLoaderLRU';
import { useAnalysisStore, useGlobalStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Navbar, Colorbar } from '../ui';
import AnalysisInfo from './AnalysisInfo';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import AnalysisWG from './AnalysisWG';
import { ParseExtent } from '@/utils/HelperFuncs';
import ExportCanvas from '@/utils/ExportCanvas';


const Orbiter = ({isFlat} : {isFlat  : boolean}) =>{
  const {resetCamera, useOrtho} = usePlotStore(useShallow(state => ({
      resetCamera: state.resetCamera,
      useOrtho: state.useOrtho
    })))
  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  const hasMounted = useRef(false);
  const {set, camera, size} = useThree()

  // Reset Camera Position and Target
  useEffect(()=>{
    if (!hasMounted.current) {
      hasMounted.current = true;
      return; // skip reset when changing between flat or not flat cameras
    }
    console.log("Did this fire?")
    if (orbitRef.current){
      const controls = orbitRef.current
      let frameId: number;
      const duration = 1000; 
      const startTime = performance.now();
      const startPos = controls.object.position.clone();
      const endPos = controls.position0.clone()

      const startTarget = controls.target.clone();
      const endTarget = controls.target0.clone()

      const startZoom = controls.object.zoom
      
      const animate = (time: number) => {
        invalidate();
        const elapsed = time - startTime;
        const t = Math.min(elapsed / duration, 1); // clamp between 0 and 1
        controls.object.position.lerpVectors(startPos, endPos, t);
        controls.target.lerpVectors(startTarget,endTarget,t)

        if (isFlat) {
          controls.object.zoom = THREE.MathUtils.lerp(startZoom, 1000, t);
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
  },[resetCamera])

  useEffect(()=>{
    if (hasMounted.current){
      const newCamera = useOrtho ? new THREE.OrthographicCamera() : new THREE.PerspectiveCamera()
      if (useOrtho){
      const aspect = size.width / size.height
      const frustumSize = 10 // Adjust based on your scene scale
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
      // Perspective camera can just copy position/rotation
      newCamera.position.copy(camera.position)
      newCamera.rotation.copy(camera.rotation)
    }
    
    set({ camera: newCamera})
    console.log('Active camera after set:', newCamera.type)
    if (orbitRef.current) {
      orbitRef.current.object = newCamera
      orbitRef.current.update()
    }
    console.log(orbitRef)
  }

  },[useOrtho])

  return (
    <OrbitControls 
      ref={orbitRef} 
      enableRotate={!isFlat} 
      enablePan={true} 
      maxDistance={50}
      minZoom={1} 
      maxZoom={3000}
    />
  );
}

const Plot = ({ZarrDS}:{ZarrDS: ZarrDataset}) => {
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
    const {colormap, variable, isFlat, metadata, valueScales, is4D, setIsFlat} = useGlobalStore(useShallow(state=>({
      colormap: state.colormap, 
      variable: state.variable, 
      isFlat: state.isFlat, 
      metadata: state.metadata, 
      valueScales: state.valueScales,
      is4D: state.is4D,
      setIsFlat: state.setIsFlat, 
    })))

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
        ZarrDS.GetArray(variable, {xSlice, ySlice, zSlice}).then((result) => {
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
          setPlotType("sphere")
        }
        else{
          setIsFlat(false)
        }
        const shapeRatio = result.shape[shapeLength-2] / result.shape[shapeLength-1] * 2;
        setShape(new THREE.Vector3(2, shapeRatio, 2));
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
      ZarrDS.GetAttributes(variable).then((result)=>{
        setMetadata(result);
        setStableMetadata(result);
        let [dimArrs, dimUnits, dimNames] = ZarrDS.GetDimArrays()
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

  const Nav = useMemo(()=>Navbar,[])
  return (
    <div className='main-canvas'
      style={{width:'100vw'}}
    >
      <AnalysisWG setTexture={setTextures} ZarrDS={ZarrDS}/>
      {show && <Colorbar units={stableMetadata?.units} metadata={stableMetadata} valueScales={valueScales}/>}
      <Nav />
      {(isFlat || plotType == "flat") && <AnalysisInfo loc={loc} show={showInfo} info={[...coords.current,val.current]}/> }
      {((!isFlat && plotType != "flat") || (isFlat && plotType === 'sphere')) && <>
      <Canvas id='main-canvas' camera={{ position: isFlat ? [0,0,5] : [-4.5, 3, 4.5], fov: 50 }}
        frameloop="demand"
        orthographic
        gl={{ preserveDrawingBuffer: true }}
      >
        <CountryBorders/>
        <ExportCanvas show={show}/>
        {show && <AxisLines />}
        {plotType == "volume" && show && 
          <>
            <DataCube volTexture={textures}/>
            <UVCube ZarrDS={ZarrDS} />
          </>
        }
        {plotType == "point-cloud" && show &&
          <>
            <PointCloud textures={{texture: textures as THREE.Data3DTexture[],colormap}} ZarrDS={ZarrDS}/>
          </> 
        }
        {plotType == "sphere" && show && 
          <>
            {displaceSurface ? <Sphere textures={textures} ZarrDS={ZarrDS} /> : <SphereBlocks textures={textures} />}
          </>
        }
        <Orbiter isFlat={false} />
      </Canvas>
      </>}

        {(isFlat || (!isFlat && plotType == "flat")) && <>
        <Canvas id='main-canvas' camera={{ position: [0,0,5], zoom: 1000 }}
        orthographic frameloop="demand"
        >
          <ExportCanvas show={show}/>
          <CountryBorders/>
          {show && <AxisLines />}
          <FlatMap textures={textures as THREE.DataTexture | THREE.Data3DTexture[]} infoSetters={infoSetters} />
          <Orbiter isFlat={true}/>
        </Canvas>
        </>}

    </div>
  )
}

export {Plot}
