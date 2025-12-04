"use client";
import React, {useEffect, useState, useMemo} from 'react'
import { useAnalysisStore, useGlobalStore, usePlotStore } from '@/utils/GlobalStates';
import * as THREE from 'three'
import { useShallow } from 'zustand/shallow';
import { useFrame } from '@react-three/fiber';
import {vertexShader, bordersFrag} from '../textures/shaders'
import { invalidate } from '@react-three/fiber';

function Reproject([lon, lat] : [number, number], lonBounds: [number, number], latBounds: [number, number]){
    let newLon = (lon-lonBounds[0])/(lonBounds[1]-lonBounds[0]);
    let newLat = (lat-latBounds[0])/(latBounds[1]-latBounds[0]);
    newLon -= 0.5
    newLon *= 2;
    newLat -= 0.5;
    newLat *= 2;
    return [newLon, newLat/2, 0]
}

function Spherize([lon, lat] : [number, number]){
    const radLat = lat*Math.PI/180;
    const radLon = lon*Math.PI/180;
    const radius = 1.001;
    const x = Math.cos(radLat) * Math.cos(radLon);
    const y = Math.sin(radLat);
    const z = Math.cos(radLat) * Math.sin(radLon);
    return [x * radius, y * radius, z * radius]
}

function Borders({features}:{features: any}){
    const {xRange, yRange, plotType, borderColor, lonExtent, latExtent, lonResolution, latResolution} = usePlotStore(useShallow(state => ({
        xRange: state.xRange, yRange: state.yRange,
        plotType: state.plotType, borderColor: state.borderColor,
        lonExtent: state.lonExtent, latExtent: state.latExtent,
        lonResolution: state.lonResolution, latResolution: state.latResolution,
    })))
    const {flipY, shape } = useGlobalStore(useShallow(state => ({
        flipY: state.flipY,
        shape: state.shape
    })))

    const [lonBounds, latBounds] = useMemo(()=>{ //The bounds for the shader. It takes the middle point of the furthest coordinate and adds the distance to edge of pixel
          const newLatStep = latResolution/2;
          const newLonStep = lonResolution/2;
          const newLonBounds = [Math.max(lonExtent[0]-newLonStep, -180), Math.min(lonExtent[1]+newLonStep, 180)]
          let newLatBounds = [Math.max(latExtent[0]-newLatStep, -90), Math.min(latExtent[1]+newLatStep, 90)]
          newLatBounds = flipY ? [newLatBounds[1], newLatBounds[0]] : newLatBounds
          return [newLonBounds as [number, number], newLatBounds as [number, number]]
        },[latExtent, lonExtent, lonResolution, latResolution])

    const [spherize, setSpherize] = useState<boolean>(false)

    useEffect(()=>{
        if (plotType === 'sphere'){
            setSpherize(true)
        }
        else{
            setSpherize(false)
        }

    },[plotType])

    const lineShaderMat = useMemo(()=>new THREE.ShaderMaterial(
        {
            glslVersion: THREE.GLSL3,
            vertexShader,
            fragmentShader: bordersFrag,
            uniforms:{
                xBounds: {value: new THREE.Vector2(xRange[0], xRange[1])},
                yBounds: {value: new THREE.Vector2(yRange[0]/shape.x, yRange[1]/shape.x)},
                borderColor: {value: new THREE.Color(borderColor)},
                trim: {value: !spherize},
            }
        }
    ),[])

    useEffect(()=>{
        if (lineShaderMat){
            const uniforms = lineShaderMat.uniforms
            uniforms.xBounds.value = new THREE.Vector2(xRange[0], xRange[1])
            uniforms.yBounds.value = new THREE.Vector2(yRange[0]/shape.x, yRange[1]/shape.x)
            uniforms.borderColor.value = new THREE.Color(borderColor)
            uniforms.trim.value = !spherize
            invalidate()
        }
    },[xRange, yRange, borderColor, spherize])

    const lineGeometries = useMemo(() => {
    return features.flatMap((feature: any, i: number) => {
        const lines = [];

        if (feature.geometry.type === 'LineString') {
        const points: THREE.Vector3[] = [];
        feature.geometry.coordinates.forEach(([lon, lat]: [number, number]) => {
            const [x, y, z] = spherize
            ? Spherize([ -lon, lat])
            : Reproject([lon, lat],lonBounds,latBounds);
            points.push(new THREE.Vector3(x, y, z));
        });
        const positions = new Float32Array(points.length * 3);
        points.forEach((point, i) => {
            positions.set([point.x, point.y, point.z], i * 3);
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        lines.push(
            geometry
        );
        }

        else if (feature.geometry.type === 'MultiPolygon') {
        const islands = feature.geometry.coordinates;
        islands.forEach((island: number[][][], idx: number) => {
            let thisIdx = idx;
            const ring = island[0]; // outer ring
            const islandPoints: THREE.Vector3[] = [];
            ring.forEach(([lon, lat]) => {
                thisIdx ++;
            const [x, y, z] = spherize
                ? Spherize([ -lon, lat])
                : Reproject([lon, lat],lonBounds,latBounds);
                islandPoints.push(new THREE.Vector3(x, y, z));
            });
            const positions = new Float32Array(islandPoints.length * 3);
            islandPoints.forEach((point, i) => {
                positions.set([point.x, point.y, point.z], i * 3);
            });
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            lines.push(
                geometry
            );
        });
        }
        else {
        const polygons =
            feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;

        polygons.forEach((polygon: number[][][]) => {
            const points: THREE.Vector3[] = [];
            polygon.forEach((ring: number[][]) => {
            ring.forEach(([lon, lat]) => {
                const [x, y, z] = spherize
                ? Spherize([ -lon, lat])
                : Reproject([lon, lat],lonBounds,latBounds);
                points.push(new THREE.Vector3(x, y, z));
            });
            });
            const positions = new Float32Array(points.length * 3);
            points.forEach((point, i) => {
                positions.set([point.x, point.y, point.z], i * 3);
            });
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            lines.push(
                geometry
            );
        });
        }
        return lines;
    });
    }, [features, spherize, flipY, lonBounds, latBounds]);

    const lines = useMemo(() => {
        return lineGeometries.map((geom: THREE.BufferGeometry, idx: number) => {
            const line = new THREE.Line(geom, lineShaderMat);
            return <primitive key={`border-${idx}`} object={line} />;
        });
    }, [lineGeometries, lineShaderMat]);

    return (
    <>
    {lines}
    </>
  )
}
const CountryBorders = () => {
    const [coastLines, setCoastLines] = useState<any>(null)
    const [borders, setBorders] = useState<any>(null)
    const [swapSides, setSwapSides] = useState<boolean>(false)

    const {dataShape, is4D} = useGlobalStore(useShallow(state => ({
        dataShape: state.dataShape,
        is4D: state.is4D
    })))
    const {zRange, plotType, showBorders, timeScale, rotateFlat, pointSize} = usePlotStore(useShallow(state => ({
        zRange: state.zRange, plotType: state.plotType,
        showBorders: state.showBorders, timeScale: state.timeScale,
        rotateFlat: state.rotateFlat, pointSize:state.pointSize
    })))
    const {analysisMode, axis} = useAnalysisStore(useShallow(state => ({
        analysisMode: state.analysisMode,
        axis: state.axis
    })))

    const [spherize, setSpherize] = useState<boolean>(false)

    useEffect(()=>{
        if (plotType === 'sphere'){
            setSpherize(true)
        }
        else{
            setSpherize(false)
        }

    },[plotType])

    useFrame(({camera})=>{
        if (spherize){return;}
        if (Math.abs(camera.rotation.z) > Math.PI/2 ){
            setSwapSides(true)
        }
        else{
            if (swapSides){setSwapSides(false)}
        }
    })

    useEffect(()=>{
        fetch('./ne_110m_coastline.json')
        .then(res => res.json())
        .then(data => setCoastLines(data.features));

        fetch('./ne_110m_admin_0_countries.json')
        .then(res => res.json())
        .then(data => setBorders(data.features));
    },[])

    const isPC = plotType == 'point-cloud'
    const isFlatMap = plotType == "flat"
    const timeRatio = Math.max(dataShape[0]/dataShape[2],2)
    const depthScale = timeRatio*timeScale
    const aspectRatio = dataShape[2]/dataShape[1]
    
    const globalScale = isPC ? dataShape[2]/500 : 1

    return(
        <group
            rotation={[rotateFlat ? -Math.PI/2 : 0, 0, 0]}
            scale={[globalScale, globalScale , globalScale]}
        >
            <group 
                visible={showBorders && !(analysisMode && axis != 0)} 
                position={(spherize || isFlatMap) ? [0,0,(isFlatMap ? 0.001 : 0)] : [0, 0, swapSides ? zRange[0]*(isPC ? depthScale + pointSize/10000 : timeRatio/2) : zRange[1]*(isPC ? depthScale + pointSize/10000 : timeRatio/2)]} // I don't know what value to use here. THis seems okay but not perfect
            >
                {coastLines && <Borders features={coastLines} />}
                {borders && <Borders features={borders} />}
            </group>
        </group>
    )
}

export {CountryBorders}
