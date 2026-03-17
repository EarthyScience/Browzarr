import * as THREE from 'three'
import { useEffect, useMemo, useState, useRef } from 'react'
import { pointFrag, pointVert } from '@/components/textures/shaders'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { parseUVCoords, getUnitAxis, GetTimeSeries, GetCurrentArray, deg2rad } from '@/utils/HelperFuncs';
import { evaluate_cmap } from 'js-colormaps-es';
import { useCoordBounds } from '@/hooks/useCoordBounds';
import { UVCube } from './UVCube';

interface PCProps {
  texture: THREE.Data3DTexture[] | null,
  colormap: THREE.DataTexture
}

const MappingCube = () =>{

  const {dataShape} = useGlobalStore(useShallow(state => ({
    dataShape: state.dataShape,
  })))

  const {timeScale} = usePlotStore(useShallow(state=> ({
    timeScale: state.timeScale,
  })))

  const globalScale = dataShape[2]/500
  const offset = 1/500; //I don't really understand that. But the cube is off by one pixel in each dimension
  
  const depthRatio = useMemo(()=>dataShape[0]/dataShape[2]*timeScale,[dataShape, timeScale]);
  const shapeRatio = useMemo(()=>dataShape[1]/dataShape[2], [dataShape])

  return(
    <group position={[-offset, -offset, -offset]}>
      <UVCube scale={new THREE.Vector3(2*globalScale, 2*shapeRatio*globalScale, 2*depthRatio*globalScale)} />
    </group>
  )
}

export const PointCloud = ({textures} : {textures:PCProps} )=>{
    const { colormap } = textures;
    const {timeSeries, flipY, dataShape, textureData} = useGlobalStore(useShallow(state=>({
      timeSeries: state.timeSeries,
      flipY: state.flipY,
      dataShape: state.dataShape,
      textureData: state.textureData
    })))
    const {scalePoints, scaleIntensity, pointSize, cScale, cOffset, valueRange, animProg, 
      selectTS, timeScale, xRange, yRange, zRange, fillValue,
      maskTexture, maskValue } = usePlotStore(useShallow(state => ({
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
      zRange: state.zRange,
      fillValue:state.fillValue,
      maskTexture: state.maskTexture,
      maskValue: state.maskValue,
    })))
    
    const [pointsObj, setPointsObj] = useState<Record<string, number>>({}) //This logic is now useless. But will remove when udpate timeSEries indicators
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
    const {lonBounds, latBounds} = useCoordBounds() 

    const shaderMaterial = useMemo(()=> (new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        maskTexture: {value: maskTexture},
        maskValue: {value: maskValue},
        latBounds: {value: new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))},
        lonBounds: {value: new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))},
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
        fillValue: {value: NaN}
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
      uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
      uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
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
      uniforms.fillValue.value = fillValue?? NaN
      uniforms.maskValue.value = maskValue
    }
  }, [pointSize, colormap, cOffset, cScale, valueRange, scalePoints, scaleIntensity, pointIDs, stride, selectTS, animProg, timeScale, xRange, yRange, fillValue, zRange, maskValue, lonBounds, latBounds]);

    return (
      <group scale={[1,flipY ? -1:1, 1]}>
        <points geometry={geometry} material={shaderMaterial} frustumCulled={false}/>
        <MappingCube/>
      </group>
    );
  }