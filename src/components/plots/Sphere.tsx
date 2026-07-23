import React, { useMemo, useEffect} from 'react'
import * as THREE from 'three'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useShallow } from 'zustand/shallow'
import { parseUVCoords, GetTimeSeries, GetCurrentArray, deg2rad } from '@/utils/HelperFuncs';
import { evaluateColorMap, colorScaleToId, exprToGLSL } from '@/components/textures';
import { SquareMeshes } from './TransectMeshes';
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { useAxisIndices } from '@/hooks';
import { sphereVertex, sphereFrag } from '@/components/textures/shaders'
import { createCommonUniforms, updateCommonUniforms, useCommonPlotState } from '@/utils/plotUniforms';

function XYZtoRemap(xyz : THREE.Vector3, latBounds: number[], lonBounds : number[]){
    const lon = Math.atan2(xyz.z,xyz.x)
    const lat = Math.asin(xyz.y);
    const u = (lon - deg2rad(lonBounds[0]))/(deg2rad(lonBounds[1])-deg2rad(lonBounds[0]))
    const v = (lat - deg2rad(latBounds[0]))/(deg2rad(latBounds[1])-deg2rad(latBounds[0]))
    return new THREE.Vector2(1-u,v)
}

export const Sphere = ({textures: propTextures} : {textures: THREE.Data3DTexture[] | THREE.DataTexture[] | null}) => {
    const textures = usePaddedTextures(propTextures);
    const commonState = useCommonPlotState();
    const { colormap, isFlat, valueScales, flipY, dataShape, textureArrayDepths, remapTexture,
            animProg, cOffset, cScale, nanColor, nanTransparency, fillValue, valueRange, maskTexture, maskValue,
            colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip, latBounds, lonBounds } = commonState;

    const { dimArrays, dimNames, dimUnits, strides, setPlotDim, updateDimCoords, updateTimeSeries } = useGlobalStore(useShallow(state=>({
      dimArrays: state.dimArrays, dimNames: state.dimNames, dimUnits: state.dimUnits, strides: state.strides,
      setPlotDim: state.setPlotDim, updateDimCoords: state.updateDimCoords, updateTimeSeries: state.updateTimeSeries
    })))

    const { animate, sphereDisplacement, sphereResolution, zSlice, ySlice, xSlice, selectTS, borderTexture,
      getColorIdx, incrementColorIdx } = usePlotStore(useShallow(state=> ({
        animate: state.animate,
        sphereDisplacement: state.displacement,
        sphereResolution: state.sphereResolution,
        zSlice: state.zSlice, ySlice: state.ySlice, xSlice: state.xSlice,
        selectTS: state.selectTS, borderTexture: state.borderTexture,
        getColorIdx: state.getColorIdx, incrementColorIdx: state.incrementColorIdx,
    })))
    const {analysisMode, analysisArray} = useAnalysisStore(useShallow(state => ({
      analysisMode: state.analysisMode,
      analysisArray: state.analysisArray
    })))

    const {xIdx, yIdx, zIdx} = useAxisIndices()
    const dimSlices = useMemo(() => {
      return [
        dimArrays[zIdx]?.slice(zSlice[0], zSlice[1] ?? undefined) ?? [],
        dimArrays[yIdx]?.slice(ySlice[0], ySlice[1] ?? undefined) ?? [],
        dimArrays.length > 2
          ? dimArrays[xIdx]?.slice(xSlice[0], xSlice[1] ?? undefined) ?? []
          : [],
      ];
    }, [dimArrays, zIdx, yIdx, xIdx, zSlice, ySlice, xSlice]);

    const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, sphereResolution), [sphereResolution]);

    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                ...createCommonUniforms(commonState),
                map: { value: textures },
                remapTexture: { value: remapTexture },
                textureDepths: {value: new THREE.Vector3(textureArrayDepths[2], textureArrayDepths[1], textureArrayDepths[0])},
                displaceZero: {value: -valueScales.minVal/(valueScales.maxVal-valueScales.minVal)},
                displacement: {value: sphereDisplacement},
            },
            defines:{
                ...(isFlat ? { IS_FLAT: true } : {}),
                ...(remapTexture ? { REPROJECT: true } : {}),
                'CUSTOM_EXPR(val)': colorScaleToId(colorScale) === 6 ? exprToGLSL(colorScale) : '(val)',
            },
            vertexShader: sphereVertex,
            fragmentShader: sphereFrag,
            blending: THREE.NormalBlending,
            side:THREE.FrontSide,
            transparent: true,
            depthWrite:true,
        })
        return shader
    },[isFlat, textures, borderTexture, commonState, sphereDisplacement, textureArrayDepths, valueScales])

    const backMaterial = useMemo(()=>{
      const mat = shaderMaterial.clone()
      mat.side = THREE.BackSide;
      return mat;
    },[shaderMaterial])

    const updateMaterial = (material: THREE.ShaderMaterial) => {
      const uniforms = material.uniforms;
      uniforms.map.value = textures;
      uniforms.remapTexture.value = remapTexture;
      if (remapTexture) {
        material.defines.REPROJECT = true;
      } else {
        delete material.defines.REPROJECT;
      }
      updateCommonUniforms(material, commonState);
      uniforms.displaceZero.value = -valueScales.minVal/(valueScales.maxVal-valueScales.minVal)
      uniforms.displacement.value = sphereDisplacement
      material.needsUpdate = true;
    }

    useEffect(()=>{
      if (shaderMaterial){
        updateMaterial(shaderMaterial)
      }
      if (backMaterial){
        updateMaterial(backMaterial)
      }
    },[textures, remapTexture, animProg, colormap, cOffset, cScale, animate, lonBounds, latBounds, nanColor, nanTransparency, sphereDisplacement,valueRange, fillValue, maskValue, valueScales, colorScale, logConstant, lowclip, highclip, useLowclip, useHighclip])
    
    
    function HandleTimeSeries(event: THREE.Intersection){
        const point = event.point.normalize();

        //const uv = XYZtoUV(point, texture?.source.data.width, texture?.source.data.height);
        const uv = XYZtoRemap(point, latBounds, lonBounds);
        const normal = new THREE.Vector3(0,0,1)
        const tsUV = flipY ? new THREE.Vector2(uv.x, 1-uv.y) : uv
        const tempTS = GetTimeSeries({data:analysisMode ? analysisArray : GetCurrentArray(), shape:dataShape, stride:strides},{uv:tsUV,normal})
        setPlotDim(0) //I think this 2 is only if there are 3-dims. Need to rework the logic
          
        const coordUV = parseUVCoords({normal:normal,uv:uv})
        let dimCoords = coordUV.map((val,idx)=>val ? dimSlices[idx][Math.round(val*dimSlices[idx].length)] : null)
        const thisDimNames = dimNames.filter((_,idx)=> dimCoords[idx] !== null)
        const thisDimUnits = dimUnits.filter((_,idx)=> dimCoords[idx] !== null)
        dimCoords = dimCoords.filter(val => val !== null)
        const tsID = `${dimCoords[0]}_${dimCoords[1]}`
        const tsObj = {
          color: evaluateColorMap(getColorIdx() / 10, 'Paired'),
          data: tempTS,
          normal,
          uv: tsUV,
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
            units:dimUnits[0]
          }
        }
        updateDimCoords({[tsID] : dimObj})
      }

  return (
    <group scale={[1, 1, 1]}>
      <SquareMeshes />
      <mesh renderOrder={1} geometry={geometry} material={shaderMaterial} onClick={e=>selectTS && HandleTimeSeries(e)}/>
      <mesh renderOrder={0} geometry={geometry} material={backMaterial} />
    </group>
  )
}
