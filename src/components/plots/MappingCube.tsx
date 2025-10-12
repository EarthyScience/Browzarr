import * as THREE from 'three'
import { useRef } from 'react'
import { useGlobalStore, usePlotStore, useAnalysisStore, useZarrStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { ZarrDataset } from '../zarr/ZarrLoaderLRU'
import { parseUVCoords, getUnitAxis, GetTimeSeries, GetCurrentArray } from '@/utils/HelperFuncs'
import { evaluate_cmap } from 'js-colormaps-es'

interface DimensionsProps {
  width: number
  height: number
  depth: number
}

interface PointSetters {
  setPoints: React.Dispatch<React.SetStateAction<Record<string, number>>>
  setStride: React.Dispatch<React.SetStateAction<number>>
  setDimWidth: React.Dispatch<React.SetStateAction<number>>
}

export const MappingCube = ({
  dimensions,
  ZarrDS,
  setters
}: {
  dimensions: DimensionsProps
  ZarrDS: ZarrDataset
  setters: PointSetters
}) => {
  const { width, height, depth } = dimensions
  const { setPoints, setStride, setDimWidth } = setters
  const selectTS = usePlotStore((state) => state.selectTS)
  const { analysisMode, analysisArray } = useAnalysisStore(
    useShallow((s) => ({
      analysisMode: s.analysisMode,
      analysisArray: s.analysisArray
    }))
  )
  const { zSlice, ySlice, xSlice } = useZarrStore(
    useShallow((s) => ({
      zSlice: s.zSlice,
      ySlice: s.ySlice,
      xSlice: s.xSlice
    }))
  )
  const { dimArrays, dimUnits, dimNames, strides, dataShape, setPlotDim, updateTimeSeries, updateDimCoords } =
    useGlobalStore(
      useShallow((s) => ({
        dimArrays: s.dimArrays,
        dimUnits: s.dimUnits,
        dimNames: s.dimNames,
        strides: s.strides,
        dataShape: s.dataShape,
        setPlotDim: s.setPlotDim,
        updateTimeSeries: s.updateTimeSeries,
        updateDimCoords: s.updateDimCoords
      }))
    )

  const lastNormal = useRef<number | null>(null)

  const { getColorIdx, incrementColorIdx } = usePlotStore(
    useShallow((s) => ({
      getColorIdx: s.getColorIdx,
      incrementColorIdx: s.incrementColorIdx
    }))
  )

  const globalScale = dataShape[2] / 500
  const offset = 1 / 500
  const depthRatio = dataShape[0] / dataShape[2]
  const shapeRatio = dataShape[1] / dataShape[2]

  function HandleTimeSeries(event: THREE.Intersection) {
    if (!selectTS) return

    const uv = event.uv!
    const normal = event.normal!
    const dimAxis = getUnitAxis(normal)

    if (dimAxis !== lastNormal.current) {
      setPoints({})
    }
    lastNormal.current = dimAxis

    if (ZarrDS) {
      const array = analysisMode ? analysisArray : GetCurrentArray()
      const ts = GetTimeSeries({ data: array, shape: dataShape, stride: strides }, { uv, normal })
      const color = evaluate_cmap(getColorIdx() / 10, 'Paired')
      incrementColorIdx()
      updateTimeSeries({ [`${uv.x}_${uv.y}`]: { color, data: ts } })
    }
  }

  return (
    <mesh
      scale={[2 * globalScale, 2 * shapeRatio * globalScale, 2 * depthRatio * globalScale]}
      position={[-offset, -offset, offset]}
      onClick={HandleTimeSeries}
    >
      <boxGeometry />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}
