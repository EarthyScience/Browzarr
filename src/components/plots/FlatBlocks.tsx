import * as u from '@/components/textures/TSL/utils/uniforms';
import { uniformUpdater } from '@/components/textures/TSL/utils/uniformUpdater';
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useDimAxis } from '@/hooks';
import { useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useShallow } from 'zustand/shallow';
import { createFlatBlocksMaterial } from '../textures/TSL/flatBlocks';
const FlatBlocks = () => {
    const {flipY, dataShape, axisDimArrays, remapTexture} = useGlobalStore(useShallow(s => ({
        isFlat: s.isFlat, flipY: s.flipY, dataShape: s.dataShape, axisDimArrays: s.axisDimArrays, 
        remapTexture: s.remapTexture, 
    })))
    const {rotateFlat, colorScale} = usePlotStore(useShallow(s => ({rotateFlat: s.rotateFlat, colorScale: s.colorScale})))
    const {analysisMode, analysisDim:axis} = useAnalysisStore(useShallow(s => s))
    const {xArray, yArray} = useDimAxis()
    const {width, height} = useMemo(()=>{
        const [width, height] = remapTexture 
            ? [remapTexture.image.width, remapTexture.image.height] 
            : [xArray.length, yArray.length]
        if (analysisMode && axis != 0){
            const thisShape = dataShape.filter((_val, idx) => idx != axis)
            u.displacementResolution.value = new THREE.Vector2(thisShape[1], thisShape[0])
            return {width: thisShape[1], height: thisShape[0]}
        } else {
            u.displacementResolution.value = new THREE.Vector2(width, height)
            return {width, height}
        }
    },[analysisMode, axis, dataShape,xArray, yArray, axisDimArrays, remapTexture]) 
    const rotateMap = analysisMode && axis == 2;
    const count = useMemo(()=>{
            const count = width * height;
            if (count * 16 *4 > 2e9){
                useErrorStore.setState({ error:'largeArray' })
                return 0
            }
            u.displacementResolution.value = new THREE.Vector2(width,height);
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
    const material = useMemo(()=>createFlatBlocksMaterial(count),[count, colorScale])
    material.depthWrite = true;
    material.depthTest = true;
    const mesh = useMemo(()=>{
        const newMesh = new THREE.Mesh(geometry, material)
        newMesh.count = count;
        newMesh.frustumCulled = false;
        return newMesh
    },[geometry, material])
    // --- UNIFORMS --- //
    uniformUpdater();
  return (
    <group rotation={[rotateFlat ? -Math.PI/2 : 0, 0, rotateMap ? Math.PI/2 : 0]} scale={[1, (flipY || rotateMap) ? -1 : 1, 1]} >
        <primitive object={mesh} />
    </group>
  )
}

export { FlatBlocks };

