"use client";

import React, { useMemo, useState } from 'react';
import DimSlicer, { Axis, defaultSelection, SliceSelectionState } from '@/components/ui/DimSlicer';
import { Button } from '@/components/ui/button';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { parseLoc } from '@/utils/HelperFuncs';

interface DimInfo {
  dimArrays: ArrayLike<number>[];
  dimNames: string[];
  dimUnits: (string | null)[];
}

type Props = {
  meta: {
    name?: string;
    shape?: number[];
    dimInfo?: DimInfo;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  onApply?: (sels: SliceSelectionState[], axes: Axis[]) => void;
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

function selectionSummary(sels: SliceSelectionState[]): string {
  const parts = sels.map((sel) => {
    if (sel.mode === 'scalar') return sel.scalar || '0';
    const start = sel.start !== '' ? sel.start : '0';
    const stop  = sel.stop  !== '' ? sel.stop  : ':';
    return `${start}:${stop}`;
  });
  return `[ ${parts.join(', ')} ]`;
}

export default function MetaDimSelector({ meta, onApply }: Props) {
  const rawDimArrays = meta?.dimInfo?.dimArrays ?? [];
  const rawDimNames  = meta?.dimInfo?.dimNames  ?? [];
  const rawDimUnits  = meta?.dimInfo?.dimUnits  ?? [];

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

  const DIMS = useMemo(
    () =>
      dimArrays.map((values, idx) => ({
        name: dimNames[idx] ?? `dim${idx}`,
        size: values.length,
        values,
        formatValue: (i: number): string =>
          String(parseLoc(values[i] ?? i, dimUnits[idx] || undefined)),
      })),
    [dimArrays, dimNames, dimUnits],
  );

  const dimsKey = DIMS.map((d) => `${d.name}:${d.size}`).join('|');

  const [sels, setSels] = useState<SliceSelectionState[]>(() =>
    DIMS.map((d) => defaultSelection(d.size)),
  );
  const [axes, setAxes] = useState<Axis[]>(() =>
    DIMS.map((_, i) => defaultAxisForIndex(i, DIMS.length)),
  );

  const [lastKey, setLastKey] = useState(dimsKey);
  if (dimsKey !== lastKey) {
    setLastKey(dimsKey);
    setSels(DIMS.map((d) => defaultSelection(d.size)));
    setAxes(DIMS.map((_, i) => defaultAxisForIndex(i, DIMS.length)));
  }

  const selUpdaters = useMemo(
    () => DIMS.map((_, i) => (next: SliceSelectionState) =>
      setSels((prev) => {
        const copy = prev.slice();
        copy[i] = next;
        return copy;
      })
    ),
    [dimsKey],
  );

  const axisUpdaters = useMemo(
    () => DIMS.map((_, i) => (axis: Axis) =>
      setAxes((prev) => {
        const copy = prev.slice();
        copy[i] = axis;
        return copy;
      })
    ),
    [dimsKey],
  );

  const summary = useMemo(() => selectionSummary(sels), [sels]);

  return (
    // <div className="min-h-0">
      <Card className="border-0 w-full">
        <CardHeader className="pb-2">
          {/* <CardTitle>{meta?.name ?? 'variable'}</CardTitle> */}
          {/* e.g. temperature [ 0:364, 0:47, -90:89 ] */}
          <CardDescription className="font-mono text-xs">
            {meta?.name ?? 'variable'} {summary}
          </CardDescription>

          {/* e.g. (time, z, 0), (lon, x, 1), (lat, y, 2) */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
            {DIMS.map((dim, i) => (
              <span key={dim.name} className="font-mono text-xs text-muted-foreground">
                (
                <span className="text-foreground">{dim.name}</span>
                ,{' '}
                <span className={AXIS_COLOR[axes[i]]}>{axes[i]}</span>
                ,{' '}
                <span className="text-muted-foreground/70">{i}</span>
                )
              </span>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {DIMS.map((dim, i) => (
            <DimSlicer
              key={dim.name}
              dimName={dim.name}
              dimSize={dim.size}
              selection={sels[i]}
              axis={axes[i]}
              onChange={selUpdaters[i]}
              onAxisChange={axisUpdaters[i]}
              values={dim.values}
              formatValue={dim.formatValue}
            />
          ))}
          {/* This will be the PLOT action. */}
          <div className="flex justify-end pt-2">
            <Button onClick={() => onApply?.(sels, axes)}>Pass to plot</Button>
          </div>
        </CardContent>
      </Card>
    // </div>
  );
}