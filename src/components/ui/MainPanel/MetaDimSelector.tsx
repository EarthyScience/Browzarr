"use client";

import React, { useMemo, useState } from 'react';
import DimSlicer, { Axis, defaultSelection, DimOption, SliceSelectionState } from '@/components/ui/DimSlicer';
import { defaultAttributes, renderAttributes } from "@/components/ui/MetaData";
import { Button } from '@/components/ui/button';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui";
import { parseLoc } from '@/utils/HelperFuncs';
import { ChevronDown, ChevronRight } from 'lucide-react';

const MAX_ACTIVE_DIMS = 3;
const DEFAULT_AXES: Axis[] = ['z', 'y', 'x'];

const formatArray = (value: string | number[]): string => {
  if (typeof value === 'string') return value;
  return Array.isArray(value) ? value.join(', ') : String(value);
};

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
    long_name?: string;
    dimInfo?: DimInfo;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  onApply?: (sels: SliceSelectionState[], axes: Axis[], dimNames: string[]) => void;
};

const AXIS_COLOR: Record<Axis, string> = {
  x: 'text-pink-500',
  y: 'text-green-500',
  z: 'text-blue-500',
  c: 'text-yellow-500',
};

function axisForIndex(idx: number): Axis {
  return DEFAULT_AXES[idx] ?? DEFAULT_AXES[DEFAULT_AXES.length - 1];
}

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

export default function MetaDimSelector({ meta, metadata, onApply }: Props) {
  const rawDimArrays = meta?.dimInfo?.dimArrays ?? [];
  const rawDimNames  = meta?.dimInfo?.dimNames  ?? [];
  const rawDimUnits  = meta?.dimInfo?.dimUnits  ?? [];
  const dataShape  = meta?.shape;
  const chunkShape = meta?.chunks;

  const dimArrays: number[][] = useMemo(
    () => rawDimArrays.map((a) => Array.from(a)),
    [rawDimArrays],
  );
  const dimUnits: string[] = useMemo(
    () => rawDimUnits.map((u) => u ?? ''),
    [rawDimUnits],
  );
  const dimNames: string[] = rawDimNames;

  const { setDimArrays, setDimNames, setDimUnits } = useGlobalStore(
    useShallow((state) => ({
      setDimArrays: state.setDimArrays,
      setDimNames:  state.setDimNames,
      setDimUnits:  state.setDimUnits,
    })),
  );

  React.useEffect(() => {
    setDimArrays(dimArrays);
    setDimNames(dimNames);
    setDimUnits(dimUnits);
  }, [dimArrays, dimNames, dimUnits, setDimArrays, setDimNames, setDimUnits]);

  const availableDims: DimOption[] = useMemo(
    () =>
      dimArrays.map((values, idx) => ({
        name: dimNames[idx] ?? `dim${idx}`,
        size: values.length,
        values,
        formatValue: (v: number): string =>
          String(parseLoc(values[v] ?? v, dimUnits[idx] || undefined)),
      })),
    [dimArrays, dimNames, dimUnits],
  );

  const dimsKey = availableDims.map((d) => `${d.name}:${d.size}`).join('|');

  const makeInitialCollapsedSels = (dims: DimOption[]): Record<string, SliceSelectionState> =>
    Object.fromEntries(dims.map((d) => [d.name, { ...defaultSelection(d.size), mode: 'scalar' as const }]));

  /** Default to first MIN(3, availableDims.length) dims as active rows */
  const makeInitialRows = (dims: DimOption[]): SlicerRow[] =>
    dims.slice(0, MAX_ACTIVE_DIMS).map((d, i) => ({
      id: nextId(),
      dimName: d.name,
      sel: { ...defaultSelection(d.size), mode: 'slice' },
      axis: axisForIndex(i),
    }));

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

  const firstUnusedDim = (currentRows: SlicerRow[]): string => {
    const usedNames = new Set(currentRows.map((r) => r.dimName));
    return availableDims.find((d) => !usedNames.has(d.name))?.name ?? '';
  };

  const addRow = () => {
    setRows((prev) => {
      if (prev.length >= MAX_ACTIVE_DIMS) return prev;
      const dimName = firstUnusedDim(prev);
      if (!dimName) return prev;
      const dim = availableDims.find((d) => d.name === dimName)!;
      const newRow: SlicerRow = {
        id: nextId(),
        dimName,
        sel: { ...defaultSelection(dim.size), mode: 'slice' },
        axis: axisForIndex(prev.length),
      };
      return [...prev, newRow];
    });
  };

  const removeLastRow = () =>
    setRows((prev) => prev.slice(0, -1));

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

  // const updateAxis = (id: number, axis: Axis) =>
  //   setRows((prev) => prev.map((r) => (r.id === id ? { ...r, axis } : r)));

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

  return (
    <>
      <b>{`${meta.long_name} `}</b>
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

      <div className="font-mono text-xs">
        {'selection'} {summary}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 mb-4">
        {rows.map((row, i) => (
          <span key={row.id} className="font-mono text-xs text-muted-foreground">
            (
            <span className="text-foreground">{row.dimName}</span>
            ,{' '}
            <span className={AXIS_COLOR[row.axis]}>{row.axis}</span>
            ,{' '}
            <span className="text-muted-foreground/70">{i}</span>
            )
          </span>
        ))}
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
              // onAxisChange={(axis) => updateAxis(row.id, axis)}
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
                  onDimChange={() => {}}
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

      <div className="flex justify-end pt-4">
        <Button onClick={() => onApply?.(rows.map((r) => r.sel), rows.map((r) => r.axis), rows.map((r) => r.dimName))}>
          Pass to plot
        </Button>
      </div>
    </>
  );
}