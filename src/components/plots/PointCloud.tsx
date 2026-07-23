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
import { colorScaleToId, exprToGLSL } from '@/components/textures';
import { createCommonUniforms, updateCommonUniforms, useCommonPlotState } from '@/utils/plotUniforms';

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
    const commonState = useCommonPlotState();
    const { valueScales, flipY, dataShape, textureArrayDepths, remapTexture, shape,
            animProg, cOffset, cScale, nanColor, nanTransparency, fillValue, valueRange, maskTexture, maskValue,
            colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip, latBounds, lonBounds } = commonState;

    const { scalePoints, scaleIntensity, pointSize, timeScale, xRange, yRange, zRange, disablePointScale } = usePlotStore(useShallow(state => ({
      scalePoints: state.scalePoints, scaleIntensity: state.scaleIntensity, pointSize: state.pointSize,
      timeScale: state.timeScale, xRange: state.xRange, yRange: state.yRange, zRange: state.zRange, disablePointScale: state.disablePointScale
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

    const shaderMaterial = useMemo(()=> (new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        ...createCommonUniforms({ ...commonState, colormap }),
        map: { value: volTexture },
        remapTexture: { value: remapTexture },
        textureDepths: { value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0]) },
        pointSize: {value: pointSize},
        scalePoints:{value: scalePoints},
        scaleIntensity: {value: scaleIntensity},
        timeScale: {value: depthRatio},
        aspect: {value: shape.x/shape.y},
        shape: {value: new THREE.Vector3(depth, height, width)},
        flatBounds:{value: new THREE.Vector4(xRange[0], xRange[1], zRange[0], zRange[1])},
        vertBounds:{value: new THREE.Vector2(yRange[0], yRange[1])},
      },
      defines: {
        GLOBAL_SCALE: globalscale*2,
        ...(remapTexture ? { REPROJECT: true } : {}),
        ...(disablePointScale ? { NO_SCALE: true } : {}),
        'CUSTOM_EXPR(val)': colorScaleToId(colorScale) === 6 ? exprToGLSL(colorScale) : '(val)',
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
      updateCommonUniforms(shaderMaterial, { ...commonState, colormap });
      uniforms.shape.value.set(depth, height, width);
      uniforms.pointSize.value = pointSize;
      uniforms.scalePoints.value = scalePoints;
      uniforms.scaleIntensity.value = scaleIntensity;
      uniforms.timeScale.value = depthRatio;
      uniforms.flatBounds.value.set(
        xRange[0], xRange[1], 
        zRange[0], zRange[1]
      );
      uniforms.vertBounds.value.set(
        yRange[0], yRange[1]
      );
      uniforms.aspect.value = shape.x/shape.y;
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