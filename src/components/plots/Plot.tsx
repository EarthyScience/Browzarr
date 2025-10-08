import { OrbitControls } from '@react-three/drei';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PointCloud, UVCube, DataCube, FlatMap, Sphere, CountryBorders, AxisLines } from '@/components/plots';
import { Canvas, invalidate } from '@react-three/fiber';
import { ArrayToTexture } from '@/components/textures';
import { ZarrDataset } from '../zarr/ZarrLoaderLRU';
import { useGlobalStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Navbar, Colorbar } from '../ui';
import AnalysisInfo from './AnalysisInfo';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import AnalysisWG from './AnalysisWG';
import { ParseExtent } from '@/utils/HelperFuncs';
import ExportCanvas from '@/utils/ExportCanvas';

const Orbiter = ({isFlat} : {isFlat  : boolean}) =>{
  const {resetCamera} = usePlotStore(useShallow(state => ({
      resetCamera: state.resetCamera
    })))
  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  const hasMounted = useRef(false);

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

  return (
    <>
      {isFlat && <OrbitControls ref={orbitRef} enableRotate={false} enablePan={true} maxDistance={50} minZoom={50} maxZoom={3000}/>}
      {!isFlat && <OrbitControls ref={orbitRef}  enableRotate={true}  enablePan={true} maxDistance={50}/>}
    </>
  );
}
  


const Plot = ({ZarrDS}:{ZarrDS: ZarrDataset}) => {
    const {
      setShape,
      setDataShape, 
      setFlipY, 
      setValueScales, 
      setMetadata, 
      setDimArrays, 
      setDimNames, 
      setDimUnits,
      setPlotOn,
      setShowLoading} = useGlobalStore(
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
          setShowLoading: state.setShowLoading  
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

    const {plotType} = usePlotStore(useShallow(state => ({
      plotType: state.plotType,
    })))

    const {zSlice, ySlice, xSlice, reFetch} = useZarrStore(useShallow(state=> ({
      zSlice: state.zSlice,
      ySlice: state.ySlice,
      xSlice: state.xSlice,
      reFetch: state.reFetch
    })))

    const coords = useRef<number[]>([0,0])
    const val = useRef<number>(0)

    const [showInfo, setShowInfo] = useState<boolean>(false)
    const [loc, setLoc] = useState<number[]>([0,0])

    const [texture, setTexture] = useState<THREE.DataTexture | THREE.Data3DTexture | null>(null)
    const [show, setShow] = useState<boolean>(true) //Prevents rendering of 3D objects until data is fully loaded in

  //DATA LOADING
  useEffect(() => {
    if (variable != "Default") {
      setShowLoading(true);
      setShow(false)
      try{
        ZarrDS.GetArray(variable, {xSlice, ySlice, zSlice}).then((result) => {
        const [texture, scaling] = ArrayToTexture({
          data: result.data,
          shape: result.shape
        })
        console.log(result)
        if (texture instanceof THREE.DataTexture || texture instanceof THREE.Data3DTexture) {
          setTexture(texture)
        } else {
          console.error("Invalid texture type returned from ArrayToTexture");
          setTexture(null);
        }
        if (result.scalingFactor){
          const {maxVal, minVal} = scaling
          setValueScales({ maxVal: maxVal*(Math.pow(10,result.scalingFactor)), minVal: minVal*(Math.pow(10,result.scalingFactor)) });
        }else{
          setValueScales(scaling as { maxVal: number; minVal: number });
        }
        if (result.shape.length == 2){
          setIsFlat(true)
        }
        else{
          setIsFlat(false)
        }
        const shapeRatio = result.shape[1] / result.shape[2] * 2;
        setShape(new THREE.Vector3(2, shapeRatio, 2));
        setDataShape(result.shape)
        setShow(true)
        setPlotOn(true)
        setShowLoading(false)
      })
      }catch{
        setShowLoading(false);
        return;
      }
      //Get Metadata
      ZarrDS.GetAttributes(variable).then((result)=>{
        setMetadata(result);
        let [dimArrs, dimMetas, dimNames] = ZarrDS.GetDimArrays()
        if (is4D){
          dimArrs = dimArrs.slice(1);
          dimMetas = dimMetas.slice(1);
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
        const tempDimUnits = []
        for (const meta of dimMetas){
          tempDimUnits.push(meta.units)
        }
        setDimUnits(tempDimUnits)
        ParseExtent(tempDimUnits, dimArrs)
      })

    }
      else{
        setMetadata(null)
      }
  }, [reFetch])

  const infoSetters = useMemo(()=>({
    setLoc,
    setShowInfo,
    coords,
    val
  }),[])
  const Nav = useMemo(()=>Navbar,[])
  return (
    <div className='main-canvas'
      style={{width:'100vw'}}
    >
      <AnalysisWG setTexture={setTexture} ZarrDS={ZarrDS}/>
      {show && <Colorbar units={metadata?.units} valueScales={valueScales}/>}
      <Nav />
      {(isFlat || plotType == "flat") && <AnalysisInfo loc={loc} show={showInfo} info={[...coords.current,val.current]}/> }
      {((!isFlat && plotType != "flat") || (isFlat && plotType === 'sphere')) && <>
      <Canvas id='main-canvas' camera={{ position: isFlat ? [0,0,5] : [-4.5, 3, 4.5], fov: 50 }}
        frameloop="demand"
        gl={{ preserveDrawingBuffer: true }}
      >
        <CountryBorders/>
        <ExportCanvas show={show}/>
        {show && <AxisLines />}
        {plotType == "volume" && show && 
          <>
            <DataCube volTexture={texture}/>
            <UVCube ZarrDS={ZarrDS} />
          </>
        }
        {plotType == "point-cloud" && show &&
          <>
            <PointCloud textures={{texture,colormap}} ZarrDS={ZarrDS}/>
          </> 
        }
        {plotType == "sphere" && show && 
          <Sphere texture={texture} ZarrDS={ZarrDS} /> 
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
          <FlatMap texture={texture as THREE.DataTexture | THREE.Data3DTexture} infoSetters={infoSetters} />
          <Orbiter isFlat={true}/>
        </Canvas>
        </>}

    </div>
  )
}

export {Plot}
