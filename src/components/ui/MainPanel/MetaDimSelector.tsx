"use client";

import React, { useMemo, useState, useEffect, createContext, useContext } from 'react';
import { createStore, useStore } from 'zustand';
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

// Maximum allowed active dimensions shown in the slicer panel
const MAX_ACTIVE_DIMS = 3;

// Helper to format byte counts into human-readable strings (KB, MB, GB)
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Metadata payload shape for dimension arrays, names, and units
interface DimInfo {
  dimArrays: ArrayLike<number>[];
  dimNames: string[];
  dimUnits: (string | null)[];
}

// Props accepted by MetaDimSelector
type Props = {
  meta: {
    name?: string;
    shape?: number[];
    chunks?: number[];
    totalSize?: number;
    dtype?: string;
    long_name?: string;
    dimInfo?: DimInfo;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  onApply?: (sels: SliceSelectionState[], axes: Axis[], dimNames: string[]) => void;
};

// Color mapping badges for standard coordinate axes
const AXIS_COLOR: Record<Axis, string> = {
  x: 'text-pink-500',
  y: 'text-green-500',
  z: 'text-blue-500',
  c: 'text-yellow-500',
};

// Internal active slicer row state storing name and selection
interface SlicerRow {
  dimName: string;
  sel: SliceSelectionState;
}

// Parses original dimension index from formatted name string (e.g. "lat::1" -> 1)
const getOrigIdx = (dimName: string) => {
  const parts = dimName.split('::');
  return parseInt(parts[parts.length - 1]);
};

// Positionally derives spatial axis name ('z', 'y', 'x') based on active row index
const getActiveAxis = (index: number, totalRows: number): Axis => {
  const axes: Axis[] = ['z', 'y', 'x'];
  return axes[axes.length - totalRows + index] ?? 'x';
};

// Extracted numeric slice range bounds for slicing calculation
interface ParsedSliceRange {
  first: number;
  last: number;
  steps: number;
}

// Helper parsing selection state into numerical start, stop, and step counts
const parseSliceRange = (sel: SliceSelectionState | undefined, defaultSize: number): ParsedSliceRange => {
  if (!sel) return { first: 0, last: defaultSize, steps: Math.max(1, defaultSize) };
  if (sel.mode === 'scalar') {
    const val = parseInt(sel.scalar) || 0;
    return { first: val, last: val + 1, steps: 1 };
  }
  const start = parseInt(sel.start) || 0;
  let stop = parseInt(sel.stop);
  if (isNaN(stop)) stop = defaultSize;
  else stop = Math.min(stop + 1, defaultSize > 0 ? defaultSize : stop + 1);
  return { first: start, last: stop, steps: Math.max(1, stop - start) };
};

// --- SCOPED STATE ISOLATION STORE ---
interface SelectorStoreState {
  rows: SlicerRow[];
  collapsedSels: Record<string, SliceSelectionState>;
  updateDimName: (oldDimName: string, newDimName: string, availableDims: DimOption[], dataShape: number[]) => void;
  updateSel: (dimName: string, sel: SliceSelectionState) => void;
  updateCollapsedSel: (dimName: string, sel: SliceSelectionState) => void;
  addRow: (availableDims: DimOption[], dataShape: number[]) => void;
  removeLastRow: () => void;
}

type SelectorStore = ReturnType<typeof createMetaSelectorStore>;

const createMetaSelectorStore = (initialRows: SlicerRow[], initialCollapsed: Record<string, SliceSelectionState>) =>
  createStore<SelectorStoreState>((set) => ({
    rows: initialRows,
    collapsedSels: initialCollapsed,
    updateDimName: (oldDimName, newDimName, availableDims, dataShape) => {
      if (oldDimName === newDimName) return;
      set((state) => {
        const existingIdx = state.rows.findIndex((r) => r.dimName === newDimName);
        const newDimIndex = availableDims.findIndex((d) => d.name === newDimName);
        const newDim = availableDims[newDimIndex];
        const newDimShape = dataShape[newDimIndex] ?? newDim?.size ?? 0;

        if (existingIdx >= 0) {
          const oldDimIndex = availableDims.findIndex((d) => d.name === oldDimName);
          const oldDim = availableDims[oldDimIndex];
          const oldDimShape = dataShape[oldDimIndex] ?? oldDim?.size ?? 0;

          return {
            rows: state.rows.map((r) => {
              if (r.dimName === oldDimName) return { dimName: newDimName, sel: defaultSelection(newDimShape) };
              if (r.dimName === newDimName) return { dimName: oldDimName, sel: defaultSelection(oldDimShape) };
              return r;
            }),
          };
        }

        return {
          rows: state.rows.map((r) => (r.dimName === oldDimName ? { dimName: newDimName, sel: defaultSelection(newDimShape) } : r)),
        };
      });
    },
    updateSel: (dimName, sel) => {
      set((state) => ({
        rows: state.rows.map((r) => (r.dimName === dimName ? { ...r, sel: { ...sel, mode: 'slice' } } : r)),
      }));
    },
    updateCollapsedSel: (dimName, sel) => {
      set((state) => ({
        collapsedSels: { ...state.collapsedSels, [dimName]: { ...sel, mode: 'scalar' } },
      }));
    },
    addRow: (availableDims, dataShape) => {
      set((state) => {
        if (state.rows.length >= MAX_ACTIVE_DIMS) return state;
        const usedNames = new Set(state.rows.map((r) => r.dimName));
        const dimName = availableDims.find((d) => !usedNames.has(d.name))?.name;
        if (!dimName) return state;
        const dim = availableDims.find((d) => d.name === dimName)!;
        const dimShape = dataShape[availableDims.indexOf(dim)] ?? dim.size;
        return { rows: [...state.rows, { dimName, sel: defaultSelection(dimShape) }] };
      });
    },
    removeLastRow: () => {
      set((state) => ({ rows: state.rows.slice(0, -1) }));
    },
  }));

const MetaSelectorContext = createContext<SelectorStore | null>(null);

const useMetaSelectorStore = <T,>(selector: (state: SelectorStoreState) => T): T => {
  const store = useContext(MetaSelectorContext);
  if (!store) throw new Error("MetaSelectorContext missing");
  return useStore(store, selector);
};

// --- ISOLATED SUB-COMPONENTS (Zero Parent Re-renders) ---

// Status badges for size, cache, and texture counts
const MetaStatusBadges: React.FC<{
  meta: Props['meta'];
  availableDims: DimOption[];
  cacheSize: number;
  setCacheSize: React.Dispatch<React.SetStateAction<number>>;
}> = React.memo(({ meta, availableDims, cacheSize, setCacheSize }) => {
  const rows = useMetaSelectorStore((s) => s.rows);
  const collapsedSels = useMetaSelectorStore((s) => s.collapsedSels);

  const initStore = useGlobalStore((s) => s.initStore);
  const idx4D = useGlobalStore((s) => s.idx4D);
  const cache = useCacheStore((s) => s.cache);
  const maxSize = useCacheStore((s) => s.maxSize);
  const compress = useZarrStore((s) => s.compress);
  const coarsen = useZarrStore((s) => s.coarsen);
  const kernelSize = useZarrStore((s) => s.kernelSize);
  const kernelDepth = useZarrStore((s) => s.kernelDepth);
  const setTextureArrayDepths = useGlobalStore((s) => s.setTextureArrayDepths);
  const maxTextureSize = usePlotStore((s) => s.maxTextureSize);
  const max3DTextureSize = usePlotStore((s) => s.max3DTextureSize);

  const dataShape = meta?.shape || [];
  const chunkShape = meta?.chunks || [];

  // Compute size data
  const sizeData = useMemo(() => {
    const getRowByAxis = (axis: Axis) => {
      const idx = rows.findIndex((_, i) => getActiveAxis(i, rows.length) === axis);
      return idx >= 0 ? rows[idx] : undefined;
    };

    const rowZ = getRowByAxis('z');
    const rowY = getRowByAxis('y');
    const rowX = getRowByAxis('x');

    const is2D = dataShape.length === 2 || !rowZ;

    const origIdxZ = rowZ ? getOrigIdx(rowZ.dimName) : -1;
    const origIdxY = rowY ? getOrigIdx(rowY.dimName) : -1;
    const origIdxX = rowX ? getOrigIdx(rowX.dimName) : -1;

    const lenZ = origIdxZ >= 0 ? dataShape[origIdxZ] : 1;
    const lenY = origIdxY >= 0 ? dataShape[origIdxY] : 1;
    const lenX = origIdxX >= 0 ? dataShape[origIdxX] : 1;

    const z = is2D ? { first: 0, last: 1, steps: 1 } : parseSliceRange(rowZ?.sel, lenZ);
    const y = parseSliceRange(rowY?.sel, lenY);
    const x = parseSliceRange(rowX?.sel, lenX);

    const maxSizeLimit = is2D ? maxTextureSize : max3DTextureSize;
    const texCounts = [z.steps / maxSizeLimit, y.steps / maxSizeLimit, x.steps / maxSizeLimit];

    const depths = texCounts.some((count) => count > 1)
      ? texCounts.map((val) => Math.ceil(val))
      : [1, 1, 1];

    const thisCount = texCounts.reduce((prod, val) => prod * Math.ceil(val), 1);

    const getSelSteps = (dimName: string, defaultLast: number) => {
      const row = rows.find((r) => r.dimName === dimName);
      if (row) return parseSliceRange(row.sel, defaultLast).steps;

      const collSel = collapsedSels[dimName];
      if (collSel) return parseSliceRange(collSel, defaultLast).steps;
      return defaultLast;
    };

    const totalSteps = availableDims.reduce((prod, d, idx) => {
      const dimShape = dataShape[idx] ?? d.size;
      return prod * getSelSteps(d.name, dimShape);
    }, 1);
    const sizeRatio = totalSteps / (dataShape.reduce((a, b) => a * b, 1) || 1);
    let calculatedSize = (meta.totalSize || 0) * sizeRatio;

    if (!is2D) {
      calculatedSize = calculatedSize / (coarsen ? kernelDepth * Math.pow(kernelSize, 2) : 1);
    }

    return { size: calculatedSize, thisCount, depths };
  }, [meta, rows, collapsedSels, availableDims, dataShape, chunkShape, coarsen, kernelSize, kernelDepth, maxTextureSize, max3DTextureSize]);

  useEffect(() => {
    setTextureArrayDepths(sizeData.depths);
  }, [sizeData.depths, setTextureArrayDepths]);

  const currentSize = sizeData.size;
  const texCount = sizeData.thisCount;
  const tooBig = texCount > 14;

  const cachedSize = useMemo(() => {
    const thisDtype = (meta?.dtype as string) || '';
    if (thisDtype.includes("32") || thisDtype.includes("f4")) {
      return currentSize / 2;
    } else if (thisDtype.includes("64") || thisDtype.includes("f8")) {
      return currentSize / 4;
    } else if (thisDtype.includes("8") || thisDtype.includes("i1")) {
      return currentSize * 2;
    } else {
      return currentSize;
    }
  }, [currentSize, meta]);

  const smallCache = cachedSize > cacheSize;

  const [cached, setCached] = useState(false);
  const [cachedChunks, setCachedChunks] = useState<string | null>(null);

  useEffect(() => {
    let newCached = false;
    let newCachedChunks: string | null = null;

    if (meta && meta.chunks && meta.shape) {
      const ndSlicesTemp = availableDims.map((d) => {
        const activeRow = rows.find((r) => r.dimName === d.name);
        if (activeRow) {
          const range = parseSliceRange(activeRow.sel, d.size);
          return [range.first, range.last] as [number, number];
        }
        const colSel = collapsedSels[d.name];
        if (colSel && colSel.mode === 'scalar') return parseInt(colSel.scalar) || 0;
        return 0;
      });

      const scalarIndices = ndSlicesTemp.filter((s) => typeof s === "number").join("_");
      let cacheBase = scalarIndices !== "" ? `${initStore}_${meta.name}_${scalarIndices}` : `${initStore}_${meta.name}`;
      if (meta.shape && meta.shape.length >= 4 && idx4D !== undefined && idx4D !== null) {
        cacheBase = `${cacheBase}_time${idx4D}`;
      }

      const getRowByAxis = (axis: Axis) => {
        const idx = rows.findIndex((_, i) => getActiveAxis(i, rows.length) === axis);
        return idx >= 0 ? rows[idx] : undefined;
      };

      const rowZ = getRowByAxis('z');
      const rowY = getRowByAxis('y');
      const rowX = getRowByAxis('x');

      const origIdxZ = rowZ ? getOrigIdx(rowZ.dimName) : -1;
      const origIdxY = rowY ? getOrigIdx(rowY.dimName) : -1;
      const origIdxX = rowX ? getOrigIdx(rowX.dimName) : -1;

      const zSlice = parseSliceRange(rowZ?.sel, origIdxZ >= 0 ? meta.shape?.[origIdxZ] ?? 1 : 1);
      const ySlice = parseSliceRange(rowY?.sel, origIdxY >= 0 ? meta.shape?.[origIdxY] ?? 1 : 1);
      const xSlice = parseSliceRange(rowX?.sel, origIdxX >= 0 ? meta.shape?.[origIdxX] ?? 1 : 1);

      const calcDim = (slice: { first: number; last: number }, dimIdx: number) => {
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
        newCachedChunks = `${accum}/${total}`;
        newCached = true;
      } else if (cache.has(`${initStore}_${meta.name}`)) {
        newCached = true;
      }
    } else if (meta && cache.has(`${initStore}_${meta.name}`)) {
      newCached = true;
    }

    setCached((prev) => (prev !== newCached ? newCached : prev));
    setCachedChunks((prev) => (prev !== newCachedChunks ? newCachedChunks : prev));
  }, [meta, cache, initStore, rows, collapsedSels, availableDims]);

  return (
    <div className="flex flex-col gap-2">
      {/* Size info badge */}
      <div className="flex items-center gap-2 text-xs bg-background border px-2 py-1 rounded-md shadow-sm w-fit">
        <span className="text-muted-foreground">Raw:</span> <span className="font-medium">{formatBytes(currentSize)}</span>
        <span className="text-muted-foreground/50">|</span>
        <span className="text-muted-foreground">Stored:</span> <span className="font-medium">{compress ? "<" : ""}{formatBytes(cachedSize)}</span>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-1 text-xs">
        {tooBig && (
          <span className="font-medium text-destructive">
            Too many textures ({texCount}/14). Won&apos;t fit.
          </span>
        )}
        {cached && (
          <span className="font-medium text-muted-foreground">
            {cachedChunks ? `${cachedChunks} chunks already cached` : "Already cached"}
          </span>
        )}
      </div>

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
                  onValueChange={(e) => setCacheSize(maxSize + e[0] * (1024 * 1024))}
                  className="flex-1 min-w-0"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    className="w-[70px] h-[28px] text-xs no-spinner"
                    type="number"
                    min={200}
                    step={20}
                    value={cacheSize / (1024 * 1024)}
                    onChange={(e) => setCacheSize(parseInt(e.target.value) * (1024 * 1024))}
                  />
                  <span className="text-xs font-semibold">MB</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BsFillQuestionCircleFill className="ml-1 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
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
    </div>
  );
});

// Dimension Table isolated sub-component
const MetaDimTable: React.FC<{
  availableDims: DimOption[];
  dataShape: number[];
  chunkShape: number[];
}> = React.memo(({ availableDims, dataShape, chunkShape }) => {
  const rows = useMetaSelectorStore((s) => s.rows);
  const collapsedSels = useMetaSelectorStore((s) => s.collapsedSels);

  return (
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
              const activeIndex = rows.findIndex((r) => r.dimName === dim.name);
              const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;
              const sel = activeRow ? activeRow.sel : collapsedSels[dim.name];
              const range = !sel ? '?' : sel.mode === 'scalar' ? sel.scalar || '0' : `${sel.start !== '' ? sel.start : '0'}:${sel.stop !== '' ? sel.stop : ':'}`;
              const axis = activeIndex >= 0 ? getActiveAxis(activeIndex, rows.length) : 'c';
              const dataSize = dataShape[originalIndex] ?? '?';
              const chunkSize = chunkShape[originalIndex] ?? '?';

              return (
                <tr key={dim.name} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-1.5 font-medium">{dim.name}</td>
                  <td className={`px-3 py-1.5 font-bold ${AXIS_COLOR[axis] ?? 'text-muted-foreground'}`}>{axis.toUpperCase()}</td>
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
  );
});

// Active Slicers list isolated sub-component
const MetaActiveSlicers: React.FC<{
  availableDims: DimOption[];
  dataShape: number[];
}> = React.memo(({ availableDims, dataShape }) => {
  const rows = useMetaSelectorStore((s) => s.rows);
  const updateDimNameAction = useMetaSelectorStore((s) => s.updateDimName);
  const updateSelAction = useMetaSelectorStore((s) => s.updateSel);
  const removeLastRow = useMetaSelectorStore((s) => s.removeLastRow);

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const dim = availableDims.find((d) => d.name === row.dimName);
        const isLast = i === rows.length - 1;
        const axis = getActiveAxis(i, rows.length);
        return (
          <DimSlicer
            key={row.dimName}
            availableDims={availableDims}
            dimName={row.dimName}
            onDimChange={(name) => updateDimNameAction(row.dimName, name, availableDims, dataShape)}
            onRemove={isLast && rows.length > 1 ? removeLastRow : undefined}
            dimSize={dim?.size ?? 0}
            selection={row.sel}
            axis={axis}
            onChange={(sel) => updateSelAction(row.dimName, sel)}
            values={dim?.values}
            formatValue={dim?.formatValue}
            lockMode="slice"
            allowedAxes={['z', 'y', 'x']}
          />
        );
      })}
    </div>
  );
});

// Collapsed Slicers list isolated sub-component
const MetaCollapsedSlicers: React.FC<{
  availableDims: DimOption[];
}> = React.memo(({ availableDims }) => {
  const rows = useMetaSelectorStore((s) => s.rows);
  const collapsedSels = useMetaSelectorStore((s) => s.collapsedSels);
  const updateCollapsedSelAction = useMetaSelectorStore((s) => s.updateCollapsedSel);

  const [collapsedOpen, setCollapsedOpen] = useState(false);

  const activeDimNames = new Set(rows.map((r) => r.dimName));
  const collapsedDims = availableDims.filter((d) => !activeDimNames.has(d.name));

  if (collapsedDims.length === 0) return null;

  return (
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
              onChange={(sel) => updateCollapsedSelAction(dim.name, sel)}
              values={dim.values}
              formatValue={dim.formatValue}
              lockMode="scalar"
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Controls for adding dimensions
const MetaAddDimensionControl: React.FC<{
  availableDims: DimOption[];
  dataShape: number[];
}> = React.memo(({ availableDims, dataShape }) => {
  const rows = useMetaSelectorStore((s) => s.rows);
  const addRowAction = useMetaSelectorStore((s) => s.addRow);

  const activeDimNames = new Set(rows.map((r) => r.dimName));
  const collapsedDims = availableDims.filter((d) => !activeDimNames.has(d.name));

  const atMax = rows.length >= MAX_ACTIVE_DIMS;
  const noUnused = collapsedDims.length === 0;
  const canAdd = !atMax && !noUnused;

  const addTooltip = atMax
    ? `Maximum of ${MAX_ACTIVE_DIMS} dimensions, remove one before adding another.`
    : noUnused
      ? 'All dimensions are already active.'
      : undefined;

  return (
    <div className="relative group">
      <button
        onClick={() => addRowAction(availableDims, dataShape)}
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
  );
});

// --- MAIN PANEL CONTAINER (Zero Re-renders during Slider Movements) ---
export default function MetaDimSelector({ meta, metadata, onApply }: Props) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  // Set mounted state after initial client render
  useEffect(() => setMounted(true), []);

  // Extract dimension coordinate arrays from metadata props
  const dimArrays = useMemo(
    () => (meta?.dimInfo?.dimArrays ?? []).map((a) => Array.from(a)),
    [meta?.dimInfo?.dimArrays]
  );
  // Extract dimension unit strings from metadata props
  const dimUnits = useMemo(
    () => (meta?.dimInfo?.dimUnits ?? []).map((u) => u ?? ''),
    [meta?.dimInfo?.dimUnits]
  );
  // Extract dimension names from metadata props
  const dimNames = useMemo(
    () => meta?.dimInfo?.dimNames ?? [],
    [meta?.dimInfo?.dimNames]
  );
  const dataShape = meta?.shape || [];
  const chunkShape = meta?.chunks || [];

  const { setDimArrays, setDimNames, setDimUnits, setVariable, variable, idx4D } = useGlobalStore(
    useShallow((state) => ({
      setDimArrays: state.setDimArrays,
      setDimNames: state.setDimNames,
      setDimUnits: state.setDimUnits,
      setVariable: state.setVariable,
      variable: state.variable,
      idx4D: state.idx4D,
    }))
  );

  const { maxSize, setMaxSize } = useCacheStore(
    useShallow((state) => ({ maxSize: state.maxSize, setMaxSize: state.setMaxSize }))
  );
  const [cacheSize, setCacheSize] = useState(maxSize);

  // Bind Zarr dataset store state
  const { ndSlices, axisMapping, setZSlice, setYSlice, setXSlice, ReFetch, compress, setCompress, coarsen, setCoarsen, kernelSize, setKernelSize, kernelDepth, setKernelDepth } = useZarrStore(
    useShallow((state) => ({
      ndSlices: state.ndSlices,
      axisMapping: state.axisMapping,
      setZSlice: state.setZSlice,
      setYSlice: state.setYSlice,
      setXSlice: state.setXSlice,
      ReFetch: state.ReFetch,
      compress: state.compress,
      setCompress: state.setCompress,
      coarsen: state.coarsen,
      setCoarsen: state.setCoarsen,
      kernelSize: state.kernelSize,
      setKernelSize: state.setKernelSize,
      kernelDepth: state.kernelDepth,
      setKernelDepth: state.setKernelDepth,
    }))
  );

  const [displaySpat, setDisplaySpat] = useState(String(kernelSize));
  const [displayDepth, setDisplayDepth] = useState(String(kernelDepth));

  const availableDims: DimOption[] = useMemo(
    () =>
      dimArrays.map((values, idx) => {
        const baseName = dimNames[idx] ?? `dim${idx}`;
        const name = `${baseName}::${idx}`;
        const label = baseName;
        const unit = dimUnits[idx] || undefined;
        return {
          name,
          label,
          size: values.length,
          values,
          formatValue: (v: number): string => String(parseLoc(v, unit)),
        };
      }),
    [dimArrays, dimNames, dimUnits],
  );

  const dimsKey = availableDims.map((d) => `${d.name}:${d.size}`).join('|');

  const initialCollapsed = useMemo(() => {
    const isCurrentVar = variable === meta.name && ndSlices && ndSlices.length === availableDims.length;
    return Object.fromEntries(
      availableDims.map((d, i) => {
        let sel: SliceSelectionState = { ...defaultSelection(d.size), mode: 'scalar' };
        if (isCurrentVar) {
          const s = ndSlices[i];
          if (typeof s === 'number') {
            sel = { start: '', stop: '', scalar: String(s), mode: 'scalar' };
          }
        }
        return [d.name, sel];
      })
    );
  }, [availableDims, variable, meta.name, ndSlices]);

  const initialRows = useMemo(() => {
    const isCurrentVar = variable === meta.name && ndSlices && ndSlices.length === availableDims.length && axisMapping;

    if (isCurrentVar) {
      const initRows: SlicerRow[] = [];
      const axes: Axis[] = ['z', 'y', 'x'];
      const seenNames = new Set<string>();

      for (const axis of axes) {
        const mappedIdx = (axisMapping as Record<string, number>)[axis];
        if (mappedIdx !== undefined && mappedIdx >= 0 && mappedIdx < availableDims.length) {
          const dim = availableDims[mappedIdx];
          if (!seenNames.has(dim.name)) {
            seenNames.add(dim.name);
            const s = ndSlices[mappedIdx];
            const dimShape = dataShape[mappedIdx] ?? dim.size;
            let sel = defaultSelection(dimShape);
            if (Array.isArray(s)) {
              sel = { start: String(s[0]), stop: s[1] !== null ? String(s[1]) : '', scalar: '', mode: 'slice' };
            }
            initRows.push({ dimName: dim.name, sel });
          }
        }
      }

      if (initRows.length > 0) return initRows;
    }

    const activeDims = availableDims.slice(-Math.min(MAX_ACTIVE_DIMS, availableDims.length));
    return activeDims.map((d) => {
      const dimShape = dataShape[availableDims.indexOf(d)] ?? d.size;
      return {
        dimName: d.name,
        sel: defaultSelection(dimShape),
      };
    });
  }, [availableDims, variable, meta.name, ndSlices, axisMapping, dataShape]);

  // Create isolated store instance per variable key
  const selectorStore = useMemo(
    () => createMetaSelectorStore(initialRows, initialCollapsed),
    [dimsKey] // Re-create clean store instance when dimensions change
  );

  // Reset compression state when variable name changes
  useEffect(() => {
    setCompress(false);
  }, [meta?.name, setCompress]);

  // Plot handler executed ONLY when user clicks the Plot button
  const handlePlot = () => {
    const { rows, collapsedSels } = selectorStore.getState();

    // Update global store dimension arrays, names, and units on explicit plot action
    setDimArrays(dimArrays);
    setDimNames(dimNames);
    setDimUnits(dimUnits);

    const getRowByAxis = (axis: Axis) => {
      const idx = rows.findIndex((_, i) => getActiveAxis(i, rows.length) === axis);
      return idx >= 0 ? rows[idx] : undefined;
    };

    const rowZ = getRowByAxis('z');
    const rowY = getRowByAxis('y');
    const rowX = getRowByAxis('x');

    const getSliceArray = (row?: SlicerRow, defaultLast = 0): [number, number | null] => {
      if (!row) return [0, null];
      const range = parseSliceRange(row.sel, defaultLast);
      if (row.sel.mode === 'scalar') return [range.first, range.last];
      return [range.first, range.last === defaultLast ? null : range.last];
    };

    setZSlice(getSliceArray(rowZ, dataShape ? dataShape[getOrigIdx(rowZ?.dimName || '')] : 0));
    setYSlice(getSliceArray(rowY, dataShape ? dataShape[getOrigIdx(rowY?.dimName || '')] : 0));
    setXSlice(getSliceArray(rowX, dataShape ? dataShape[getOrigIdx(rowX?.dimName || '')] : 0));

    const ndSlices: (number | [number, number | null])[] = availableDims.map((dim, idx) => {
      const dimShape = dataShape ? dataShape[idx] ?? dim.size : dim.size;
      const row = rows.find((r) => r.dimName === dim.name);
      if (row) {
        if (row.sel.mode === 'scalar') return parseInt(row.sel.scalar) || 0;
        const range = parseSliceRange(row.sel, dimShape);
        return range.last === dimShape ? [range.first, null] : [range.first, range.last];
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

    const activeDimNames = new Set(rows.map((r) => r.dimName));
    const collapsedDims = availableDims.filter((d) => !activeDimNames.has(d.name));

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

    usePlotStore.setState({ coarsen, kernel: { kernelDepth, kernelSize } });

    onApply?.(
      rows.map((r) => r.sel),
      rows.map((_, i) => getActiveAxis(i, rows.length)),
      rows.map((r) => r.dimName)
    );
  };

  return (
    <MetaSelectorContext.Provider value={selectorStore}>
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
                <Switch id="coarsen" checked={coarsen} onCheckedChange={(e) => setCoarsen(e)} />
              </div>

              {/* Compress Toggle */}
              <div className="flex items-center gap-2">
                <label htmlFor="compress-data" className="font-semibold cursor-pointer flex items-center">
                  Compress
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BsFillQuestionCircleFill className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[min(100%,16rem)] break-words whitespace-normal">
                      Compress data to preserve memory at the expense of slightly longer load times
                    </TooltipContent>
                  </Tooltip>
                </label>
                <Switch id="compress-data" checked={compress} onCheckedChange={(e) => setCompress(e)} />
              </div>

              {/* Plot Button */}
              <div className="flex items-center justify-end ml-auto min-w-0">
                <Button
                  variant={'pink'}
                  className="cursor-pointer hover:scale-[1.05] shadow-sm h-8 px-4"
                  onClick={handlePlot}
                >
                  Plot
                </Button>
              </div>
            </div>

            {/* Status Information (Isolated Sub-component) */}
            <MetaStatusBadges
              meta={meta}
              availableDims={availableDims}
              cacheSize={cacheSize}
              setCacheSize={setCacheSize}
            />
          </div>

          {/* Coarsen Expand UI */}
          <Hider show={coarsen}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 bg-background p-3 rounded-md border text-sm">
              <div
                className="flex items-center justify-between sm:justify-start sm:gap-4"
                style={{ visibility: dataShape.length >= 3 ? 'visible' : 'hidden' }}
              >
                <span className="font-semibold">Temporal Coarsening</span>
                <div className="flex items-center gap-2">
                  <Input
                    type='number'
                    min='0'
                    step={1}
                    value={displayDepth}
                    className="w-16 h-8 text-center"
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDisplayDepth(e.target.value);
                      setKernelDepth(Math.pow(2, val));
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                <span className="font-semibold">Spatial Coarsening</span>
                <div className="flex items-center gap-2">
                  <Input
                    type='number'
                    min='0'
                    step={1}
                    value={displaySpat}
                    className="w-16 h-8 text-center"
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDisplaySpat(e.target.value);
                      setKernelSize(Math.pow(2, val));
                    }}
                  />
                </div>
              </div>
              <div className="col-span-1 sm:col-span-2 text-xs text-muted-foreground/70 italic sm:text-center mt-1">
                Values represent 2ⁿ
              </div>
            </div>
          </Hider>

          {/* Dimension Table (Isolated Sub-component) */}
          <MetaDimTable
            availableDims={availableDims}
            dataShape={dataShape}
            chunkShape={chunkShape}
          />
        </div>

        {/* DimSlicers Area */}
        <div className="px-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground/80">Active Dimensions</h3>
            {/* Add Dimension Control (Isolated Sub-component) */}
            <MetaAddDimensionControl availableDims={availableDims} dataShape={dataShape} />
          </div>

          {/* Active Slicers (Isolated Sub-component) */}
          <MetaActiveSlicers availableDims={availableDims} dataShape={dataShape} />

          {/* Collapsed Dimensions (Isolated Sub-component) */}
          <MetaCollapsedSlicers availableDims={availableDims} />
        </div>
      </div>
    </MetaSelectorContext.Provider>
  );
}