import { OrbitControls } from '@react-three/drei';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PointCloud, UVCube, DataCube, FlatMap, Sphere } from '@/components/plots';
import { Canvas } from '@react-three/fiber';
import { ArrayToTexture } from '@/components/textures';
import { ZarrDataset } from '../zarr/ZarrLoaderLRU';
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Navbar, ContextTweaker, Colorbar } from '../ui';
import AnalysisInfo from './AnalysisInfo';

interface PlotParameters{
    values:{
        ZarrDS: ZarrDataset;
        canvasWidth:number
    }
    setShowLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const Plot = ({values,setShowLoading}:PlotParameters) => {
    const {
      setShape, 
      setFlipY, 
      setValueScales, 
      setMetadata, 
      setDimArrays, 
      setDimNames, 
      setDimUnits,
      setPlotOn} = useGlobalStore(
        useShallow(state => ({  //UseShallow for object returns
          setShape:state.setShape,
          setFlipY:state.setFlipY,
          setValueScales:state.setValueScales,
          setMetadata: state.setMetadata,
          setDimArrays:state.setDimArrays, 
          setDimNames:state.setDimNames,
          setDimUnits:state.setDimUnits,
          setPlotOn: state.setPlotOn}
        )))
    const {colormap, variable, isFlat, metadata, valueScales, setIsFlat, setDataArray} = useGlobalStore(useShallow(state=>({
      colormap: state.colormap, 
      variable: state.variable, 
      isFlat: state.isFlat, 
      metadata: state.metadata, 
      valueScales: state.valueScales,
      setIsFlat: state.setIsFlat, 
      setDataArray: state.setDataArray
    })))
    const {ZarrDS,canvasWidth} = values;
    const plotType = usePlotStore(state => state.plotType)

    const [showTweaker, setShowTweaker] = useState<boolean>(false);
    const [tweakerLoc, setTweakerLoc] = useState<number[]>([0,0])

    const coords = useRef<number[]>([0,0])
    const val = useRef<number>(0)

    const [showInfo, setShowInfo] = useState<boolean>(false)
    const [loc, setLoc] = useState<number[]>([0,0])

    const [texture, setTexture] = useState<THREE.DataTexture | THREE.Data3DTexture | null>(null)
    const [show, setShow] = useState<boolean>(true) //Prevents rendering of 3D objects until data is fully loaded in
    
    const [windowWidth, setWindowWidth] = useState<number>(0); //Use for rescaling

    const isOrthographic = true;

    useEffect(() => {
        setWindowWidth(window.innerWidth);
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Listen for theme changes
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    // setCurrentBg('var(--background)')
                }
            })
        })
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        })

        return () => observer.disconnect()
    }, [])

  //DATA LOADING
  useEffect(() => {
    if (variable != "Default") {
      setShowLoading(true);
      setShow(false)
      ZarrDS.GetArray(variable).then((result) => {
        // result now contains: { data: TypedArray, shape: number[], dtype: string }
        const [texture, scaling] = ArrayToTexture({
          data: result.data,
          shape: result.shape
        })
        if (texture instanceof THREE.DataTexture || texture instanceof THREE.Data3DTexture) {
          setTexture(texture)
        } else {
          console.error("Invalid texture type returned from ArrayToTexture");
          setTexture(null);
        }
        if (
          typeof scaling === 'object' &&
          'maxVal' in scaling &&
          'minVal' in scaling
        ) {
          setValueScales(scaling as { maxVal: number; minVal: number });
          
        }
        if (result.shape.length == 2){
          setIsFlat(true)
          setDataArray(result.data)

        }
        else{
          setIsFlat(false)
        }
        const shapeRatio = result.shape[1] / result.shape[2] * 2;
        setShape(new THREE.Vector3(2, shapeRatio, 2));
        setShowLoading(false)
        setShow(true)
        setPlotOn(true)
      })
      //Get Metadata
      ZarrDS.GetAttributes(variable).then((result)=>{
        setMetadata(result);
        const [dimArrs, dimMetas, dimNames] = ZarrDS.GetDimArrays()
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
      })

    }
      else{
        setMetadata(null)
      }
  }, [variable])

  function HandleContext(e : any){ //Show tweaker at right click
    if (!isFlat){
      setTweakerLoc([e.pageX,e.pageY])
      setShowTweaker(true)
    }
  }

  const infoSetters = useMemo(()=>({
    setLoc,
    setShowInfo,
    coords,
    val
  }),[])

  const Nav = useMemo(()=>Navbar,[])
  return (
    <div className='main-canvas'
      style={{
        width: windowWidth - canvasWidth         
      }}
      onContextMenu={HandleContext}
    >
      {show && <Colorbar units={metadata?.units} valueScales={valueScales}/>}
      {showTweaker &&  <ContextTweaker loc={tweakerLoc}/>}
      <Nav />
      {isFlat && <AnalysisInfo loc={loc} show={showInfo} info={[...coords.current,val.current]}/> }
      {!isFlat && <>
      <Canvas camera={{ position: isFlat ? [0,0,5] : [-4.5, 3, 4.5], fov: 50 }}
        frameloop="demand"
      >
        {plotType == "volume" && show && <>
          <DataCube volTexture={texture}/>
          <UVCube ZarrDS={ZarrDS} />
        </>}
        {plotType == "point-cloud" && show && <PointCloud textures={{texture,colormap}} />}
        {plotType == "sphere" && show && <Sphere texture={texture} ZarrDS={ZarrDS} /> }
        <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2} enablePan={false} maxDistance={50}/>
      </Canvas>
      </>}


        {isFlat && <>
        <Canvas camera={{ position: [0,0,5], zoom: 1000 }}
        frameloop="demand"
        orthographic
        >
          <FlatMap texture={texture as THREE.DataTexture} infoSetters={infoSetters} />
          <OrbitControls enableRotate={false} enablePan={true} maxDistance={50} minZoom={50} maxZoom={3000}/>
        </Canvas>
        </>}

    </div>
  )
}

export {Plot}
