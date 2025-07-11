import * as THREE from 'three'
import { useMemo, useState, useEffect, useRef } from 'react';
import { ZarrDataset } from '@/components/zarr/ZarrLoaderLRU';
import { parseUVCoords, getUnitAxis } from '@/utils/HelperFuncs';
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';


export const UVCube = ({ZarrDS} : {ZarrDS:ZarrDataset} )=>{

  const [clickPoint, setClickPoint] = useState<THREE.Vector3 | null>(null);
  const {setTimeSeries,setPlotDim,setDimCoords, updateTimeSeries, updateDimCoords} = useGlobalStore(
    useShallow(state=>({
      setTimeSeries:state.setTimeSeries, 
      setPlotDim:state.setPlotDim, 
      setDimCoords:state.setDimCoords,
      updateTimeSeries: state.updateTimeSeries,
      updateDimCoords: state.updateDimCoords
    })))

  const {shape,dimArrays,dimNames,dimUnits} = useGlobalStore(
    useShallow(state=>({
      shape:state.shape,
      dimArrays:state.dimArrays,
      dimNames:state.dimNames,
      dimUnits:state.dimUnits
    })))
  
  const selectTS = usePlotStore(state => state.selectTS)
  const lastNormal = useRef<number | null> ( null)

  function HandleTimeSeries(event: THREE.Intersection){
    const point = event.point;
    const uv = event.uv!;
    const normal = event.normal!;
    const dimAxis = getUnitAxis(normal);
    if (dimAxis != lastNormal.current){
      setTimeSeries({}); //Clear timeseries if new axis
      setDimCoords({});
    }
    lastNormal.current = dimAxis;
    
    if(ZarrDS){
      const tempTS = ZarrDS.GetTimeSeries({uv,normal})
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
      const tsID = `${dimCoords[0]}_${dimCoords[1]}`
      updateTimeSeries({ [tsID] : tempTS})
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
    }
    setClickPoint(point);
  }

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  useEffect(() => {
    return () => {
      geometry.dispose(); // Dispose when unmounted
    };
  }, []);

  return (
    <>
      <mesh geometry={geometry} scale={shape} onClick={(e) => {
        e.stopPropagation();
        if (e.intersections.length > 0 && selectTS) {
          HandleTimeSeries(e.intersections[0]);
        }
      }}>
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