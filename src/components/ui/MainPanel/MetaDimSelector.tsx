"use client";

import React, { useMemo, useState, useEffect } from 'react';
import DimSlicer, { Axis, defaultSelection, DimOption, SliceSelectionState } from '@/components/ui/DimSlicer';
import { defaultAttributes, renderAttributes } from "@/components/ui/MetaData";
import { Button } from '@/components/ui/button-enhanced';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge, Switch, Input, Hider } from "@/components/ui";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { parseLoc } from '@/utils/HelperFuncs';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";

import { useCacheStore } from "@/GlobalStates/CacheStore";
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { SliderThumbs } from "@/components/ui/Widgets/SliderThumbs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BsFillQuestionCircleFill } from "react-icons/bs";

const MAX_ACTIVE_DIMS = 3;

const formatArray = (value: string | number[]): string => {
  if (typeof value === 'string') return value;
  return Array.isArray(value) ? value.join(', ') : String(value);
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

interface DimInfo {
  dimArrays: ArrayLike<number>[];
  dimNames: string[];
  dimUnits: (string | null)[];
}

type Props = {
  meta: {
    name?: string;
    shape?: number[];
    chunks?: number[];
    chunkSize?: number;
    totalSize?: number;
    dtype?: string;
    long_name?: string;
    dimInfo?: DimInfo;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  onApply?: (sels: SliceSelectionState[], axes: Axis[], dimNames: string[]) => void;
  setShowMeta?: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenVariables?: (open: boolean) => void;
};

const AXIS_COLOR: Record<Axis, string> = {
  x: 'text-pink-500',
  y: 'text-green-500',
  z: 'text-blue-500',
  c: 'text-yellow-500',
};

interface SlicerRow {
  id: number;
  dimName: string;
  sel: SliceSelectionState;
  axis: Axis;
}

let _nextId = 0;
const nextId = () => ++_nextId;

const getOrigIdx = (dimName: string) => {
  const parts = dimName.split('::');
  return parseInt(parts[parts.length - 1]);
};

export default function MetaDimSelector({ meta, metadata, onApply, setShowMeta, setOpenVariables }: Props) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dimArrays = useMemo(
    () => (meta?.dimInfo?.dimArrays ?? []).map((a) => Array.from(a)),
    [meta?.dimInfo?.dimArrays]
  );
  const dimUnits = useMemo(
    () => (meta?.dimInfo?.dimUnits ?? []).map((u) => u ?? ''),
    [meta?.dimInfo?.dimUnits]
  );
  const dimNames = useMemo(
    () => meta?.dimInfo?.dimNames ?? [],
    [meta?.dimInfo?.dimNames]
  );
  const dataShape = meta?.shape || [];
  const chunkShape = meta?.chunks || [];


  const { setDimArrays, setDimNames, setDimUnits, initStore, setVariable, setTextureArrayDepths, variable } = useGlobalStore(
    useShallow((state) => ({
      setDimArrays: state.setDimArrays,
      setDimNames: state.setDimNames,
      setDimUnits: state.setDimUnits,
      initStore: state.initStore,
      setVariable: state.setVariable,
      setTextureArrayDepths: state.setTextureArrayDepths,
      variable: state.variable,
    })),
  );

  const { maxSize, cache, setMaxSize } = useCacheStore(useShallow(state => ({ maxSize: state.maxSize, cache: state.cache, setMaxSize: state.setMaxSize })))
  const [cacheSize, setCacheSize] = useState(maxSize)
  
  const { ndSlices, axisMapping, setZSlice, setYSlice, setXSlice, ReFetch, compress, setCompress, coarsen, setCoarsen, kernelSize, setKernelSize, kernelDepth, setKernelDepth } = useZarrStore(useShallow(state => ({
    ndSlices: state.ndSlices, axisMapping: state.axisMapping,
    setZSlice: state.setZSlice, setYSlice: state.setYSlice, setXSlice: state.setXSlice,
    ReFetch: state.ReFetch, compress: state.compress, setCompress: state.setCompress,
    coarsen: state.coarsen, setCoarsen: state.setCoarsen, kernelSize: state.kernelSize, setKernelSize: state.setKernelSize, kernelDepth: state.kernelDepth, setKernelDepth: state.setKernelDepth
  })))

  const { maxTextureSize, max3DTextureSize } = usePlotStore(useShallow(state => ({ maxTextureSize: state.maxTextureSize, max3DTextureSize: state.max3DTextureSize })))

  const [tooBig, setTooBig] = useState(false)
  const [cached, setCached] = useState(false)
  const [cachedChunks, setCachedChunks] = useState<string | null>(null)
  const [texCount, setTexCount] = useState(0)
  const [displaySpat, setDisplaySpat] = useState(String(kernelSize))
  const [displayDepth, setDisplayDepth] = useState(String(kernelDepth))

  useEffect(() => {
    setDimArrays(dimArrays);
    setDimNames(dimNames);
    setDimUnits(dimUnits);
  }, [dimArrays, dimNames, dimUnits, setDimArrays, setDimNames, setDimUnits]);



  const availableDims: DimOption[] = useMemo(
    () =>
      dimArrays.map((values, idx) => {
        const baseName = dimNames[idx] ?? `dim${idx}`;
        // Always include idx to guarantee uniqueness during the "Default" fallback phase
        const name = `${baseName}::${idx}`;
        const label = baseName;
        return {
          name,
          label,
          size: values.length,
          values,
          formatValue: (v: number): string =>
            String(parseLoc(values[v] ?? v, dimUnits[idx] || undefined)),
        };
      }),
    [dimArrays, dimNames, dimUnits],
  );

  const dimsKey = availableDims.map((d) => `${d.name}:${d.size}`).join('|');

  const makeInitialCollapsedSels = (dims: DimOption[]): Record<string, SliceSelectionState> => {
    const isCurrentVar = variable === meta.name && ndSlices && ndSlices.length === dims.length;
    return Object.fromEntries(dims.map((d, i) => {
      let sel: SliceSelectionState = { ...defaultSelection(d.size), mode: 'scalar' };
      if (isCurrentVar) {
        const s = ndSlices[i];
        if (typeof s === 'number') {
          sel = { start: '', stop: '', scalar: String(s), mode: 'scalar' };
        }
      }
      return [d.name, sel];
    }));
  };

  const makeInitialRows = (dims: DimOption[]): SlicerRow[] => {
    const isCurrentVar = variable === meta.name && ndSlices && ndSlices.length === dims.length && axisMapping;
    
    if (isCurrentVar) {
      const initRows: SlicerRow[] = [];
      const axes: Axis[] = ['z', 'y', 'x'];
      
      for (const axis of axes) {
        const mappedIdx = (axisMapping as Record<string, number>)[axis];
        if (mappedIdx !== undefined && mappedIdx >= 0 && mappedIdx < dims.length) {
          const dim = dims[mappedIdx];
          const s = ndSlices[mappedIdx];
          let sel: SliceSelectionState = { ...defaultSelection(dim.size), mode: 'slice' };
          if (Array.isArray(s)) {
             sel = { start: String(s[0]), stop: s[1] !== null ? String(s[1]) : '', scalar: '', mode: 'slice' };
          }
          initRows.push({
            id: nextId(),
            dimName: dim.name,
            sel,
            axis
          });
        }
      }
      
      if (initRows.length > 0) return initRows;
    }

    const activeDims = dims.slice(-Math.min(MAX_ACTIVE_DIMS, dims.length));
    const defaultAxes: Axis[] = ['z', 'y', 'x'];
    const axes = defaultAxes.slice(-activeDims.length);
    return activeDims.map((d, i) => ({
      id: nextId(),
      dimName: d.name,
      sel: { ...defaultSelection(d.size), mode: 'slice' },
      axis: axes[i],
    }));
  };

  const [rows, setRows] = useState<SlicerRow[]>(() => makeInitialRows(availableDims));
  const [collapsedSels, setCollapsedSels] = useState<Record<string, SliceSelectionState>>(
    () => makeInitialCollapsedSels(availableDims),
  );
  const [lastKey, setLastKey] = useState(dimsKey);
  const [collapsedOpen, setCollapsedOpen] = useState(false);

  if (dimsKey !== lastKey) {
    setLastKey(dimsKey);
    setRows(makeInitialRows(availableDims));
    setCollapsedSels(makeInitialCollapsedSels(availableDims));
  }

  useEffect(()=>{
    setCompress(false)
    setCachedChunks(null)
    setCached(false)

    if (!meta || !meta.chunks || !meta.shape) {
      if (meta && cache.has(`${initStore}_${meta.name}`)) {
        setCached(true);
      }
      return;
    }

    const ndSlicesTemp = availableDims.map((d) => {
      const activeRow = rows.find((r) => r.dimName === d.name);
      if (activeRow) {
        return [parseInt(activeRow.sel.start) || 0, parseInt(activeRow.sel.stop) || d.size] as [number, number];
      }
      const colSel = collapsedSels[d.name];
      if (colSel && colSel.mode === 'scalar') return parseInt(colSel.scalar) || 0;
      return 0;
    });

    const scalarIndices = ndSlicesTemp.filter(s => typeof s === "number").join("_");
    const cacheBase = scalarIndices !== "" ? `${initStore}_${meta.name}_${scalarIndices}` : `${initStore}_${meta.name}`;

    const rowZ = rows.find((r) => r.axis === 'z');
    const rowY = rows.find((r) => r.axis === 'y');
    const rowX = rows.find((r) => r.axis === 'x');

    const origIdxZ = rowZ ? getOrigIdx(rowZ.dimName) : -1;
    const origIdxY = rowY ? getOrigIdx(rowY.dimName) : -1;
    const origIdxX = rowX ? getOrigIdx(rowX.dimName) : -1;

    const getSliceDims = (row?: SlicerRow, origIdx?: number) => {
      const defaultLast = origIdx !== undefined && origIdx >= 0 ? meta.shape?.[origIdx] ?? 1 : 1;
      if (!row) return { first: 0, last: defaultLast };
      const sel = row.sel;
      if (sel.mode === 'scalar') {
        const val = parseInt(sel.scalar) || 0;
        return { first: val, last: val + 1 };
      }
      const start = parseInt(sel.start) || 0;
      let stop = parseInt(sel.stop);
      if (isNaN(stop)) stop = defaultLast;
      else stop += 1;
      return { first: start, last: stop };
    };

    const zSlice = getSliceDims(rowZ, origIdxZ);
    const ySlice = getSliceDims(rowY, origIdxY);
    const xSlice = getSliceDims(rowX, origIdxX);

    const calcDim = (slice: {first: number, last: number}, dimIdx: number) => { 
        if (dimIdx < 0) return { start: 0, end: 1 };
        const chunkDim = meta.chunks?.[dimIdx];
        if (!chunkDim) return { start: 0, end: 1 };
        const start = Math.floor(slice.first / chunkDim);
        return { start, end: Math.ceil(slice.last / chunkDim) };
    };

    const zDim = calcDim(zSlice, origIdxZ);
    const yDim = calcDim(ySlice, origIdxY);
    const xDim = calcDim(xSlice, origIdxX);

    let accum = 0;
    let total = 0;
    for (let z = zDim.start; z < zDim.end; z++) {
        for (let y = yDim.start; y < yDim.end; y++) {
            for (let x = xDim.start; x < xDim.end; x++) {
                total++;
                const chunkID = `z${z}_y${y}_x${x}`;
                const cacheName = `${cacheBase}_chunk_${chunkID}`;
                if (cache.has(cacheName)) {
                    accum++;
                }
            }
        }
    }

    if (total > 0 && accum > 0) {
      setCachedChunks(`${accum}/${total}`);
      setCached(true);
    } else if (cache.has(`${initStore}_${meta.name}`)) {
      setCached(true);
    }
  }, [meta, cache, initStore, setCompress, rows, collapsedSels, availableDims])

  const sizeData = useMemo(() => {
    const rowZ = rows.find((r) => r.axis === 'z');
    const rowY = rows.find((r) => r.axis === 'y');
    const rowX = rows.find((r) => r.axis === 'x');

    const is2D = dataShape.length === 2 || !rowZ;

    const getSliceDims = (row?: SlicerRow, defaultLast = 0) => {
      if (!row) return { first: 0, last: defaultLast, steps: defaultLast };
      const sel = row.sel;
      if (sel.mode === 'scalar') {
        const val = parseInt(sel.scalar) || 0;
        return { first: val, last: val + 1, steps: 1 };
      }
      const start = parseInt(sel.start) || 0;
      let stop = parseInt(sel.stop);
      if (isNaN(stop)) stop = defaultLast;
      else stop += 1;
      return { first: start, last: stop, steps: Math.max(1, stop - start) };
    };

    const origIdxZ = rowZ ? getOrigIdx(rowZ.dimName) : -1;
    const origIdxY = rowY ? getOrigIdx(rowY.dimName) : -1;
    const origIdxX = rowX ? getOrigIdx(rowX.dimName) : -1;

    const lenZ = origIdxZ >= 0 ? dataShape[origIdxZ] : 1;
    const lenY = origIdxY >= 0 ? dataShape[origIdxY] : 1;
    const lenX = origIdxX >= 0 ? dataShape[origIdxX] : 1;

    const z = is2D ? { first: 0, last: 1, steps: 1 } : getSliceDims(rowZ, lenZ);
    const y = getSliceDims(rowY, lenY);
    const x = getSliceDims(rowX, lenX);

    const maxSizeLimit = is2D ? maxTextureSize : max3DTextureSize;
    const texCounts = [z.steps / maxSizeLimit, y.steps / maxSizeLimit, x.steps / maxSizeLimit];
    
    const depths = texCounts.some(count => count > 1)
        ? texCounts.map(val => Math.ceil(val))
        : [1, 1, 1];

    const thisCount = texCounts.reduce((prod, val) => prod * Math.ceil(val), 1)

    const getSelSteps = (dimName: string, defaultLast: number) => {
      const row = rows.find(r => r.dimName === dimName);
      if (row) return getSliceDims(row, defaultLast).steps;
      
      const collSel = collapsedSels[dimName];
      if (collSel) {
        if (collSel.mode === 'scalar') return 1;
        const start = parseInt(collSel.start) || 0;
        let stop = parseInt(collSel.stop);
        if (isNaN(stop)) stop = defaultLast;
        else stop += 1;
        return Math.max(1, stop - start);
      }
      return defaultLast;
    };

    const totalSteps = availableDims.reduce((prod, d) => prod * getSelSteps(d.name, d.size), 1);
    const sizeRatio = totalSteps / (dataShape.reduce((a, b) => a * b, 1) || 1);
    let calculatedSize = (meta.totalSize || 0) * sizeRatio;

    if (!is2D) {
      calculatedSize = calculatedSize / (coarsen ? kernelDepth * Math.pow(kernelSize, 2) : 1);
    }
    
    return { size: calculatedSize, thisCount, depths };
  }, [meta, rows, collapsedSels, availableDims, dataShape, chunkShape, coarsen, kernelSize, kernelDepth, maxTextureSize, max3DTextureSize]);

  useEffect(() => {
    setTextureArrayDepths(sizeData.depths);
    setTexCount(sizeData.thisCount);
    setTooBig(sizeData.thisCount > 14);
  }, [sizeData, setTextureArrayDepths]);

  const currentSize = sizeData.size;

  const cachedSize = useMemo(()=>{
    const thisDtype = (meta?.dtype as string) || '';
    if (thisDtype.includes("32") || thisDtype.includes("f4")){
      return currentSize / 2;
    } else if (thisDtype.includes("64") || thisDtype.includes("f8")){
      return currentSize / 4;
    } else if (thisDtype.includes("8") || thisDtype.includes("i1") ){
      return currentSize * 2;
    } else {
      return currentSize;
    }
  },[currentSize, meta])

  const smallCache = cachedSize > cacheSize;

  const firstUnusedDim = (currentRows: SlicerRow[]): string => {
    const usedNames = new Set(currentRows.map((r) => r.dimName));
    return availableDims.find((d) => !usedNames.has(d.name))?.name ?? '';
  };

  const firstUnusedAxis = (currentRows: SlicerRow[]): Axis => {
    const used = new Set(currentRows.map((r) => r.axis));
    return (['x', 'y', 'z'] as Axis[]).find((a) => !used.has(a)) ?? 'z';
  };

  const addRow = () => {
    setRows((prev) => {
      if (prev.length >= MAX_ACTIVE_DIMS) return prev;
      const dimName = firstUnusedDim(prev);
      if (!dimName) return prev;
      const dim = availableDims.find((d) => d.name === dimName)!;
      const newRows: SlicerRow[] = [...prev, {
        id: nextId(),
        dimName,
        sel: { ...defaultSelection(dim.size), mode: 'slice' },
        axis: 'z', // Placeholder, reassigned below
      }];
      
      const defaultAxes: Axis[] = ['z', 'y', 'x'];
      const axes = defaultAxes.slice(-newRows.length);
      return newRows.map((r, i) => ({ ...r, axis: axes[i] }));
    });
  };

  const removeLastRow = () =>
    setRows((prev) => {
      const newRows = prev.slice(0, -1);
      const defaultAxes: Axis[] = ['z', 'y', 'x'];
      const axes = defaultAxes.slice(-newRows.length);
      return newRows.map((r, i) => ({ ...r, axis: axes[i] }));
    });

  const updateDimName = (id: number, dimName: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const dim = availableDims.find((d) => d.name === dimName);
        return { ...r, dimName, sel: { ...defaultSelection(dim?.size), mode: 'slice' } };
      }),
    );
  };

  const updateSel = (id: number, sel: SliceSelectionState) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, sel: { ...sel, mode: 'slice' } } : r)));

  const updateCollapsedSel = (dimName: string, sel: SliceSelectionState) =>
    setCollapsedSels((prev) => ({ ...prev, [dimName]: { ...sel, mode: 'scalar' } }));



  const activeDimNames = new Set(rows.map((r) => r.dimName));
  const collapsedDims = availableDims.filter((d) => !activeDimNames.has(d.name));

  const atMax = rows.length >= MAX_ACTIVE_DIMS;
  const noUnused = firstUnusedDim(rows) === '';
  const canAdd = !atMax && !noUnused;

  const addTooltip = atMax
    ? `Maximum of ${MAX_ACTIVE_DIMS} dimensions, remove one before adding another.`
    : noUnused
      ? 'All dimensions are already active.'
      : undefined;

  const handlePlot = () => {
    const rowZ = rows.find(r => r.axis === 'z');
    const rowY = rows.find(r => r.axis === 'y');
    const rowX = rows.find(r => r.axis === 'x');

    const getSliceArray = (row?: SlicerRow, defaultLast = 0): [number, number | null] => {
      if (!row) return [0, null];
      const sel = row.sel;
      if (sel.mode === 'scalar') {
        const val = parseInt(sel.scalar) || 0;
        return [val, val + 1];
      }
      const start = parseInt(sel.start) || 0;
      let stop = parseInt(sel.stop);
      return [start, isNaN(stop) ? null : stop + 1];
    };

    setZSlice(getSliceArray(rowZ, dataShape ? dataShape[getOrigIdx(rowZ?.dimName || '')] : 0));
    setYSlice(getSliceArray(rowY, dataShape ? dataShape[getOrigIdx(rowY?.dimName || '')] : 0));
    setXSlice(getSliceArray(rowX, dataShape ? dataShape[getOrigIdx(rowX?.dimName || '')] : 0));

    const ndSlices: (number | [number, number | null])[] = availableDims.map((dim) => {
      const row = rows.find((r) => r.dimName === dim.name);
      if (row) {
        if (row.sel.mode === 'scalar') return parseInt(row.sel.scalar) || 0;
        const start = parseInt(row.sel.start) || 0;
        let stop = parseInt(row.sel.stop);
        return [start, isNaN(stop) ? null : stop + 1];
      }
      const colSel = collapsedSels[dim.name];
      if (colSel && colSel.mode === 'scalar') return parseInt(colSel.scalar) || 0;
      return 0;
    });

    const axisMapping = {
      x: getOrigIdx(rowX?.dimName || ''),
      y: getOrigIdx(rowY?.dimName || ''),
      z: getOrigIdx(rowZ?.dimName || '')
    };

    useZarrStore.getState().setNdSlices(ndSlices);
    useZarrStore.getState().setAxisMapping(axisMapping);

    if (collapsedDims.length > 0) {
      const firstCollapsed = collapsedDims[0];
      const sel = collapsedSels[firstCollapsed.name];
      if (sel && sel.mode === 'scalar') {
        useGlobalStore.getState().setIdx4D(parseInt(sel.scalar) || 0);
      }
    }

    if (variable === meta.name) {
      ReFetch();
    } else {
      setMaxSize(cacheSize);
      setVariable(meta.name || '');
      ReFetch();
    }

    if (setShowMeta) setShowMeta(false);
    if (setOpenVariables) setOpenVariables(false);
    usePlotStore.setState({ coarsen, kernel: { kernelDepth, kernelSize } });

    onApply?.(rows.map((r) => r.sel), rows.map((r) => r.axis), rows.map((r) => r.dimName));
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex flex-col gap-4 mb-2 min-w-0">
        {/* Top Header: Name, Attributes, Options, and Plot button */}
        <div className="flex flex-col gap-3 w-full min-w-0">
          <div className="flex items-center gap-2">
            <b className="text-base">{`${meta.long_name ?? meta.name ?? ''} `}</b>
              {mounted && isMobile ? (
                <Dialog>
                  <DialogTrigger className="cursor-pointer" asChild>
                    <Badge variant="default" className="block">Attributes</Badge>
                  </DialogTrigger>
                  <DialogContent className="metadata-dialog">
                    <DialogHeader>
                      <DialogTitle>Attributes</DialogTitle>
                      <DialogDescription className="sr-only">Metadata Information for variable</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] text-[12px] overflow-y-auto break-words p-0">
                      <div className="grid grid-cols-1 md:grid-cols-[max-content_1fr] gap-x-1 gap-y-[6px]">
                        {renderAttributes(metadata, defaultAttributes)}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Popover>
                  <PopoverTrigger className="cursor-pointer" asChild>
                    <Badge variant="default" className="block">Attributes</Badge>
                  </PopoverTrigger>
                  <PopoverContent
                    data-meta-popover
                    className="w-[300px] max-h-[50vh] overflow-y-auto"
                    align="center"
                  >
                    {renderAttributes(metadata, defaultAttributes)}
                  </PopoverContent>
                </Popover>
              )}
            </div>
            
            {/* Options */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm w-full min-w-0">
              {/* Coarsen Toggle */}
              <div className="flex items-center gap-2">
                <label htmlFor="coarsen" className="font-semibold cursor-pointer">Coarsen</label>
                <Switch id="coarsen" checked={coarsen} onCheckedChange={e=> setCoarsen(e)}/>
              </div>

              {/* Compress Toggle */}
              <div className="flex items-center gap-2">
                <label htmlFor="compress-data" className="font-semibold cursor-pointer flex items-center">
                  Compress
                  <Tooltip >
                    <TooltipTrigger asChild>
                      <BsFillQuestionCircleFill className="ml-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[min(100%,16rem)] break-words whitespace-normal">
                      Compress data to preserve memory at the expense of slightly longer load times
                    </TooltipContent>
                  </Tooltip>  
                </label>
                <Switch id="compress-data" checked={compress} onCheckedChange={e=>setCompress(e)}/>
              </div>

              {/* Plot Button */}
              <div className="flex items-center justify-end ml-auto min-w-0">
                {!tooBig && <Button
                  variant={'pink'}
                  className="cursor-pointer hover:scale-[1.05] shadow-sm h-8 px-4"
                  disabled={smallCache}
                  onClick={handlePlot}
                >
                  Plot
                </Button>}
              </div>
            </div>

            {/* Status Information */}
            <div className="flex flex-col gap-2">
              {/* Size info badge */}
              <div className="flex items-center gap-2 text-xs bg-background border px-2 py-1 rounded-md shadow-sm w-fit">
                <span className="text-muted-foreground">Raw:</span> <span className="font-medium">{formatBytes(currentSize)}</span>
                <span className="text-muted-foreground/50">|</span>
                <span className="text-muted-foreground">Stored:</span> <span className="font-medium">{compress ? "<" : ""}{formatBytes(cachedSize)}</span>
              </div>
              
              {/* Messages */}
              <div className="flex flex-col gap-1 text-xs">
                {tooBig && 
                  <span className="font-medium text-destructive">
                    Too many textures ({texCount}/14). Won&apos;t fit.
                  </span>
                }
                {cached && 
                  <span className="font-medium text-muted-foreground">
                    {cachedChunks ? `${cachedChunks} chunks already cached` : "Already cached"}
                  </span>
                }
              </div>
            </div>
          </div>

        {/* Coarsen Expand UI */}
        <Hider show={coarsen}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 bg-background p-3 rounded-md border text-sm">
            <div className="flex items-center justify-between sm:justify-start sm:gap-4"
              style={{ visibility: dataShape.length >= 3 ? 'visible' : 'hidden' }}
            >
              <span className="font-semibold">Temporal Coarsening</span>
              <div className="flex items-center gap-2">
                <Input type='number' min='0' step={1} value={displayDepth} className="w-16 h-8 text-center"
                  onChange={e=>{
                    const val = parseInt(e.target.value)
                    setDisplayDepth(e.target.value)
                    setKernelDepth(Math.pow(2,val))
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-4">
              <span className="font-semibold">Spatial Coarsening</span>
              <div className="flex items-center gap-2">
                <Input type='number' min='0' step={1} value={displaySpat} className="w-16 h-8 text-center"
                  onChange={e=>{
                    const val = parseInt(e.target.value)
                    setDisplaySpat(e.target.value)
                    setKernelSize(Math.pow(2, val))
                  }}
                />
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2 text-xs text-muted-foreground/70 italic sm:text-center mt-1">
                Values represent 2ⁿ
            </div>
          </div>
        </Hider>

        {/* Cache expand UI if needed */}
        {currentSize > maxSize && (
          <Alert variant={smallCache ? "destructive" : "default"} className="mt-2 w-full border-0">
            {smallCache ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            <AlertTitle>
              {smallCache ? "Selection won't fit in Cache" : "Data Will Fit"}
            </AlertTitle>
            <AlertDescription className="w-full min-w-0">
              <div className="flex flex-col gap-3 mt-1 w-full min-w-0">
                <span className="leading-none text-muted-foreground break-words">Decrease selection or expand cache size</span>
                <div className="flex items-center gap-4 w-full min-w-0">
                  <SliderThumbs 
                      id="newCache-size"
                      min={0}
                      max={1000}
                      value={[cacheSize / (1024 * 1024)]}
                      step={10}
                      onValueChange={e=>setCacheSize(maxSize+e[0]*(1024*1024))}
                      className="flex-1 min-w-0"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                      <Input
                        className="w-[70px] h-[28px] text-xs no-spinner"
                        type="number"
                        min={200}
                        step={20}
                        value={cacheSize / (1024 * 1024)}
                        onChange={(e) => setCacheSize(parseInt(e.target.value)*(1024*1024))}
                      />
                      <span className="text-xs font-semibold">MB</span>
                      <Tooltip >
                        <TooltipTrigger asChild>
                          <BsFillQuestionCircleFill className="ml-1 text-muted-foreground hover:text-foreground transition-colors cursor-help"/>
                        </TooltipTrigger>
                        <TooltipContent>
                          Increasing this too far can cause crashes. Mobile users beware 
                        </TooltipContent>
                      </Tooltip>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Dimension Table */}
        <div className="mt-2 border rounded-md overflow-hidden text-xs bg-background shadow-sm w-full min-w-0">
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full text-left border-collapse break-words whitespace-normal">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium border-b">Dim</th>
                  <th className="px-3 py-2 font-medium border-b">Axis</th>
                  <th className="px-3 py-2 font-medium border-b">Selection</th>
                  <th className="px-3 py-2 font-medium border-b">Data Shape</th>
                  <th className="px-3 py-2 font-medium border-b">Chunk Shape</th>
                </tr>
              </thead>
              <tbody>
                {availableDims.map((dim, originalIndex) => {
                  const activeRow = rows.find((r) => r.dimName === dim.name);
                  const sel = activeRow ? activeRow.sel : collapsedSels[dim.name];
                  const range = !sel ? '?' : sel.mode === 'scalar' ? sel.scalar || '0' : `${sel.start !== '' ? sel.start : '0'}:${sel.stop !== '' ? sel.stop : ':'}`;
                  const axis = activeRow ? activeRow.axis : 'c';
                  const dataSize = dataShape[originalIndex] ?? '?';
                  const chunkSize = chunkShape[originalIndex] ?? '?';
                  
                  return (
                    <tr key={dim.name} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-1.5 font-medium">
                        {dim.name}
                      </td>
                      <td className={`px-3 py-1.5 font-bold ${AXIS_COLOR[axis as Axis] ?? 'text-muted-foreground'}`}>{axis.toUpperCase()}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{range}</td>
                      <td className="px-3 py-1.5">{dataSize}</td>
                      <td className="px-3 py-1.5">{chunkSize}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DimSlicers Area */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground/80">Active Dimensions</h3>
          <div className="relative group">
            <button
              onClick={addRow}
              disabled={!canAdd}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-transparent hover:border-border"
              aria-label="Add dimension"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="7" y1="2" x2="7" y2="12" />
                <line x1="2" y1="7" x2="12" y2="7" />
              </svg>
              Add dimension
            </button>

            {addTooltip && (
              <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-10">
                <div className="rounded bg-popover border border-border px-2 py-1.5 text-xs text-popover-foreground shadow-sm w-64 text-center">
                  {addTooltip}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active slicers */}
        <div className="space-y-3">
          {rows.map((row, i) => {
            const dim = availableDims.find((d) => d.name === row.dimName);
            const isLast = i === rows.length - 1;
            return (
              <DimSlicer
                key={row.id}
                availableDims={availableDims}
                dimName={row.dimName}
                onDimChange={(name) => updateDimName(row.id, name)}
                onRemove={isLast && rows.length > 1 ? removeLastRow : undefined}
                dimSize={dim?.size ?? 0}
                selection={row.sel}
                axis={row.axis}
                onChange={(sel) => updateSel(row.id, sel)}
                values={dim?.values}
                formatValue={dim?.formatValue}
                lockMode="slice"
                allowedAxes={['z', 'y', 'x']}
              />
            );
          })}
        </div>

        {/* Collapsed dimensions */}
        {collapsedDims.length > 0 && (
          <div className="mt-6 mb-2">
            <button
              onClick={() => setCollapsedOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {collapsedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Collapsed dimensions
              <span className="ml-1 text-muted-foreground/60 text-xs font-normal bg-muted px-1.5 py-0.5 rounded-full">{collapsedDims.length}</span>
            </button>

            {collapsedOpen && (
              <div className="space-y-3 mt-3 ml-2 border-l-2 border-muted pl-4">
                {collapsedDims.map((dim) => (
                  <DimSlicer
                    key={dim.name}
                    availableDims={availableDims}
                    dimName={dim.name}
                    onDimChange={() => { }}
                    dimSize={dim.size}
                    selection={collapsedSels[dim.name] ?? { ...defaultSelection(dim.size), mode: 'scalar' }}
                    axis="c"
                    onChange={(sel) => updateCollapsedSel(dim.name, sel)}
                    values={dim.values}
                    formatValue={dim.formatValue}
                    lockMode="scalar"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}