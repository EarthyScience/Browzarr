"use client";
import React, {useEffect, useState, useMemo} from 'react'
import { useAnalysisStore } from '@/GlobalStates/AnalysisStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import * as THREE from 'three'
import { useShallow } from 'zustand/shallow';
import { useFrame } from '@react-three/fiber';
import {vertexShader, bordersFrag} from '../textures/shaders'
import { invalidate } from '@react-three/fiber';
import proj4, { Converter } from 'proj4';
import { useAxisIndices } from '@/hooks';
import { sampleCRS } from '../textures/ProjectionTexture';

function toSegments(coords: [number, number][], toXYZ: (lon:number, lat:number)=>THREE.Vector3, span = 1.5) {
    const segments: THREE.Vector3[][] = [[]];
    let prevLon: number | null = null;
    for (const [lon, lat] of coords) {
        const newPos = toXYZ(lon, lat)
        const newLon = newPos.x
        if (prevLon !== null && Math.abs(newLon - prevLon) > span) {
            const closerToOne = Math.abs(newLon - 1) < Math.abs(newLon + 1);
            newPos.x = closerToOne ? -1 : 1
            segments[segments.length - 1].push(newPos);
            segments.push([]); // jump detected -> start new line
            prevLon = newLon;
            continue;
        }
        segments[segments.length - 1].push(newPos);
        prevLon = newLon;
    }
    return segments.filter(seg => seg.length > 1);
}

function Reproject([x, y] : [number, number], xBounds: [number, number], yBounds: [number, number], proj : Converter | undefined){ // May use this aspect later. I'll keep for now
    const {remapTexture, remapBorders, flipY} = useGlobalStore.getState()
	let [newX, newY] = [x, y];
	if (remapTexture && proj){
        [newX, newY]= proj.forward([x,y])
        newY = flipY ? 1 - newY : newY
    }
    newX = (newX-xBounds[0])/(xBounds[1]-xBounds[0]);
    newY = (newY-yBounds[0])/(yBounds[1]-yBounds[0]);	
    if (remapBorders && !remapTexture){
        const [newV, _valid] = sampleCRS(remapBorders, newX, newY)
        newX = newV.x;
        newY = newV.y;
    }
    newX -= 0.5
    newX *= 2;
    newY -= 0.5;
    newY *= 2;
   
    return [newX, newY/2, 0] // I don't know why this 2 (which was for the original lat/lon aspect) also works for new CRS
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

function wrapLon(lon: number, bounds: [number, number]) {
    const span = bounds[1] - bounds[0];
    if (span <= 0) return lon;
    return ((lon - bounds[0]) % span + span) % span + bounds[0];
}

function Borders({features}:{features: any}){
    const {xRange, yRange, plotType, borderColor, nativeCRS, destCRS } = usePlotStore(useShallow(s => s))
    const {shape, axisDimArrays, remapTexture } = useGlobalStore(useShallow(s => s))
    const {xIdx, yIdx} = useAxisIndices()
    const [xBounds, yBounds] = useMemo(()=>{ 
        const minX = axisDimArrays[xIdx][0]
        const maxX = axisDimArrays[xIdx].at(-1)
		const minY = axisDimArrays[yIdx][0]
        const maxY = axisDimArrays[yIdx].at(-1)
        return [[minX, maxX] as [number, number], [minY, maxY] as [number, number]]
    },[axisDimArrays, xIdx, yIdx ])
    const spherize = plotType ==='sphere'

    function toXYZ(lon: number, lat: number){
        const [x, y, z] = spherize
        ? Spherize([ -lon, lat])
        : Reproject([wrapLon(lon, xBounds), lat],xBounds,yBounds, proj);
        
        return new THREE.Vector3(x, y, z);
    }
	const proj = useMemo(()=>{
		try{
			const proj = proj4(nativeCRS as string, destCRS as string)
			return proj
		} catch (err) {
			return undefined
		}
	},[nativeCRS, destCRS])

    const lineShaderMat = useMemo(() => {
        const shapeX = (shape && shape.x > 0) ? shape.x : 1;
        return new THREE.ShaderMaterial(
            {
                glslVersion: THREE.GLSL3,
                vertexShader,
                fragmentShader: bordersFrag,
                uniforms:{
                    xBounds: {value: new THREE.Vector2(-xRange[1],-xRange[0])},
                    yBounds: {value: new THREE.Vector2(yRange[0]/shapeX, yRange[1]/shapeX)},
                    borderColor: {value: new THREE.Color(borderColor)},
                    trim: {value: !spherize},
                },
                defines: {
                    USE_APOSITION: 1
                }
            }
        );
    }, [])

    useEffect(()=>{
        if (lineShaderMat){
            const uniforms = lineShaderMat.uniforms
            uniforms.xBounds.value = new THREE.Vector2(xRange[0], xRange[1])
            const shapeX = (shape && shape.x > 0) ? shape.x : 1;
            uniforms.yBounds.value = new THREE.Vector2(yRange[0]/shapeX, yRange[1]/shapeX)
            uniforms.borderColor.value = new THREE.Color(borderColor)
            uniforms.trim.value = !spherize
            invalidate()
        }
    },[xRange, yRange, borderColor, spherize, shape])

    const lineGeometries = useMemo(() => {
    	return features.flatMap((feature: any, i: number) => {
			const lines: THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>[] = [];
			if (feature.geometry.type === 'LineString') {
				const segments = toSegments(feature.geometry.coordinates, toXYZ);
                segments.forEach(points => {
                    const positions = new Float32Array(points.length * 3);
                    points.forEach((p, i) => positions.set([p.x, p.y, p.z], i * 3));
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                    lines.push(geometry);
                });
			} else if (feature.geometry.type === 'MultiPolygon') {
				const islands = feature.geometry.coordinates;
				islands.forEach((island: number[][][], idx: number) => {
					island.forEach((ring) => {
						const segments = toSegments(ring as [number, number][], toXYZ);
                        segments.forEach(points => {
                            const positions = new Float32Array(points.length * 3);
                            points.forEach((p, i) => positions.set([p.x, p.y, p.z], i * 3));
                            const geometry = new THREE.BufferGeometry();
                            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                            lines.push(geometry);
                        });
					});
					
				});
			} else {
				const polygons =
					feature.geometry.type === 'Polygon'
					? [feature.geometry.coordinates]
					: feature.geometry.coordinates;
				polygons.forEach((polygon: number[][][]) => {
					polygon.forEach((ring: number[][]) => {
                        const segments = toSegments(ring as [number, number][], toXYZ);
                        segments.forEach(points => {
                            const positions = new Float32Array(points.length * 3);
                            points.forEach((p, i) => positions.set([p.x, p.y, p.z], i * 3));
                            const geometry = new THREE.BufferGeometry();
                            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                            lines.push(geometry);
                        });
					});
			});
        }
        return lines;
    });
    }, [features, spherize, xBounds, remapTexture, yBounds]);

    const lines = useMemo(() => {
        const results: any[] = []
            lineGeometries.forEach((geom: THREE.BufferGeometry, idx: number) => {
                const line = new THREE.Line(geom, lineShaderMat);
                    results.push(<primitive key={`border-${idx}`} object={line} />);
            });
            return results
    }, [lineGeometries, lineShaderMat, spherize]);
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

    const {dataShape, shape} = useGlobalStore(useShallow(s => s))
    const {zRange, plotType, showBorders, timeScale, rotateFlat, pointSize, useBorderTexture, is360Deg} = usePlotStore(useShallow(s => s))
    const {analysisMode, axis} = useAnalysisStore(useShallow(s => s))

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
    const timeRatio = isPC ? dataShape[0]/dataShape[2] :  Math.max(dataShape[0]/dataShape[2],2)
    const depthRatio = (shape && shape.x > 0) ? (shape.z / shape.x) * timeScale : 1;
    const globalScale = isPC ? dataShape[2]/500 : 1
    const depthScale = isPC ? depthRatio : timeRatio/2
    const aspectRatio = (shape && shape.y > 0) ? (shape.x / shape.y) : 1;

    return(
        <group
            rotation={[rotateFlat ? -Math.PI/2 : 0, 0, 0]}
            scale={[globalScale, globalScale * (spherize ? 1 : (2 / aspectRatio)), globalScale]}
        >
            <group 
                visible={showBorders && !(analysisMode && axis != 0) && !useBorderTexture} 
                position={(spherize || isFlatMap) ? [0,0,(isFlatMap ? 0.001 : 0)] : [0, 0, swapSides ? zRange[0]*(depthScale + (isPC ? pointSize/10000 + 0.01 : 0)) : zRange[1]*(depthScale + (isPC ? pointSize/10000 + 0.01 : 0))]} // I don't know what value to use here. THis seems okay but not perfect
                rotation={[0, (is360Deg && spherize) ? Math.PI : 0, 0]} 
            >
                {coastLines && <Borders features={coastLines} />}
                {borders && <Borders features={borders} />}
            </group>
        </group>
    )
}

export {CountryBorders}
