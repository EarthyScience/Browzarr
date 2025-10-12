import * as THREE from 'three'
import { useEffect, useMemo, useState } from 'react'
import { pointFrag, pointVert } from '@/components/textures/shaders'
import { useAnalysisStore, useZarrStore, useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { ZarrDataset } from '../zarr/ZarrLoaderLRU'
import { MappingCube } from './MappingCube'

interface PCProps {
  texture: THREE.Data3DTexture | THREE.DataTexture | null
  colormap: THREE.DataTexture
}

export const PointCloud = ({ textures, ZarrDS }: { textures: PCProps; ZarrDS: ZarrDataset }) => {
  const { texture, colormap } = textures

  const { timeSeries, flipY } = useGlobalStore(
    useShallow((state) => ({
      timeSeries: state.timeSeries,
      flipY: state.flipY
    }))
  )

  const {
    scalePoints,
    scaleIntensity,
    pointSize,
    cScale,
    cOffset,
    valueRange,
    animProg,
    selectTS,
    timeScale,
    xRange,
    yRange,
    zRange
  } = usePlotStore(
    useShallow((state) => ({
      scalePoints: state.scalePoints,
      scaleIntensity: state.scaleIntensity,
      pointSize: state.pointSize,
      cScale: state.cScale,
      cOffset: state.cOffset,
      valueRange: state.valueRange,
      animProg: state.animProg,
      selectTS: state.selectTS,
      timeScale: state.timeScale,
      xRange: state.xRange,
      yRange: state.yRange,
      zRange: state.zRange
    }))
  )

  const [pointsObj, setPointsObj] = useState<Record<string, number>>({})
  const [pointIDs, setPointIDs] = useState<number[]>(new Array(10).fill(-1))
  const [stride, setStride] = useState<number>(1)
  const [dimWidth, setDimWidth] = useState<number>(0)

  useEffect(() => {
    // keep point IDs synced with active timeSeries
    let ids = Object.keys(pointsObj)
    const tsIDs = Object.keys(timeSeries)
    ids = ids.filter((id) => tsIDs.includes(id))
    const pointValues = ids.map((id) => pointsObj[id])
    const padded = [...pointValues, ...Array(Math.max(0, 10 - pointValues.length)).fill(-1)]
    setPointIDs(padded)
  }, [timeSeries, pointsObj])

  // --- Extract data and shape from texture ---
  const { data, width, height, depth } = useMemo(() => {
    if (!(texture instanceof THREE.Data3DTexture)) {
      console.warn('Provided texture is not a Data3DTexture')
      return { data: [], width: 0, height: 0, depth: 0 }
    }
    return {
      data: texture.image.data,
      width: texture.image.width,
      height: texture.image.height,
      depth: texture.image.depth
    }
  }, [texture])

  // ---------- Chunk configuration ----------
  const CHUNK_SIZE = 64 // tune this: 32–128 typical

  // ---------- Create chunked geometries ----------
  const chunkGeometries = useMemo(() => {
    if (!texture || !(texture instanceof THREE.Data3DTexture)) return []

    const w = width,
      h = height,
      d = depth
    const arr = data as number[]
    if (!arr || w * h * d === 0) return []

    const chunks: THREE.BufferGeometry[] = []
    const scale = 2 / 500 // same as before

    for (let cz = 0; cz < d; cz += CHUNK_SIZE) {
      for (let cy = 0; cy < h; cy += CHUNK_SIZE) {
        for (let cx = 0; cx < w; cx += CHUNK_SIZE) {
          const maxZ = Math.min(d, cz + CHUNK_SIZE)
          const maxY = Math.min(h, cy + CHUNK_SIZE)
          const maxX = Math.min(w, cx + CHUNK_SIZE)

          const chunkW = maxX - cx
          const chunkH = maxY - cy
          const chunkD = maxZ - cz
          const numPoints = chunkW * chunkH * chunkD

          const positions = new Float32Array(numPoints * 3)
          const values = new Uint8Array(numPoints)

          let ptr = 0
          for (let z = cz; z < maxZ; z++) {
            for (let y = cy; y < maxY; y++) {
              for (let x = cx; x < maxX; x++) {
                const idx = z * w * h + y * w + x
                positions[ptr * 3] = (x - w / 2) * scale
                positions[ptr * 3 + 1] = (y - h / 2) * scale
                positions[ptr * 3 + 2] = (z - d / 2) * scale
                values[ptr] = arr[idx]
                ptr++
              }
            }
          }

          const geom = new THREE.BufferGeometry()
          geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
          geom.setAttribute('value', new THREE.Uint8BufferAttribute(values, 1))
          geom.computeBoundingBox()
          geom.computeBoundingSphere()
          chunks.push(geom)
        }
      }
    }

    return chunks
  }, [data, width, height, depth, texture])

  // ---------- Shared shader material ----------
  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms: {
          pointSize: { value: pointSize },
          cmap: { value: colormap },
          cOffset: { value: cOffset },
          cScale: { value: cScale },
          valueRange: { value: new THREE.Vector2(valueRange[0], valueRange[1]) },
          scalePoints: { value: scalePoints },
          scaleIntensity: { value: scaleIntensity },
          startIDs: { value: pointIDs },
          stride: { value: stride },
          showTransect: { value: selectTS },
          dimWidth: { value: dimWidth },
          timeScale: { value: timeScale },
          animateProg: { value: animProg },
          shape: { value: new THREE.Vector3(depth, height, width) },
          flatBounds: { value: new THREE.Vector4(xRange[0], xRange[1], zRange[0], zRange[1]) },
          vertBounds: { value: new THREE.Vector2(yRange[0], yRange[1]) }
        },
        vertexShader: pointVert,
        fragmentShader: pointFrag,
        depthWrite: true,
        depthTest: true,
        transparent: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide
      }),
    []
  )

  // ---------- Uniform updates ----------
  useEffect(() => {
    if (!shaderMaterial) return
    const u = shaderMaterial.uniforms
    u.pointSize.value = pointSize
    u.cmap.value = colormap
    u.cOffset.value = cOffset
    u.cScale.value = cScale
    u.valueRange.value.set(valueRange[0], valueRange[1])
    u.scalePoints.value = scalePoints
    u.scaleIntensity.value = scaleIntensity
    u.startIDs.value = pointIDs
    u.stride.value = stride
    u.showTransect.value = selectTS
    u.dimWidth.value = dimWidth
    u.timeScale.value = timeScale
    u.animateProg.value = animProg
    u.flatBounds.value.set(xRange[0], xRange[1], zRange[0], zRange[1])
    u.vertBounds.value.set(yRange[0], yRange[1])
  }, [
    pointSize,
    colormap,
    cOffset,
    cScale,
    valueRange,
    scalePoints,
    scaleIntensity,
    pointIDs,
    stride,
    selectTS,
    animProg,
    timeScale,
    xRange,
    yRange,
    zRange,
    dimWidth
  ])

  return (
    <>
      <group scale={[1, flipY ? -1 : 1, 1]}>
        {chunkGeometries.map((geom, i) => (
          <points key={i} geometry={geom} material={shaderMaterial} frustumCulled={true} />
        ))}
      </group>

      <MappingCube
        dimensions={{ width, height, depth }}
        ZarrDS={ZarrDS}
        setters={{ setPoints: setPointsObj, setStride, setDimWidth }}
      />
    </>
  )
}