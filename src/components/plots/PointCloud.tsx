import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import { pointFrag, pointVert } from '@/components/textures/shaders'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow';
import { deg2rad } from '@/utils/HelperFuncs';
import { useCoordBounds } from '@/hooks/useCoordBounds';
import { UVCube } from './UVCube';
import { ColumnMeshes } from './TransectMeshes';

import { usePaddedTextures } from '@/hooks/usePaddedTextures';

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
    const { flipY, dataShape, textureData, remapTexture, textureArrayDepths, shape } = useGlobalStore(useShallow(state=>({
      flipY: state.flipY,
      dataShape: state.dataShape,
      textureData: state.textureData,
      remapTexture: state.remapTexture,
      textureArrayDepths: state.textureArrayDepths,
      shape: state.shape
    })))
    const {scalePoints, scaleIntensity, pointSize, cScale, cOffset, valueRange, animProg, 
      timeScale, xRange, yRange, zRange, fillValue,
      maskTexture, maskValue, disablePointScale} = usePlotStore(useShallow(state => ({
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
      disablePointScale: state.disablePointScale
    })))

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

    const targetWidth = (remapTexture && remapTexture.image) ? remapTexture.image.width : width;
    const targetHeight = (remapTexture && remapTexture.image) ? remapTexture.image.height : height;
    const is2D = dataShape.length === 2;
    const depthRatio = useMemo(()=> (shape && shape.x > 0 ? (shape.z / shape.x) * timeScale : 1),[shape, timeScale]);

    // Create buffer geometries (divided into chunks of max 25M vertices to fit WebGL draw limit)
    const geometries = useMemo(() => {
      const numPoints = depth * targetHeight * targetWidth;
      const maxPoints = 100000000;
      const stride = numPoints > maxPoints ? Math.ceil(numPoints / maxPoints) : 1;
      
      const subNumPoints = Math.floor(numPoints / stride);
      const attrData = new Uint8Array(subNumPoints);
      const indexData = new Float32Array(subNumPoints);
      const originalData = data as Uint8Array;
      
      let writePtr = 0;
      for (let i = 0; i < numPoints; i += stride) {
        if (writePtr < subNumPoints) {
          attrData[writePtr] = originalData[i] ?? 0;
          indexData[writePtr] = i;
          writePtr++;
        }
      }
      
      const valueAttr = new THREE.Uint8BufferAttribute(attrData, 1);
      const indexAttr = new THREE.Float32BufferAttribute(indexData, 1);
      
      const maxPointsPerDraw = 25000000;
      const list = [];
      for (let offset = 0; offset < subNumPoints; offset += maxPointsPerDraw) {
        const count = Math.min(maxPointsPerDraw, subNumPoints - offset);
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('value', valueAttr);
        geom.setAttribute('vertexIdx', indexAttr);
        geom.setDrawRange(offset, count);
        list.push(geom);
      }
      return list;
    }, [data, depth, targetWidth, targetHeight]);
    const {lonBounds, latBounds} = useCoordBounds() 

    const shaderMaterial = useMemo(()=> (new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        map: { value: volTexture },
        remapTexture: { value: remapTexture },
        textureDepths: { value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0]) },
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
        timeScale: {value: depthRatio},
        animateProg: {value: animProg},
        shape: {value: new THREE.Vector3(depth, targetHeight, targetWidth)},
        nativeShape: {value: new THREE.Vector3(dataShape[0], dataShape[1], dataShape[2])},
        flatBounds:{value: new THREE.Vector4(xRange[0], xRange[1], zRange[0], zRange[1])},
        vertBounds:{value: new THREE.Vector2(yRange[0], yRange[1])},
        fillValue: {value: fillValue?? NaN}
      },
      defines: {
        REPROJECT: remapTexture ? true : false,
        FLIP_Y: flipY ? true : false,
        IS_2D: is2D,
        NO_SCLAE:disablePointScale,
      },
      vertexShader: pointVert,
      fragmentShader:pointFrag,
      depthWrite: true,
      depthTest: true,
      blending:THREE.NoBlending,
    })
    ),[disablePointScale, is2D]);
  
   useEffect(() => {
    if (shaderMaterial) {
      const uniforms = shaderMaterial.uniforms;
      uniforms.map.value = volTexture;
      uniforms.remapTexture.value = remapTexture;
      if (remapTexture) {
        shaderMaterial.defines.REPROJECT = true;
      } else {
        delete shaderMaterial.defines.REPROJECT;
      }
      if (flipY) {
        shaderMaterial.defines.FLIP_Y = true;
      } else {
        delete shaderMaterial.defines.FLIP_Y;
      }
      if (is2D) {
        shaderMaterial.defines.IS_2D = true;
      } else {
        delete shaderMaterial.defines.IS_2D;
      }
      shaderMaterial.needsUpdate = true;
      uniforms.shape.value.set(depth, targetHeight, targetWidth);
      uniforms.nativeShape.value.set(dataShape[0], dataShape[1], dataShape[2]);
      uniforms.pointSize.value = pointSize;
      uniforms.cmap.value = colormap;
      uniforms.cOffset.value = cOffset;
      uniforms.cScale.value = cScale;
      uniforms.valueRange.value.set(valueRange[0], valueRange[1]);
      uniforms.scalePoints.value = scalePoints;
      uniforms.scaleIntensity.value = scaleIntensity;
      uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
      uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
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
    }
  }, [volTexture, remapTexture, flipY, is2D, depthRatio, depth, targetHeight, targetWidth, pointSize, colormap, cOffset, cScale, valueRange, scalePoints, scaleIntensity, animProg, xRange, yRange, fillValue, zRange, maskValue, lonBounds, latBounds]);
  const tsScale = dataShape[2]/500
  return (
    <group scale={[1, 1, 1]}>
      <group scale={[tsScale,tsScale,tsScale]}>
        <ColumnMeshes />
      </group>
      {geometries.map((geom, idx) => (
        <points key={idx} geometry={geom} material={shaderMaterial} frustumCulled={false}/>
      ))}
      <MappingCube/>
    </group>

  );
  }