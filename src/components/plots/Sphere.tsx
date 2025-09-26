import React, {useRef, useMemo, useState, useEffect} from 'react'
import * as THREE from 'three'
import { useAnalysisStore, useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import { ZarrDataset } from '@/components/zarr/ZarrLoaderLRU';
import { useShallow } from 'zustand/shallow'
import { vertexShader, sphereFrag, flatSphereFrag } from '../textures/shaders'
import { parseUVCoords, GetTimeSeries, GetCurrentArray } from '@/utils/HelperFuncs';
import { evaluate_cmap } from 'js-colormaps-es';


function XYZtoUV(xyz : THREE.Vector3, width: number, height : number){
    const lon = Math.atan2(xyz.z,xyz.x)
    const lat = Math.asin(xyz.y);
    let u = (lon + Math.PI) / (2 * Math.PI);
    u = 1 - u;
    let v = (lat + Math.PI / 2) / Math.PI;
    u = Math.round(u*width-.5)/width
    v = Math.round(v*height-.5)/height
    return new THREE.Vector2(u,v)
}

function XYZtoRemap(xyz : THREE.Vector3, latBounds: number[], lonBounds : number[]){
    const lon = Math.atan2(xyz.z,xyz.x)
    const lat = Math.asin(xyz.y);
    const u = (lon - deg2rad(lonBounds[0]))/(deg2rad(lonBounds[1])-deg2rad(lonBounds[0]))
    const v = (lat - deg2rad(latBounds[0]))/(deg2rad(latBounds[1])-deg2rad(latBounds[0]))
    return new THREE.Vector2(1-u,v)
}

function deg2rad(deg: number){
  return deg*Math.PI/180;
}

export const Sphere = ({texture, ZarrDS} : {texture: THREE.Data3DTexture | THREE.DataTexture | null, ZarrDS: ZarrDataset}) => {
    const {colormap, isFlat} = useGlobalStore(useShallow(state=> ({
        colormap: state.colormap,
        isFlat: state.isFlat
    })))
    const {setPlotDim,updateDimCoords, updateTimeSeries} = useGlobalStore(useShallow(state=>({
      setPlotDim:state.setPlotDim, 
      updateDimCoords:state.updateDimCoords,
      updateTimeSeries: state.updateTimeSeries
    })))
    const {analysisMode, analysisArray} = useAnalysisStore(useShallow(state => ({
      analysisMode: state.analysisMode,
      analysisArray: state.analysisArray
    })))

    const {dimArrays,dimNames,dimUnits, timeSeries, dataShape, strides, flipY} = useGlobalStore(useShallow(state=>({
        dimArrays:state.dimArrays,
        dimNames:state.dimNames,
        dimUnits:state.dimUnits,
        timeSeries: state.timeSeries,
        dataShape: state.dataShape,
        strides: state.strides,
        flipY: state.flipY
    })))

    const {animate, animProg, cOffset, cScale, selectTS, lonExtent, latExtent, 
      lonResolution, latResolution, nanColor, nanTransparency,
      getColorIdx, incrementColorIdx} = usePlotStore(useShallow(state=> ({
        animate: state.animate,
        animProg: state.animProg,
        cOffset: state.cOffset,
        cScale: state.cScale,
        selectTS: state.selectTS,
        lonExtent: state.lonExtent,
        latExtent: state.latExtent,
        lonResolution: state.lonResolution,
        latResolution: state.latResolution,
        nanColor: state.nanColor,
        nanTransparency: state.nanTransparency,
        getColorIdx: state.getColorIdx,
        incrementColorIdx: state.incrementColorIdx
    })))

    const [boundsObj, setBoundsObj] = useState<Record<string, THREE.Vector4>>({})
    const [bounds, setBounds] = useState<THREE.Vector4[]>(new Array(10).fill(new THREE.Vector4(-1 , -1, -1, -1)))
    const {height, width} = useMemo(()=>texture?.source.data, [texture])

    useEffect(()=>{ //This goes through the list of highlighted squares and removes those that aren't included in the timeseries object.
      let boundIDs = Object.keys(boundsObj)
      const tsIDs = Object.keys(timeSeries)
      boundIDs = boundIDs.filter((val) => tsIDs.includes(val))
      const pointValues = boundIDs.map(id => boundsObj[id]);
      const paddedArray = [
        ...pointValues,
        ...Array(Math.max(0, 10 - pointValues.length)).fill(new THREE.Vector4(-1 , -1, -1, -1))
      ];
      setBounds(paddedArray)
    },[boundsObj, timeSeries])

    function addBounds(uv : THREE.Vector2, tsID: string){ //This adds the bounds in UV space of a selected square on the sphere. 
      const widthID = Math.floor(uv.x*(width))+.5;
      const heightID = Math.ceil(uv.y*height)-.5 ;
      const delX = 1/width;
      const delY = 1/height;
      const xBounds = [widthID/width-delX/2,widthID/width+delX/2]
      const yBounds = [heightID/height-delY/2,heightID/height+delY/2]
      const bounds = new THREE.Vector4(...xBounds, ...yBounds)
      const newBoundObj = {[tsID] : bounds}
      setBoundsObj(prev=>{ return {...newBoundObj, ...prev}})
    }


    const [lonBounds, latBounds] = useMemo(()=>{ //The bounds for the shader. It takes the middle point of the furthest coordinate and adds the distance to edge of pixel
      const newLatStep = latResolution/2;
      const newLonStep = lonResolution/2;
      const newLonBounds = [Math.max(lonExtent[0]-newLonStep, -180), Math.min(lonExtent[1]+newLonStep, 180)]
      const newLatBounds = [Math.max(latExtent[0]-newLatStep, -90), Math.min(latExtent[1]+newLatStep, 90)]
      return [newLonBounds, newLatBounds]
    },[latExtent, lonExtent, lonResolution, latResolution])

    const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 9), []);
    
    const shaderMaterial = useMemo(()=>{
        const shader = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            uniforms: {
                map: { value: texture },
                selectTS: {value: selectTS},
                selectBounds: {value: bounds},
                cmap:{value: colormap},
                cOffset:{value: cOffset},
                cScale: {value: cScale},
                animateProg: {value: animProg},
                latBounds: {value: new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))},
                lonBounds: {value: new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))},
                nanColor: {value: new THREE.Color(nanColor)},
                nanAlpha: {value: 1 - nanTransparency}
            },
            vertexShader,
            fragmentShader: isFlat ? flatSphereFrag : sphereFrag,
            blending: THREE.NormalBlending,
            side:THREE.FrontSide,
            transparent: true,
            depthWrite:false,

        })
        return shader
    },[isFlat])
    const backMaterial = shaderMaterial.clone()
    backMaterial.side = THREE.BackSide;
    useEffect(()=>{
      if (shaderMaterial){
        const uniforms = shaderMaterial.uniforms;
        uniforms.map. value =  texture 
        uniforms.selectTS.value =  selectTS
        uniforms.selectBounds.value =  bounds
        uniforms.cmap.value =  colormap
        uniforms.cOffset.value =  cOffset
        uniforms.cScale.value =  cScale
        uniforms.animateProg.value =  animProg
        uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
        uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
        uniforms.nanColor.value =  new THREE.Color(nanColor)
        uniforms.nanAlpha.value =  1 - nanTransparency
      }
      if (backMaterial){
        const uniforms = backMaterial.uniforms;
        uniforms.map. value =  texture 
        uniforms.selectTS.value =  selectTS
        uniforms.selectBounds.value =  bounds
        uniforms.cmap.value =  colormap
        uniforms.cOffset.value =  cOffset
        uniforms.cScale.value =  cScale
        uniforms.animateProg.value =  animProg
        uniforms.latBounds.value =  new THREE.Vector2(deg2rad(latBounds[0]), deg2rad(latBounds[1]))
        uniforms.lonBounds.value =  new THREE.Vector2(deg2rad(lonBounds[0]), deg2rad(lonBounds[1]))
        uniforms.nanColor.value =  new THREE.Color(nanColor)
        uniforms.nanAlpha.value =  1 - nanTransparency
      }
    },[texture, animProg, colormap, cOffset, cScale, animate, bounds, selectTS, lonBounds, latBounds, nanColor, nanTransparency])
    
    
    function HandleTimeSeries(event: THREE.Intersection){
        const point = event.point.normalize();

        //const uv = XYZtoUV(point, texture?.source.data.width, texture?.source.data.height);
        const uv = XYZtoRemap(point, latBounds, lonBounds);
        const normal = new THREE.Vector3(0,0,1)
    
        if(ZarrDS){
          const tsUV = flipY ? new THREE.Vector2(uv.x, 1-uv.y) : uv
          const tempTS = GetTimeSeries({data:analysisMode ? analysisArray : GetCurrentArray(), shape:dataShape, stride:strides},{uv:tsUV,normal})
          setPlotDim(0) //I think this 2 is only if there are 3-dims. Need to rework the logic
            
          const coordUV = parseUVCoords({normal:normal,uv:uv})
          let dimCoords = coordUV.map((val,idx)=>val ? dimArrays[idx][Math.round(val*dimArrays[idx].length)] : null)
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
              units:dimUnits[0]
            }
          }
          updateDimCoords({[tsID] : dimObj})
          addBounds(uv, tsID);
        }
        
      }

  return (
    <>
    <mesh renderOrder={1} geometry={geometry} material={shaderMaterial} onClick={e=>selectTS && HandleTimeSeries(e)}/>
    <mesh renderOrder={0} geometry={geometry} material={backMaterial} />
    </>
  )
}
