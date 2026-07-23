import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import { pointFrag, pointVert } from '@/components/textures/shaders'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { deg2rad, getLogEps, parseColorToVec4 } from '@/utils/HelperFuncs';
import { useCoordBounds } from '@/hooks/useCoordBounds';
import { UVCube } from './UVCube';
import { ColumnMeshes } from './TransectMeshes';

import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { colorScaleToId } from '@/components/textures';

interface PCProps {
  texture: THREE.Data3DTexture[] | null,
  colormap: THREE.DataTexture
}

const MappingCube = () =>{

  const {dataShape, shape} = useGlobalStore(useShallow(state => ({
    dataShape: state.dataShape,
    shape: state.shape
  })))

  const {timeScale} = usePlotStore(useShallow(state=> ({
    timeScale: state.timeScale,
  })))

  const globalScale = dataShape[2]/500
  const offset = 1/500; //I don't really understand that. But the cube is off by one pixel in each dimension
  
  const depthRatio = useMemo(()=> (shape && shape.x > 0 ? (shape.z / shape.x) * timeScale : 1),[shape, timeScale]);
  const shapeRatio = useMemo(()=>dataShape[1]/dataShape[2], [dataShape])

  return(
    <group position={[-offset, -offset, -offset]}>
      <UVCube scale={new THREE.Vector3(2*globalScale, 2*shapeRatio*globalScale, 2*depthRatio*globalScale)} />
    </group>
  )
}

export const PointCloud = ({textures} : {textures:PCProps} )=>{
    const { colormap } = textures;
    const volTexture = usePaddedTextures(textures.texture);
    const { flipY, dataShape, remapTexture, textureArrayDepths, shape, valueScales } = useGlobalStore(useShallow(state=>({
      flipY: state.flipY,
      dataShape: state.dataShape,
      remapTexture: state.remapTexture,
      textureArrayDepths: state.textureArrayDepths,
      shape: state.shape,
      valueScales: state.valueScales,
    })))
    const {scalePoints, scaleIntensity, pointSize, cScale, cOffset, valueRange, animProg, 
      timeScale, xRange, yRange, zRange, fillValue,
      maskTexture, maskValue, disablePointScale,
      colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip} = usePlotStore(useShallow(state => ({
      scalePoints: state.scalePoints,
      scaleIntensity: state.scaleIntensity,
      pointSize: state.pointSize,
      cScale: state.cScale, 
      cOffset:state.cOffset,
      valueRange: state.valueRange,
      animProg: state.animProg,
      timeScale: state.timeScale,
      xRange: state.xRange,
      yRange: state.yRange,
      zRange: state.zRange,
      fillValue:state.fillValue,
      maskTexture: state.maskTexture,
      maskValue: state.maskValue,
      disablePointScale: state.disablePointScale,
      colorScale: state.colorScale,
      logConstant: state.logConstant,
      lowclip: state.lowclip,
      highclip: state.highclip,
      useLowclip: state.useLowclip,
      useHighclip: state.useHighclip,
    })))

    //Extract data and shape from Data3DTexture
    const { width, height, depth } = useMemo(() => {
        const [depth, height, width] = dataShape
        return {
          width: width,
          height: height,
          depth: depth,
        };
    }, [dataShape]);
    const globalscale = dataShape[2]/500
    const depthRatio = useMemo(()=> (shape && shape.x > 0 ? (shape.z / shape.x) * timeScale : 1),[shape, timeScale]);

    const geometries = useMemo(() => {
      const numPoints = depth * height * width;
      const maxPoints = 1e8;
      const stride = numPoints > maxPoints ? Math.ceil(numPoints / maxPoints) : 1;
      
      const subNumPoints = Math.floor(numPoints / stride);
      const indexData = new Int32Array(subNumPoints);
      
      let writePtr = 0;
      for (let i = 0; i < numPoints; i += stride) {
        if (writePtr < subNumPoints) {
          indexData[writePtr++] = i;
        }
      }
      const indexAttr = new THREE.Int32BufferAttribute(indexData, 1);
      const maxPointsPerDraw = 2e31 - 1; // 32bit limit
      const list = [];
      for (let offset = 0; offset < subNumPoints; offset += maxPointsPerDraw) {
        const count = Math.min(maxPointsPerDraw, subNumPoints - offset);
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('vertexIdx', indexAttr);
        geom.setDrawRange(offset, count);
        list.push(geom);
      }
      return list;
    }, [depth, width, height]);

    const {lonBounds, latBounds} = useCoordBounds() 

    const shaderMaterial = useMemo(()=> (new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        map: { value: volTexture },
        remapTexture: { value: remapTexture },
        textureDepths: { value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0]) },
        maskTexture: {value: maskTexture},
        maskValue: {value: maskValue},
        pointSize: {value: pointSize},
        cmap: {value: colormap},
        cOffset: {value: cOffset},
        cScale: {value: cScale},
        valueRange: {value: new THREE.Vector2(valueRange[0], valueRange[1])},
        scalePoints:{value: scalePoints},
        scaleIntensity: {value: scaleIntensity},
        timeScale: {value: depthRatio},
        animateProg: {value: animProg},
        aspect: {value: shape.x/shape.y},
        shape: {value: new THREE.Vector3(depth, height, width)},
        flatBounds:{value: new THREE.Vector4(xRange[0], xRange[1], zRange[0], zRange[1])},
        vertBounds:{value: new THREE.Vector2(yRange[0], yRange[1])},
        fillValue: {value: fillValue?? NaN},
        colorScale: {value: colorScaleToId(colorScale)},
        logConstant: {value: logConstant},
        logEps: {value: getLogEps(valueScales.minVal, valueScales.maxVal, (valueScales as any).minPosVal)},
        dataRange: {value: Math.max(valueScales.maxVal - valueScales.minVal, 1.0)},
        minVal: {value: valueScales.minVal},
        lowclip: {value: parseColorToVec4(lowclip)},
        highclip: {value: parseColorToVec4(highclip)},
        useLowclip: {value: useLowclip},
        useHighclip: {value: useHighclip},
      },
      defines: {
        GLOBAL_SCALE: globalscale*2,
        ...(remapTexture ? { REPROJECT: true } : {}),
        ...(disablePointScale ? { NO_SCALE: true } : {})
      },
      vertexShader: pointVert,
      fragmentShader:pointFrag,
      depthWrite: true,
      depthTest: true,
      blending:THREE.NoBlending,
    })
    ),[disablePointScale, remapTexture]);
  
   useEffect(() => {
    if (shaderMaterial) {
      const uniforms = shaderMaterial.uniforms;
      uniforms.map.value = volTexture;
      shaderMaterial.needsUpdate = true;
      uniforms.shape.value.set(depth, height, width);
      uniforms.pointSize.value = pointSize;
      uniforms.cmap.value = colormap;
      uniforms.cOffset.value = cOffset;
      uniforms.cScale.value = cScale;
      uniforms.valueRange.value.set(valueRange[0], valueRange[1]);
      uniforms.scalePoints.value = scalePoints;
      uniforms.scaleIntensity.value = scaleIntensity;
      uniforms.timeScale.value = depthRatio;
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
      uniforms.aspect.value = shape.x/shape.y;
      uniforms.colorScale.value = colorScaleToId(colorScale);
      uniforms.logConstant.value = logConstant;
      uniforms.logEps.value = getLogEps(valueScales.minVal, valueScales.maxVal, (valueScales as any).minPosVal);
      uniforms.dataRange.value = Math.max(valueScales.maxVal - valueScales.minVal, 1.0);
      uniforms.minVal.value = valueScales.minVal;
      uniforms.lowclip.value = parseColorToVec4(lowclip);
      uniforms.highclip.value = parseColorToVec4(highclip);
      uniforms.useLowclip.value = useLowclip;
      uniforms.useHighclip.value = useHighclip;
    }
  }, [volTexture, depthRatio, depth, height, shape, width, pointSize, colormap, cOffset, cScale, valueRange, scalePoints, scaleIntensity, animProg, xRange, yRange, fillValue, zRange, maskValue, colorScale, logConstant, valueScales, lowclip, highclip, useLowclip, useHighclip]);
  
  return (
    <group>
      <group scale={[globalscale,globalscale,globalscale]}>
        <ColumnMeshes />
      </group>
      <group scale={[1, (flipY && !remapTexture) ? -1 : 1, 1]}>
        {geometries.map((geom, idx) => (
          <points key={idx} geometry={geom} material={shaderMaterial} frustumCulled={false}/>
        ))}
      </group>
      <MappingCube/>
    </group>

  );
  }