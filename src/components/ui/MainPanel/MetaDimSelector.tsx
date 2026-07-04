"use client";

import React, { useMemo, useState, useEffect } from 'react';
import DimSlicer, { Axis, defaultSelection, DimOption, SliceSelectionState } from '@/components/ui/DimSlicer';
import { defaultAttributes, renderAttributes } from "@/components/ui/MetaData";
import { Button } from '@/components/ui/button-enhanced';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge, Switch, Input, Hider } from "@/components/ui";
import { parseLoc } from '@/utils/HelperFuncs';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { useCacheStore } from "@/GlobalStates/CacheStore";
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { SliderThumbs } from "@/components/ui/Widgets/SliderThumbs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BsFillQuestionCircleFill } from "react-icons/bs";

const MAX_ACTIVE_DIMS = 3;
const DEFAULT_AXES: Axis[] = ['z', 'y', 'x'];

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



function selectionSummary(
  availableDims: DimOption[],
  activeRows: SlicerRow[],
  collapsedSels: Record<string, SliceSelectionState>,
): string {
  const parts = availableDims.map((dim) => {
    const activeRow = activeRows.find((r) => r.dimName === dim.name);
    const sel = activeRow ? activeRow.sel : collapsedSels[dim.name];
    if (!sel) return `${dim.name}=?`;
    const range =
      sel.mode === 'scalar'
        ? sel.scalar || '0'
        : `${sel.start !== '' ? sel.start : '0'}:${sel.stop !== '' ? sel.stop : ':'}`;
    return `${dim.name}=${range}`;
  });
  return `[ ${parts.join(', ')} ]`;
}

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
  
  const { setZSlice, setYSlice, setXSlice, ReFetch, compress, setCompress, coarsen, setCoarsen, kernelSize, setKernelSize, kernelDepth, setKernelDepth } = useZarrStore(useShallow(state => ({
    setZSlice: state.setZSlice, setYSlice: state.setYSlice, setXSlice: state.setXSlice,
    ReFetch: state.ReFetch, compress: state.compress, setCompress: state.setCompress,
    coarsen: state.coarsen, setCoarsen: state.setCoarsen, kernelSize: state.kernelSize, setKernelSize: state.setKernelSize, kernelDepth: state.kernelDepth, setKernelDepth: state.setKernelDepth
  })))

  const { maxTextureSize, max3DTextureSize } = usePlotStore(useShallow(state => ({ maxTextureSize: state.maxTextureSize, max3DTextureSize: state.max3DTextureSize })))

  const [tooBig, setTooBig] = useState(false)
  const [cached, setCached] = useState(false)
  const [texCount, setTexCount] = useState(0)
  const [displaySpat, setDisplaySpat] = useState(String(kernelSize))
  const [displayDepth, setDisplayDepth] = useState(String(kernelDepth))

  React.useEffect(() => {
    setDimArrays(dimArrays);
    setDimNames(dimNames);
    setDimUnits(dimUnits);
  }, [dimArrays, dimNames, dimUnits, setDimArrays, setDimNames, setDimUnits]);

  useEffect(()=>{
    setCompress(false)
    if (cache.has(`${initStore}_${meta.name}`)){
      setCached(true);
    } else {
      setCached(false);
    }
  },[meta, cache, initStore, setCompress])

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

  const makeInitialCollapsedSels = (dims: DimOption[]): Record<string, SliceSelectionState> =>
    Object.fromEntries(dims.map((d) => [d.name, { ...defaultSelection(d.size), mode: 'scalar' as const }]));

  const makeInitialRows = (dims: DimOption[]): SlicerRow[] => {
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

  const summary = useMemo(
    () => selectionSummary(availableDims, rows, collapsedSels),
    [availableDims, rows, collapsedSels],
  );

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
      return [parseInt(sel.start) || 0, parseInt(sel.stop) || defaultLast];
    };

    setZSlice(getSliceArray(rowZ, dataShape ? dataShape[getOrigIdx(rowZ?.dimName || '')] : 0));
    setYSlice(getSliceArray(rowY, dataShape ? dataShape[getOrigIdx(rowY?.dimName || '')] : 0));
    setXSlice(getSliceArray(rowX, dataShape ? dataShape[getOrigIdx(rowX?.dimName || '')] : 0));

    const ndSlices: (number | [number, number | null])[] = availableDims.map((dim) => {
      const row = rows.find((r) => r.dimName === dim.name);
      if (row) {
        if (row.sel.mode === 'scalar') return parseInt(row.sel.scalar) || 0;
        return [parseInt(row.sel.start) || 0, parseInt(row.sel.stop) || dim.size];
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
    <>
      <b>{`${meta.long_name ?? ''} `}</b>
      <Popover>
        <PopoverTrigger className="cursor-pointer" asChild>
          <Badge variant="default" className="block">Attributes</Badge>
        </PopoverTrigger>
        <PopoverContent
          data-meta-popover
          className="max-h-[50vh] overflow-y-auto max-w-200"
          align="center"
        >
          {renderAttributes(metadata, defaultAttributes)}
        </PopoverContent>
      </Popover>
      <br />

      <div className="font-mono text-xs mb-4">
        {'selection'} {summary}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 mb-4">
        {rows.map((row) => {
          const originalIndex = availableDims.findIndex(
            (d) => d.name === row.dimName
          );

          return (
            <span key={row.id} className="font-mono text-xs text-muted-foreground">
              (
              <span className="text-foreground">{row.dimName}</span>
              ,{' '}
              <span className={AXIS_COLOR[row.axis]}>{row.axis}</span>
              ,{' '}
              <span className="text-muted-foreground/70">
                {originalIndex}
              </span>
              )
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-[40%_40%_20%] mb-4">
        <div className="flex flex-col">
          <b>Data Shape</b>
          {`[${formatArray(dataShape ?? [])}]`}
        </div>
        <div className="flex flex-col">
          <b>Chunk Shape</b>
          {`[${formatArray(chunkShape ?? [])}]`}
        </div>
      </div>

      <div className="relative group mb-3">
        <button
          onClick={addRow}
          disabled={!canAdd}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Add dimension"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="7" y1="2" x2="7" y2="12" />
            <line x1="2" y1="7" x2="12" y2="7" />
          </svg>
          Add dimension
        </button>

        {addTooltip && (
          <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10">
            <div className="rounded bg-popover border border-border px-2 py-1 text-xs text-popover-foreground shadow-sm w-64">
              {addTooltip}
            </div>
          </div>
        )}
      </div>

      {/* Active slicers — locked to slice, z/y/x axes only, trash only on last */}
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
        <div className="mt-4">
          <button
            onClick={() => setCollapsedOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {collapsedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Collapsed dimensions
            <span className="ml-1 text-muted-foreground/50">({collapsedDims.length})</span>
          </button>

          {collapsedOpen && (
            <div className="space-y-3 mt-2">
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

      {/* Coarsen Section */}
      <div className="grid grid-cols-[auto_auto] gap-4 mt-4">
        <div className="flex flex-col items-center">
          <label htmlFor="coarsen"><b>Coarsen</b></label>
          <Switch id="coarsen" checked={coarsen} onCheckedChange={e=> setCoarsen(e)}/>
        </div>
      </div>
      <Hider show={coarsen} className="mt-2">
        <div className="grid grid-cols-2 gap-x-1">
          <div className="grid grid-cols-[auto_50px]"
            style={{
              visibility: dataShape.length >= 3 ? 'visible' : 'hidden'
            }}
          >
            <b>Temporal Coarsening</b>
            <Input type='number' min='0' step={1} value={displayDepth} 
              onChange={e=>{
                const val = parseInt(e.target.value)
                setDisplayDepth(e.target.value)
                setKernelDepth(Math.pow(2,val))
              }}
            />
          </div>
          <div className="grid grid-cols-[auto_50px]">
            <b>Spatial Coarsening</b>
            <Input type='number' min='0' step={1} value={displaySpat} 
              onChange={e=>{
                const val = parseInt(e.target.value)
                setDisplaySpat(e.target.value)
                setKernelSize(Math.pow(2, val))
              }}
            />
          </div>
          <div className="col-span-2 font-small mt-2 flex justify-center items-center">
              <i>Values represent 2<sup>n</sup></i>
          </div>
        </div>
      </Hider>

      {/* Size and Cache UI */}
      <br/>
      <div className="grid gap-2">
        <div>
          <b>Raw Size: </b>{formatBytes(currentSize)}
        </div>
        <div>
          <b>Stored size: {compress ? "<" : null} </b>{formatBytes(cachedSize)}
        </div>
      </div>

      {currentSize > maxSize && (
        <>
        <div className={`flex items-center gap-2 p-2 ${smallCache ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"} rounded-md border mt-2`}>
              <div className={`w-2 h-2 ${smallCache ? "bg-red-500" : "bg-emerald-500"} rounded-full`}></div>
              <span className={`text-xs font-medium ${smallCache ? "text-red-800 dark:text-red-200" : "text-emerald-800 dark:text-emerald-200"}`}>
                {smallCache ? "Selection won't fit in Cache" : "Data Will Fit"}
              </span>                  
              </div>
              <div className="mt-2">
                Decrease selection or Increase cache size <br/>
                <div className="flex justify-center items-center">
                  Expand Cache: 
                    <div className="flex items-center gap-1">
                      <Input
                        className="w-[65px] h-[20px] no-spinner"
                        type="number"
                        min={200}
                        step={20}
                        value={cacheSize / (1024 * 1024)}
                        onChange={(e) => setCacheSize(parseInt(e.target.value)*(1024*1024))}
                      />
                      <span className="text-sm font-semibold">MB</span>
                    </div>

                    <Tooltip >
                      <TooltipTrigger asChild>
                      <BsFillQuestionCircleFill className="ml-1"/>
                      </TooltipTrigger>
                      <TooltipContent>
                        Increasing this too far can cause crashes. Mobile users beware 
                      </TooltipContent>
                    </Tooltip>
                </div>
                <SliderThumbs 
                  id="newCache-size"
                  min={0}
                  max={1000}
                  value={[cacheSize / (1024 * 1024)]}
                  step={10}
                  onValueChange={e=>setCacheSize(maxSize+e[0]*(1024*1024))}
              />
        </div>
        </>
      )}

      <div className="grid grid-cols-[auto_50%] gap-2 mt-4">
        <div>
          <label htmlFor="compress-data" className="inline-flex items-center">Compress Data 
          <Tooltip >
            <TooltipTrigger asChild>
              <BsFillQuestionCircleFill className="ml-2"/>
            </TooltipTrigger>
            <TooltipContent className="max-w-[min(100%,16rem)] break-words whitespace-normal">
              Compress data to preserve memory at the expense of slightly longer load times
            </TooltipContent>
          </Tooltip>  
          </label>
        </div>
        <Switch id="compress-data" checked={compress} onCheckedChange={e=>setCompress(e)}/>
      </div>

      <div className="grid gap-2 mt-4">
        {cached &&
          <div>
            <b>This data is already cached. </b>
          </div>
        }
        {tooBig && 
          <div className="bg-[#FFBEB388] rounded-md p-1">
            <span className="text-xs font-medium text-red-800 dark:text-red-200">
              Not only will this certainly not fit in memory, but it also won&apos;t fit in a single shader call. You are wild for this one. Textures:  <b>{texCount}/14</b>
            </span>
          </div>
        }
        {!tooBig && <Button
          variant="pink"        
          className="cursor-pointer hover:scale-[1.05]"
          disabled={smallCache}
          onClick={handlePlot}
        >
        Plot
        </Button>}
      </div>
    </>
  );
}