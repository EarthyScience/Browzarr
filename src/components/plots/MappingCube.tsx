import * as THREE from 'three'
import { useRef, useMemo } from 'react'
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

  const selectTS = usePlotStore((s) => s.selectTS)

  // --- Restore the full set of globals we need (including setTimeSeries & setDimCoords)
  const {
    dimArrays,
    dimUnits,
    dimNames,
    strides,
    dataShape,
    setPlotDim,
    setTimeSeries,
    updateTimeSeries,
    setDimCoords,
    updateDimCoords
  } = useGlobalStore(
    useShallow((s) => ({
      dimArrays: s.dimArrays,
      dimUnits: s.dimUnits,
      dimNames: s.dimNames,
      strides: s.strides,
      dataShape: s.dataShape,
      setPlotDim: s.setPlotDim,
      setTimeSeries: s.setTimeSeries,
      updateTimeSeries: s.updateTimeSeries,
      setDimCoords: s.setDimCoords,
      updateDimCoords: s.updateDimCoords
    }))
  )

  const { analysisMode, analysisArray } = useAnalysisStore(
    useShallow((s) => ({ analysisMode: s.analysisMode, analysisArray: s.analysisArray }))
  )

  const { zSlice, ySlice, xSlice } = useZarrStore(
    useShallow((s) => ({ zSlice: s.zSlice, ySlice: s.ySlice, xSlice: s.xSlice }))
  )

  // sliced coordinate arrays (important for correct mapping from UV -> real coords)
  const dimSlices = useMemo(
    () => [
      dimArrays[0].slice(zSlice[0], zSlice[1] ?? undefined),
      dimArrays[1].slice(ySlice[0], ySlice[1] ?? undefined),
      dimArrays.length > 2 ? dimArrays[2].slice(xSlice[0], xSlice[1] ?? undefined) : []
    ],
    [dimArrays, zSlice, ySlice, xSlice]
  )

  const lastNormal = useRef<number | null>(null)

  const { timeScale, getColorIdx, incrementColorIdx } = usePlotStore(
    useShallow((s) => ({ timeScale: s.timeScale, getColorIdx: s.getColorIdx, incrementColorIdx: s.incrementColorIdx }))
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

    // If axis changed, clear previous timeseries & dim coords & selection points
    if (dimAxis !== lastNormal.current) {
      setTimeSeries({}) // clear previously set timeseries (so UI updates)
      setDimCoords({})  // clear stored dim coords
      setPoints({})     // clear GPU highlight selection
    }
    lastNormal.current = dimAxis

    if (!ZarrDS) return

    // Pull the correct array (analysis mode or current)
    const dataArray = analysisMode ? analysisArray : GetCurrentArray()

    // Extract time series data from clicked uv/normal
    const tempTS = GetTimeSeries({ data: dataArray, shape: dataShape, stride: strides }, { uv, normal })

    // Determine which axis (plane) was clicked and set plot dimension
    const plotDimArray = normal.toArray().map((val, idx) => (Math.abs(val) > 0 ? idx : null)).filter((v) => v !== null)
    const planeIdx = plotDimArray[0] as number // e.g. 0,1 or 2
    // Keep same logic as original: 2 - planeIdx
    setPlotDim(2 - planeIdx)

    // Convert uv -> coordinate indices (per-dimension)
    const coordUV = parseUVCoords({ normal, uv })

    // Map coordUV to actual dim coordinates using dimSlices
    let dimCoords = coordUV.map((val, idx) => (val != null ? dimSlices[idx][Math.round((val as number) * dimSlices[idx].length - 0.5)] : null))

    const thisDimNames = dimNames.filter((_, idx) => dimCoords[idx] !== null)
    const thisDimUnits = dimUnits.filter((_, idx) => dimCoords[idx] !== null)

    // filter out nulls for storage
    dimCoords = dimCoords.filter((v) => v !== null)

    // build timeseries ID and object
    const tsID = `${dimCoords[0]}_${dimCoords[1]}`
    const tsObj = {
      color: evaluate_cmap(getColorIdx() / 10, 'Paired'),
      data: tempTS
    }
    incrementColorIdx()
    updateTimeSeries({ [tsID]: tsObj })

    // Build dim metadata object the same way as original
    const dimObj = {
      first: {
        name: thisDimNames[0],
        loc: dimCoords[0] ?? 0,
        units: thisDimUnits[0]
      },
      second: {
        name: thisDimNames[1],
        loc: dimCoords[1] ?? 0,
        units: thisDimUnits[1]
      },
      plot: {
        units: dimUnits[2 - planeIdx]
      }
    }
    updateDimCoords({ [tsID]: dimObj })

    // Determine which dims correspond to the UV coords (for index math)
    const dims = [depth, height, width].filter((_, idx) => coordUV[idx] != null)
    const dimWidthArr = [depth, height, width].filter((_, idx) => coordUV[idx] == null)

    const newUV = coordUV.filter((v) => v != null) as number[]
    const thisStride = strides.filter((_, idx) => coordUV[idx] != null)

    // compute indices into 1D array: uIdx * stride[0] + vIdx * stride[1]
    const uIdx = Math.round(newUV[0] * dims[0] - 0.5)
    const vIdx = Math.round(newUV[1] * dims[1] - 0.5)
    const newIdx = uIdx * thisStride[0] + vIdx * thisStride[1]

    const dimStride = strides.filter((_, idx) => coordUV[idx] == null)

    // push selection into the PointCloud via provided setters — essential for highlighting
    setDimWidth(dimWidthArr[0])
    setPoints((prevItems) => {
      const newEntry = { [tsID]: newIdx }
      const updated = { ...newEntry, ...prevItems }
      return updated
    })
    setStride(dimStride[0])
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
