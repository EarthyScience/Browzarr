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

function defaultAxisForIndex(idx: number, total: number): Axis {
  if (total <= 1) return 'c';
  if (total === 2) return idx === 0 ? 'y' : 'x';
  if (total === 3) return idx === 0 ? 'z' : idx === 1 ? 'y' : 'x';
  return (['c', 'z', 'y', 'x'] as Axis[])[idx] ?? 'c';
}

function selectionSummary(dimNames: string[], sels: SliceSelectionState[]): string {
  const parts = sels.map((sel, i) => {
    const name = dimNames[i] ?? `dim${i}`;
    const range =
      sel.mode === 'scalar'
        ? sel.scalar || '0'
        : `${sel.start !== '' ? sel.start : '0'}:${sel.stop !== '' ? sel.stop : ':'}`;
    return `${name}=${range}`;
  });
  return `[ ${parts.join(', ')} ]`;
}

/** One active slicer row */
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

  /** All available dims derived from meta */
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

  /** Pick the first dim name not already used by active rows, or fall back to first dim */
  const firstUnusedDim = (currentRows: SlicerRow[]): string => {
    const usedNames = new Set(currentRows.map((r) => r.dimName));
    return availableDims.find((d) => !usedNames.has(d.name))?.name ?? availableDims[0]?.name ?? '';
  };

  const makeInitialRows = (dims: DimOption[]): SlicerRow[] =>
    dims.map((d, i) => ({
      id: nextId(),
      dimName: d.name,
      sel: defaultSelection(d.size),
      axis: defaultAxisForIndex(i, dims.length),
    }));

  const [rows, setRows] = useState<SlicerRow[]>(() => makeInitialRows(availableDims));
  const [lastKey, setLastKey] = useState(dimsKey);

  if (dimsKey !== lastKey) {
    setLastKey(dimsKey);
    setRows(makeInitialRows(availableDims));
  }

  /** Add a new row defaulting to the first unused dim */
  const addRow = () => {
    setRows((prev) => {
      const dimName = firstUnusedDim(prev);
      if (!dimName) return prev; // all dims already present and no duplicates allowed
      const dim = availableDims.find((d) => d.name === dimName)!;
      const newRow: SlicerRow = {
        id: nextId(),
        dimName,
        sel: defaultSelection(dim.size),
        axis: defaultAxisForIndex(prev.length, prev.length + 1),
      };
      return [...prev, newRow];
    });
  };

  const removeRow = (id: number) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const updateDimName = (id: number, dimName: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const dim = availableDims.find((d) => d.name === dimName);
        return {
          ...r,
          dimName,
          sel: defaultSelection(dim?.size),
        };
      }),
    );
  };

  const updateSel = (id: number, sel: SliceSelectionState) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, sel } : r)));

  const updateAxis = (id: number, axis: Axis) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, axis } : r)));

  const summary = useMemo(
    () => selectionSummary(rows.map((r) => r.dimName), rows.map((r) => r.sel)),
    [rows],
  );

  const canAddMore = rows.length < availableDims.length;

  return (
    <>
      <b>{`${meta.long_name} `}</b>
      <Popover>
        <PopoverTrigger className="cursor-pointer" asChild>
          <Badge variant="default" className="block">
            Attributes
          </Badge>
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

      <div className="space-y-3">
        {rows.map((row) => {
          const dim = availableDims.find((d) => d.name === row.dimName);
          return (
            <DimSlicer
              key={row.id}
              availableDims={availableDims}
              dimName={row.dimName}
              onDimChange={(name) => updateDimName(row.id, name)}
              onRemove={() => removeRow(row.id)}
              dimSize={dim?.size ?? 0}
              selection={row.sel}
              axis={row.axis}
              onChange={(sel) => updateSel(row.id, sel)}
              onAxisChange={(axis) => updateAxis(row.id, axis)}
              values={dim?.values}
              formatValue={dim?.formatValue}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={addRow}
          disabled={!canAddMore}
          className="cursor-pointer flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Add dimension"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="7" y1="2" x2="7" y2="12" />
            <line x1="2" y1="7" x2="12" y2="7" />
          </svg>
          Add dimension
        </button>

        <Button onClick={() => onApply?.(rows.map((r) => r.sel), rows.map((r) => r.axis), rows.map((r) => r.dimName))}>
          Pass to plot
        </Button>
      </div>
    </>
  );
}