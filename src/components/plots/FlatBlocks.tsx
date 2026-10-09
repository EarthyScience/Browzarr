import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useCoordBounds, useDimAxis, useValueScales } from '@/hooks';
import { uniformUpdater } from '@/hooks/useCommonUniforms';
import { usePaddedTextures } from '@/hooks/usePaddedTextures';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createFlatBlocksMaterial } from '../textures/TSL/flatBlocks';
import * as su from '@/components/textures/TSL/sphereBlocks';
import * as du from '@/components/textures/TSL/utils/displacementUniforms';

const FlatBlocks = () => {
    const {isFlat, flipY, dataShape, axisDimArrays, remapBorders} = useGlobalStore(useShallow(s => ({
        isFlat: s.isFlat, flipY: s.flipY, dataShape: s.dataShape, axisDimArrays: s.axisDimArrays, 
        remapTexture: s.remapTexture, remapBorders: s.remapBorders
    })))
    const { displacement, offsetNegatives, rotateFlat, colorScale} = usePlotStore(useShallow(s => ({
        displacement: s.displacement, offsetNegatives: s.offsetNegatives, rotateFlat: s.rotateFlat, colorScale: s.colorScale
    })))
    const {analysisMode, analysisDim:axis} = useAnalysisStore(useShallow(s => s))
    const valueScales = useValueScales();
    const {xArray, yArray} = useDimAxis()
    const {width, height} = useMemo(()=>{
        if (analysisMode){
            const thisShape = dataShape.filter((_val, idx) => idx != axis)
            return {width: thisShape[1], height: thisShape[0]}
        } else {
            return {width: xArray.length, height: yArray.length}
        }
    },[analysisMode, axis, dataShape,xArray, yArray, axisDimArrays]) 
    const rotateMap = analysisMode && axis == 2;
    const count = useMemo(()=>{
            const count = width * height;
            if (count * 16 *4 > 2e9){
                useErrorStore.setState({ error:'largeArray' })
                return 0
            }
            du.resolution.value = new THREE.Vector2(width,height);
            return count
        },[width, height])
    const geometry = useMemo(()=>{
        const sqWidth = 2;
        const aspect = width/height
        const boxHeight = 0.05;
        const geo = new THREE.BoxGeometry(sqWidth/width, sqWidth/height/aspect, boxHeight);
        geo.translate(0, 0, boxHeight / 2,);
        return geo
    },[width, height])
    const {material, calcPositions} = useMemo(() => createFlatBlocksMaterial(count) , [count])
    material.depthWrite = true;
    material.depthTest = true;
    const mesh = useMemo(()=>{
        const newMesh = new THREE.Mesh(geometry, material)
        newMesh.count = count;
        newMesh.frustumCulled = false;
        return newMesh
    },[geometry, material])

    const {gl} = useThree();
    useEffect(()=>{
        //@ts-ignore it exists but not listed in the type
        calcPositions && gl.computeAsync(calcPositions).then(()=>console.log("compute ran"))
    },[calcPositions])

    // --- UNIFORMS --- //
    uniformUpdater();
    const {lonBounds, latBounds} = useCoordBounds()
    useEffect(()=>{
                du.displacement.value = displacement
                du.displaceZero.value = offsetNegatives ? 0 : (-valueScales.minVal/(valueScales.maxVal-valueScales.minVal))
                su.widthFactor.value = Math.abs(lonBounds[1]-lonBounds[0])/(2.0*Math.PI)
                su.vertFactor.value =  Math.abs(latBounds[1]-latBounds[0])/(Math.PI)
        },[valueScales, displacement, offsetNegatives, lonBounds])
  return (
    <group rotation={[rotateFlat ? -Math.PI/2 : 0, 0, 0]} scale={[1, flipY ? -1 : 1, 1]}>
        <primitive object={mesh} />
    </group>
  )
}

export { FlatBlocks };

