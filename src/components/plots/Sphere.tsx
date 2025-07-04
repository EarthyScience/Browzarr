import React, {useEffect, useMemo, useState} from 'react'
import * as THREE from 'three'
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import { ZarrDataset } from '@/components/zarr/ZarrLoaderLRU';
import { useShallow } from 'zustand/shallow'
import { vertexShader, sphereFrag } from '../textures/shaders'
import { useFrame } from '@react-three/fiber'
import { parseUVCoords } from '@/utils/HelperFuncs';


function XYZtoUV(xyz : THREE.Vector3){
    const lon = Math.atan2(xyz.z,xyz.x)
    const lat = Math.asin(xyz.y);
    let u = (lon + Math.PI) / (2 * Math.PI);
    u = 1 - u;
    const v = (lat + Math.PI / 2) / Math.PI;
    return new THREE.Vector2(u,v)
}

export const Sphere = ({texture, ZarrDS} : {texture: THREE.Data3DTexture | THREE.DataTexture | null, ZarrDS: ZarrDataset}) => {
    const {colormap, flipY} = useGlobalStore(useShallow(state=> ({
        colormap: state.colormap,
        flipY: state.flipY
    })))
    const {setTimeSeries,setPlotDim,setDimCoords} = useGlobalStore(useShallow(state=>({
      setTimeSeries:state.setTimeSeries, 
      setPlotDim:state.setPlotDim, 
      setDimCoords:state.setDimCoords
    })))

    const {dimArrays,dimNames,dimUnits} = useGlobalStore(useShallow(state=>({
        shape:state.shape,
        dimArrays:state.dimArrays,
        dimNames:state.dimNames,
        dimUnits:state.dimUnits
    })))

    const {animate, cOffset, cScale, resetAnim, selectTS} = usePlotStore(useShallow(state=> ({
        animate: state.animate,
        cOffset: state.cOffset,
        cScale: state.cScale,
        resetAnim: state.resetAnim,
        selectTS: state.selectTS
    })))

    const [highlightPos, setHighlightPos] = useState<THREE.Vector2 | null>(null)
    const selectBounds = useMemo(()=>{
        const {height, width} = texture?.source.data
        if (highlightPos){
            const widthID = Math.round(highlightPos.x*width-.5)+.5;
            const heightID = Math.round(highlightPos.y*height-.5)+.5;
            const delX = 1/width;
            const delY = 1/height;
            const xBounds = [widthID/width-delX/2,widthID/width+delX/2]
            const yBounds = [heightID/height-delY/2,heightID/height+delY/2]
            const bounds = new THREE.Vector4(...xBounds, ...yBounds)
            console.log(widthID)
            return bounds
        }
        return new THREE.Vector2(width, height)
    },[texture,highlightPos])


    const [animateProg, setAnimateProg] = useState<number>(0);
    const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 9), []);
    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                map: { value: texture },
                selectTS: {value: selectTS},
                selectBounds: {value: selectBounds},
                cmap:{value: colormap},
                cOffset:{value: cOffset},
                cScale: {value: cScale},
                animateProg: {value: animateProg}
            },
            vertexShader,
            fragmentShader: sphereFrag,
            blending: THREE.NormalBlending,
        })
        return shader
    },[texture, animateProg, colormap, cOffset, cScale, animate, selectBounds, selectTS])

    useFrame(()=>{
        if (animate){
            const newProg = animateProg + 0.001
            setAnimateProg(newProg % 1.)
        }
    })

    useEffect(()=>{
        setAnimateProg(0)
    },[resetAnim])

    function HandleTimeSeries(event: THREE.Intersection){
        const point = event.point.normalize();
        const uv = XYZtoUV(point);
        const normal = new THREE.Vector3(0,0,1)
    
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
        setHighlightPos(uv);
      }



  return (
    <>
    <mesh geometry={geometry} material={shaderMaterial} scale={[1, flipY ? -1 : 1, 1]} onClick={e=>selectTS && HandleTimeSeries(e)}/>
    
    </>
  )
}
