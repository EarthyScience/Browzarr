import * as THREE from 'three'
import { useState } from 'react';
import { ZarrDataset } from '@/components/zarr/ZarrLoaderLRU';
import { parseUVCoords } from '@/utils/HelperFuncs';
import { useGlobalStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';


export const UVCube = ({ZarrDS} : {ZarrDS:ZarrDataset} )=>{

  const [clickPoint, setClickPoint] = useState<THREE.Vector3 | null>(null);
  const {setTimeSeries,setPlotDim,setDimCoords} = useGlobalStore(
    useShallow(state=>({
      setTimeSeries:state.setTimeSeries, 
      setPlotDim:state.setPlotDim, 
      setDimCoords:state.setDimCoords})))

  const {shape,dimArrays,dimNames,dimUnits} = useGlobalStore(
    useShallow(state=>({
      shape:state.shape,
      dimArrays:state.dimArrays,
      dimNames:state.dimNames,
      dimUnits:state.dimUnits
    })))


  function HandleTimeSeries(event: THREE.Intersection){
    const point = event.point;
    const uv = event.uv!;
    const normal = event.normal!;

    if(ZarrDS){
      ZarrDS.GetTimeSeries({uv,normal}).then((e)=> setTimeSeries(e))
      const plotDim = (normal.toArray()).map((val, idx) => {
        if (Math.abs(val) > 0) {
          return idx;
        }
        return null;}).filter(idx => idx !== null);
      setPlotDim(2-plotDim[0]) //I think this 2 is only if there are 3-dims. Need to rework the logic

      const coordUV = parseUVCoords({normal:normal,uv:uv})
      let dimCoords = coordUV.map((val,idx)=>val ? dimArrays[idx][Math.round(val*dimArrays[idx].length)] : null)
      const thisDimNames = dimNames.filter((_,idx)=> dimCoords[idx] !== null)
      const thisDimUnits = dimUnits.filter((_,idx)=> dimCoords[idx] !== null)
      dimCoords = dimCoords.filter(val => val !== null)
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
      setDimCoords(dimObj)
    }
    setClickPoint(point);
  }

  return (
    <>
      <mesh scale={shape} onClick={(e) => {
        e.stopPropagation();
        if (e.intersections.length > 0) {
          HandleTimeSeries(e.intersections[0]);
        }
      }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {clickPoint && (
        <mesh position={clickPoint} scale={0.01}>
          <boxGeometry />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
    </>
  )
}