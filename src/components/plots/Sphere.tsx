import { evaluateColorMap } from '@/components/textures';
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useDimAxis } from '@/hooks';
import { useCoordBounds } from '@/hooks/useCoordBounds';
import { GetCurrentArray, GetTimeSeries, parseUVCoords } from '@/utils/HelperFuncs';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/shallow';
import { SquareMeshes } from './TransectMeshes';
import * as D from '@/components/textures/TSL/utils/displacementUniforms'
import { uniformUpdater } from '@/hooks/useCommonUniforms';
import { createSphereMaterial } from '../textures/TSL/sphere';
function XYZtoRemap(xyz : THREE.Vector3, latBounds: number[], lonBounds : number[]){
    const lon = -Math.atan2(xyz.z,xyz.x)
    const lat = Math.asin(xyz.y);
    const u = (lon - lonBounds[0])/(lonBounds[1]-lonBounds[0])
    const v = (lat - latBounds[0])/(latBounds[1]-latBounds[0])
    return new THREE.Vector2(u,v)
}

export const Sphere = () => {
    const {isFlat, dimNames, dimUnits, dataShape, strides, flipY, remapTexture,
          setPlotDim,updateDimCoords, updateTimeSeries} = useGlobalStore(useShallow(s => ({
            isFlat: s.isFlat, dimNames: s.dimNames, dimUnits: s.dimUnits, 
            dataShape: s.dataShape, strides: s.strides, flipY: s.flipY, remapTexture: s.remapTexture,
            setPlotDim: s.setPlotDim, updateDimCoords: s.updateDimCoords, updateTimeSeries: s.updateTimeSeries
          })))
    const { selectTS, displacement, sphereResolution, fillValue, colorScale,
      getColorIdx, incrementColorIdx} = usePlotStore(useShallow(s => ({
        selectTS: s.selectTS, displacement: s.displacement, sphereResolution: s.sphereResolution, fillValue: s.fillValue,
        colorScale: s.colorScale, getColorIdx: s.getColorIdx, incrementColorIdx: s.incrementColorIdx
      })))
    const {analysisMode, analysisArray} = useAnalysisStore(useShallow(s => s))   
    const {xArray, yArray, zArray} = useDimAxis();
    const dimSlices = [zArray, yArray, xArray];
    const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, sphereResolution), [sphereResolution]);
    const shaderMaterial = useMemo( () => createSphereMaterial() , [])
    // No reprojection on Sphere. Remains static and can't update
    uniformUpdater();
    const backMaterial = useMemo(()=>{
      const mat = shaderMaterial.clone()
      mat.side = THREE.BackSide;
      return mat;
    },[shaderMaterial])

    const {lonBounds, latBounds} = useCoordBounds()
    function HandleTimeSeries(event: THREE.Intersection){
        const point = event.point.normalize();

        //const uv = XYZtoUV(point, texture?.source.data.width, texture?.source.data.height);
        const uv = XYZtoRemap(point, latBounds, lonBounds);
        uv.y = flipY ? 1 - uv.y : uv.y;
        const normal = new THREE.Vector3(0,0,1)
        const tempTS = GetTimeSeries({data:analysisMode ? analysisArray : GetCurrentArray(), shape:dataShape, stride:strides},{uv,normal})
        setPlotDim(0) //I think this 2 is only if there are 3-dims. Need to rework the logic
        const coordUV = parseUVCoords({normal:normal,uv})
        let dimCoords = coordUV.map((val,idx)=>val ? dimSlices[idx][Math.round(val*dimSlices[idx].length)] : null)
        const thisDimNames = dimNames.filter((_,idx)=> dimCoords[idx] !== null)
        const thisDimUnits = dimUnits.filter((_,idx)=> dimCoords[idx] !== null)
        dimCoords = dimCoords.filter(val => val !== null)
        const tsID = `${dimCoords[0]}_${dimCoords[1]}`
        const tsObj = {
          color: evaluateColorMap(getColorIdx() / 10, 'Paired'),
          data: tempTS,
          normal,
          uv,
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
    useEffect(()=>{
      D.displacement.value = displacement
    },[displacement])
  return (
    <group scale={[1, 1, 1]}>
      <SquareMeshes />
      <mesh renderOrder={1} geometry={geometry} material={shaderMaterial} onClick={e=>selectTS && HandleTimeSeries(e)}/>
      <mesh renderOrder={0} geometry={geometry} material={backMaterial} />
    </group>
  )
}
