
import * as THREE from 'three'
import { useEffect, useMemo, useState, useRef } from 'react'
import { pointFrag, pointVert } from '@/components/textures/shaders'
import { useAnalysisStore, useZarrStore, useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { ZarrDataset } from '../zarr/ZarrLoaderLRU';
import { parseUVCoords, getUnitAxis, GetTimeSeries, GetCurrentArray } from '@/utils/HelperFuncs';
import { evaluate_cmap } from 'js-colormaps-es';

interface PCProps {
  texture: THREE.Data3DTexture[] | null,
  colormap: THREE.DataTexture
}

interface dimensionsProps{
  width: number;
  height: number;
  depth: number;
}

interface pointSetters{
  setPoints: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setStride: React.Dispatch<React.SetStateAction<number>>;
  setDimWidth: React.Dispatch<React.SetStateAction<number>>;
}

const MappingCube = ({dimensions, ZarrDS, setters} : {dimensions: dimensionsProps, ZarrDS: ZarrDataset, setters:pointSetters}) =>{
  const {width, height, depth} = dimensions;
  const {setPoints, setStride, setDimWidth} = setters;
  const selectTS = usePlotStore(state => state.selectTS)

  const {dimArrays, dimUnits, dimNames, strides, dataShape, setPlotDim, setTimeSeries, updateTimeSeries, setDimCoords, updateDimCoords} = useGlobalStore(useShallow(state => ({
    dimArrays: state.dimArrays,
    dimUnits: state.dimUnits,
    dimNames: state.dimNames,
    strides: state.strides,
    dataShape: state.dataShape,
    setPlotDim: state.setPlotDim,
    setTimeSeries: state.setTimeSeries,
    updateTimeSeries: state.updateTimeSeries,
    setDimCoords: state.setDimCoords,
    updateDimCoords: state.updateDimCoords
  })))
  const {analysisMode, analysisArray} = useAnalysisStore(useShallow(state=> ({
    analysisMode: state.analysisMode,
    analysisArray: state.analysisArray
  })))
  const {zSlice, ySlice, xSlice} = useZarrStore(useShallow(state => ({
          zSlice: state.zSlice,
          ySlice: state.ySlice,
          xSlice: state.xSlice
  })))
  const dimSlices = [
    dimArrays[0].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined),
    dimArrays[1].slice(ySlice[0], ySlice[1] ? ySlice[1] : undefined),
    dimArrays.length > 2 ? dimArrays[2].slice(xSlice[0], xSlice[1] ? xSlice[1] : undefined) : [],
  ]
  const lastNormal = useRef<number | null> ( null )
  
  const {timeScale, getColorIdx, incrementColorIdx} = usePlotStore(useShallow(state=> ({
    timeScale: state.timeScale,
    getColorIdx: state.getColorIdx,
    incrementColorIdx: state.incrementColorIdx
  })))

  const globalScale = dataShape[2]/500
  const offset = 1/500; //I don't really understand that. But the cube is off by one pixel in each dimension
  
  const depthRatio = useMemo(()=>dataShape[0]/dataShape[2]*timeScale,[dataShape, timeScale]);
  const shapeRatio = useMemo(()=>dataShape[1]/dataShape[2], [dataShape])
  function HandleTimeSeries(event: THREE.Intersection){
      if (!selectTS){
        return
      }
      const uv = event.uv!;
      const normal = event.normal!;
      const dimAxis = getUnitAxis(normal);
      if (dimAxis != lastNormal.current){
        setTimeSeries({}); //Clear timeseries if new axis
        setDimCoords({});
        setPoints({})
      }
      lastNormal.current = dimAxis;
      
      if(ZarrDS){
        const tempTS = GetTimeSeries({data: analysisMode? analysisArray : GetCurrentArray(), shape: dataShape, stride: strides},{uv,normal})
        const plotDim = (normal.toArray()).map((val, idx) => {
          if (Math.abs(val) > 0) {
            return idx;
          }
          return null;}).filter(idx => idx !== null);
        setPlotDim(2-plotDim[0]) //I think this 2 is only if there are 3-dims. Need to rework the logic
        const coordUV = parseUVCoords({normal:normal,uv:uv})
        let dimCoords = coordUV.map((val,idx)=>val ? dimSlices[idx][Math.round(val*dimSlices[idx].length-.5)] : null)
        const thisDimNames = dimNames.filter((_,idx)=> dimCoords[idx] !== null)
        const thisDimUnits = dimUnits.filter((_,idx)=> dimCoords[idx] !== null)
        dimCoords = dimCoords.filter(val => val !== null)
        const tsID = `${dimCoords[0]}_${dimCoords[1]}`
        const tsObj = {
          color:evaluate_cmap(getColorIdx()/10,"Paired"),
          data:tempTS
        }
        incrementColorIdx();
        updateTimeSeries({ [tsID] : tsObj})
        const dimObj = {
          first:{
            name:thisDimNames[0],
            loc:dimCoords[0] ?? 0,
            units:thisDimUnits[0]
          },
          second:{
            name:thisDimNames[1],
            loc:dimCoords[1] ?? 0,
            units:thisDimUnits[1]
          },
          plot:{
            units:dimUnits[2-plotDim[0]]
          }
        }
        updateDimCoords({[tsID] : dimObj})
        const dims = [depth, height, width].filter((_,idx)=> coordUV[idx] != null)
        const dimWidth = [depth, height, width].filter((_,idx)=> coordUV[idx] == null)
        const newUV = coordUV.filter((v)=> v != null)
        const thisStride = strides.filter((_,idx)=> coordUV[idx] != null)
        const uIdx = Math.round((newUV[0])*dims[0]-.5)
        const vIdx = Math.round(newUV[1]*dims[1]-.5)
        const newIdx = uIdx * thisStride[0] + vIdx * thisStride[1]
        const dimStride = strides.filter((_,idx)=> coordUV[idx] == null)
        setDimWidth(dimWidth[0])
        setPoints(prevItems => {
              const newEntry = {[tsID] : newIdx}
              const updated = {...newEntry, ...prevItems};
              return updated; // keep only first 10 items
            })
        setStride(dimStride[0])        
      }

    }
  return(
    <mesh scale={[2*globalScale, 2*shapeRatio*globalScale, 2*depthRatio*globalScale]} position={[-offset, -offset, offset]} onClick={HandleTimeSeries}>
        <boxGeometry />
        <meshBasicMaterial transparent opacity={0}/>
    </mesh>
  )
}

export const PointCloud = ({textures, ZarrDS} : {textures:PCProps, ZarrDS: ZarrDataset} )=>{
    const { colormap } = textures;
    const {timeSeries, flipY, dataShape, textureData} = useGlobalStore(useShallow(state=>({
      timeSeries: state.timeSeries,
      flipY: state.flipY,
      dataShape: state.dataShape,
      textureData: state.textureData
    })))
    const {scalePoints, scaleIntensity, pointSize, cScale, cOffset, valueRange, animProg, selectTS, timeScale, xRange, yRange, zRange,} = usePlotStore(useShallow(state => ({
      scalePoints: state.scalePoints,
      scaleIntensity: state.scaleIntensity,
      pointSize: state.pointSize,
      cScale: state.cScale, 
      cOffset:state.cOffset,
      valueRange: state.valueRange,
      animProg: state.animProg,
      selectTS: state.selectTS,
      timeScale: state.timeScale,
      xRange: state.xRange,
      yRange: state.yRange,
      zRange: state.zRange
    })))
    
    const [pointsObj, setPointsObj] = useState<Record<string, number>>({})
    const [pointIDs, setPointIDs] = useState<number[]>(new Array(10).fill(-1))
    const [stride, setStride] = useState<number>(1)
    const [dimWidth, setDimWidth] = useState<number>(0);

    useEffect(()=>{ //This goes through the list of highlighted columns and removes those that aren't included in the timeseries object.
      let pointIDs = Object.keys(pointsObj)
      const tsIDs = Object.keys(timeSeries)
      pointIDs = pointIDs.filter((val) => tsIDs.includes(val))
      const pointValues = pointIDs.map(id => pointsObj[id]);
      const paddedArray = [
        ...pointValues,
        ...Array(Math.max(0, 10 - pointValues.length)).fill(-1)
      ];
      setPointIDs(paddedArray)

    },[timeSeries, pointsObj])

    //Extract data and shape from Data3DTexture
    const { data, width, height, depth } = useMemo(() => {
        const [depth, height, width] = dataShape
        return {
          data: textureData,
          width: width,
          height: height,
          depth: depth,
        };
    }, [textureData, dataShape]);

    // Create buffer geometry
    const geometry = useMemo(() => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('value', new THREE.Uint8BufferAttribute(data as Uint8Array, 1));
      const arrayLength = depth * height * width ;
      geom.setDrawRange(0, arrayLength); // This is used to tell it how many data points are needed since we aren't giving it positions.
      return geom;
    }, [data]);

    const shaderMaterial = useMemo(()=> (new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        pointSize: {value: pointSize},
        cmap: {value: colormap},
        cOffset: {value: cOffset},
        cScale: {value: cScale},
        valueRange: {value: new THREE.Vector2(valueRange[0], valueRange[1])},
        scalePoints:{value: scalePoints},
        scaleIntensity: {value: scaleIntensity},
        startIDs: {value : pointIDs},
        stride: {value : stride},
        showTransect: { value: selectTS},
        dimWidth: {value: dimWidth},
        timeScale: {value: timeScale},
        animateProg: {value: animProg},
        shape: {value: new THREE.Vector3(depth, height, width)},
        flatBounds:{value: new THREE.Vector4(xRange[0], xRange[1], zRange[0], zRange[1])},
        vertBounds:{value: new THREE.Vector2(yRange[0], yRange[1])},
      },
      vertexShader:pointVert,
      fragmentShader:pointFrag,
      depthWrite: true,
      depthTest: true,
      transparent: false,
      blending:THREE.NormalBlending,
      side:THREE.DoubleSide,
    })
    ),[]);

   useEffect(() => {
    if (shaderMaterial) {
      const uniforms = shaderMaterial.uniforms;
      uniforms.pointSize.value = pointSize;
      uniforms.cmap.value = colormap;
      uniforms.cOffset.value = cOffset;
      uniforms.cScale.value = cScale;
      uniforms.valueRange.value.set(valueRange[0], valueRange[1]);
      uniforms.scalePoints.value = scalePoints;
      uniforms.scaleIntensity.value = scaleIntensity;
      uniforms.startIDs.value = pointIDs;
      uniforms.stride.value = stride;
      uniforms.showTransect.value = selectTS;
      uniforms.dimWidth.value = dimWidth;
      uniforms.timeScale.value = timeScale;
      uniforms.animateProg.value = animProg;
      uniforms.flatBounds.value.set(
        xRange[0], xRange[1], 
        zRange[0], zRange[1]
      );
      uniforms.vertBounds.value.set(
        yRange[0], yRange[1]
      );
    }
  }, [pointSize, colormap, cOffset, cScale, valueRange, scalePoints, scaleIntensity, pointIDs, stride, selectTS, animProg, timeScale, xRange, yRange, zRange]);

    return (
      <>
      <mesh scale={[1,flipY ? -1:1, 1]} >
        <points geometry={geometry} material={shaderMaterial} frustumCulled={false}/>
      </mesh>
      <MappingCube dimensions={{width,height,depth}} ZarrDS={ZarrDS} setters={{setPoints:setPointsObj, setStride, setDimWidth}}/>
      </>
    );
  }