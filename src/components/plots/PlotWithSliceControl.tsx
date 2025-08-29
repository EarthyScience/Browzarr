import { OrbitControls } from '@react-three/drei';
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
import { useSliceUpdater } from './SliceUpdater';
import { SliceControls } from '@/components/plots';

const Orbiter = ({isFlat} : {isFlat  : boolean}) => {
  const {resetCamera} = usePlotStore(useShallow(state => ({
      resetCamera: state.resetCamera
    })))
  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  const hasMounted = useRef(false);

  useEffect(()=>{
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
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
        const t = Math.min(elapsed / duration, 1);
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
      {!isFlat && <OrbitControls ref={orbitRef} enableRotate={true} enablePan={true} maxDistance={50}/>}
    </>
  );
}

const PlotWithSliceControl = ({ZarrDS}:{ZarrDS: ZarrDataset}) => {
  // Global state
  const {
    setShape, setDataShape, setFlipY, setValueScales, setMetadata, 
    setDimArrays, setDimNames, setDimUnits, setPlotOn, setShowLoading
  } = useGlobalStore(useShallow(state => ({
    setShape: state.setShape,
    setDataShape: state.setDataShape,
    setFlipY: state.setFlipY,
    setValueScales: state.setValueScales,
    setMetadata: state.setMetadata,
    setDimArrays: state.setDimArrays, 
    setDimNames: state.setDimNames,
    setDimUnits: state.setDimUnits,
    setPlotOn: state.setPlotOn,
    setShowLoading: state.setShowLoading  
  })))

  const {
    colormap, variable, isFlat, metadata, valueScales, is4D, 
    setIsFlat, setDataArray
  } = useGlobalStore(useShallow(state=>({
    colormap: state.colormap, 
    variable: state.variable, 
    isFlat: state.isFlat, 
    metadata: state.metadata, 
    valueScales: state.valueScales,
    is4D: state.is4D,
    setIsFlat: state.setIsFlat, 
    setDataArray: state.setDataArray
  })))

  const {plotType} = usePlotStore(useShallow(state => ({
    plotType: state.plotType,
  })))

  const {slice} = useZarrStore(useShallow(state=> ({
    slice: state.slice
  })))

  // Component state
  const [texture, setTexture] = useState<THREE.DataTexture | THREE.Data3DTexture | null>(null)
  const [show, setShow] = useState<boolean>(false)
  const [plotInitialized, setPlotInitialized] = useState<boolean>(false)
  const [sliceLoading, setSliceLoading] = useState<boolean>(false)
  
  const coords = useRef<number[]>([0,0])
  const val = useRef<number>(0)
  const [showInfo, setShowInfo] = useState<boolean>(false)
  const [loc, setLoc] = useState<number[]>([0,0])

  // Handle texture updates from slice controller
  const handleTextureUpdate = useCallback((newTexture: THREE.DataTexture | THREE.Data3DTexture) => {
    setTexture(newTexture);
    // Force re-render after texture update
    invalidate();
  }, []);

  // Slice updater hook
  const { updateSlice, isUpdating } = useSliceUpdater({
    ZarrDS,
    onTextureUpdate: handleTextureUpdate,
    onLoadingChange: setSliceLoading
  });

  // INITIAL DATA LOADING (runs once when variable changes)
  useEffect(() => {
    if (variable !== "Default" && !plotInitialized) {
      setShowLoading(true);
      setShow(false);
      
      const initializeData = async () => {
        try {
          // Load initial data
          const result = await ZarrDS.GetArray(variable, slice);
          
          const [initialTexture, scaling] = ArrayToTexture({
            data: result.data,
            shape: result.shape
          });
          
          if (initialTexture instanceof THREE.DataTexture || initialTexture instanceof THREE.Data3DTexture) {
            setTexture(initialTexture);
          }
          
          if (scaling && 'maxVal' in scaling && 'minVal' in scaling) {
            setValueScales(scaling as { maxVal: number; minVal: number });
          }
          
          // Set plot configuration
          if (result.shape.length == 2) {
            setIsFlat(true);
          } else {
            setIsFlat(false);
          }
          
          setDataArray(result.data);
          const shapeRatio = result.shape[1] / result.shape[2] * 2;
          setShape(new THREE.Vector3(2, shapeRatio, 2));
          setDataShape(result.shape);
          
          // Load metadata
          const metadata = await ZarrDS.GetAttributes(variable);
          setMetadata(metadata);
          
          let [dimArrs, dimMetas, dimNames] = ZarrDS.GetDimArrays();
          if (is4D) {
            dimArrs = dimArrs.slice(1);
            dimMetas = dimMetas.slice(1);
            dimNames = dimNames.slice(1);
          }
          
          setDimArrays(dimArrs);
          setDimNames(dimNames);
          
          if (dimArrs.length > 2) {
            setFlipY(dimArrs[1][1] < dimArrs[1][0]);
          } else {
            setFlipY(dimArrs[0][1] < dimArrs[0][0]);
          }
          
          const tempDimUnits = dimMetas.map((meta: any) => meta.units);
          setDimUnits(tempDimUnits);
          ParseExtent(tempDimUnits, dimArrs);
          
          // Finalize initialization
          setPlotInitialized(true);
          setShow(true);
          setPlotOn(true);
          
        } catch (error) {
          console.error('Failed to initialize plot:', error);
        } finally {
          setShowLoading(false);
        }
      };

      initializeData();
    }
    
    // Reset when variable changes
    if (variable === "Default") {
      setMetadata(null);
      setPlotInitialized(false);
      setShow(false);
    }
  }, [variable]); // Only depend on variable

  const infoSetters = useMemo(()=>({
    setLoc,
    setShowInfo,
    coords,
    val
  }),[]);
  
  const Nav = useMemo(()=>Navbar,[]);

  return (
    <div className='main-canvas' style={{width:'100vw'}}>
      {/* Slice Controls - only show when plot is initialized */}
      {plotInitialized && (
        <SliceControls 
          onSliceUpdate={updateSlice}
          isUpdating={isUpdating() || sliceLoading}
        />
      )}
      
      <AnalysisWG setTexture={setTexture} ZarrDS={ZarrDS}/>
      {show && <Colorbar units={metadata?.units} valueScales={valueScales}/>}
      <Nav />
      {(isFlat || plotType == "flat") && <AnalysisInfo loc={loc} show={showInfo} info={[...coords.current,val.current]}/> }
      
      {/* 3D Plot */}
      {((!isFlat && plotType != "flat") || (isFlat && plotType === 'sphere')) && (
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
      )}

      {/* 2D Flat Plot */}
      {(isFlat || plotType == "flat") && (
        <Canvas id='main-canvas' camera={{ position: [0,0,5], zoom: 1000 }}
          orthographic frameloop="demand"
        >
          <ExportCanvas show={show}/>
          <CountryBorders/>
          {show && <AxisLines />}
          <FlatMap texture={texture as THREE.DataTexture | THREE.Data3DTexture} infoSetters={infoSetters} />
          <Orbiter isFlat={true}/>
        </Canvas>
      )}
    </div>
  );
};

export { PlotWithSliceControl };