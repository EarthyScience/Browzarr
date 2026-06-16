"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { DimConfigBar } from '@/components/ui/DimConfig';
import DimSlicer, {
  Axis,
  canUseSliceMode,
  defaultSelectionForIndex,
  getAvailableSliceAxes,
  SelectionMode,
  SliceSelectionState,
} from '@/components/ui/DimSlicer';
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

export default function MetaDimSelector({ meta, onApply }: Props) {
  const rawDimArrays = meta?.dimInfo?.dimArrays ?? [];
  const rawDimNames  = meta?.dimInfo?.dimNames  ?? [];
  const rawDimUnits  = meta?.dimInfo?.dimUnits  ?? [];
  const shape        = meta?.shape ?? [];
  const shapeLength  = shape.length;

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

  const getAxisForDimIndex = useCallback(
    (idx: number): Axis => {
      if (shapeLength <= 1) return 'c';
      if (shapeLength === 2) return idx === 0 ? 'y' : 'x';
      if (shapeLength === 3) return idx === 0 ? 'z' : idx === 1 ? 'y' : 'x';
      if (shapeLength === 4) return idx === 0 ? 'c' : idx === 1 ? 'z' : idx === 2 ? 'y' : 'x';
      return 'c';
    },
    [shapeLength],
  );

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

  // Memoised defaults — recalculated only when DIMS changes
  const defaultSels = useMemo(
    () => DIMS.map((d, i) => defaultSelectionForIndex(i, d.size)),
    [DIMS],
  );
  const defaultAxes = useMemo(
    () => DIMS.map((_, i) => getAxisForDimIndex(i)),
    [DIMS, getAxisForDimIndex],
  );

  const [overrideKey, setOverrideKey]     = useState(dimsKey);
  const [selOverrides, setSelOverrides]   = useState<SliceSelectionState[]>(defaultSels);
  const [axisOverrides, setAxisOverrides] = useState<Axis[]>(defaultAxes);

  // Per-index fallback guarantees sels[i] / axes[i] are never undefined
  const sels: SliceSelectionState[] = DIMS.map((d, i) =>
    overrideKey === dimsKey
      ? (selOverrides[i] ?? defaultSelectionForIndex(i, d.size))
      : defaultSelectionForIndex(i, d.size),
  );
  const axes: Axis[] = DIMS.map((_, i) =>
    overrideKey === dimsKey
      ? (axisOverrides[i] ?? getAxisForDimIndex(i))
      : getAxisForDimIndex(i),
  );

  const commitOverrides = (nextSels: SliceSelectionState[], nextAxes: Axis[]) => {
    setOverrideKey(dimsKey);
    setSelOverrides(nextSels);
    setAxisOverrides(nextAxes);
  };

  const updateSelection = (i: number, next: SliceSelectionState) =>
    commitOverrides(sels.map((s, idx) => (idx === i ? next : s)), axes);

  const updateAxis = (i: number, axis: Axis) => {
    if (axis === 'c') return;
    if (!getAvailableSliceAxes(sels, axes, i).includes(axis)) return;
    commitOverrides(sels, axes.map((a, idx) => (idx === i ? axis : a)));
  };

  const updateMode = (i: number, mode: SelectionMode) => {
    if (mode === 'slice' && !canUseSliceMode(sels, axes, i)) return;
    const nextSels = sels.map((s, idx) => (idx === i ? { ...s, mode } : s));
    let nextAxes = axes;
    if (mode === 'slice') {
      const available = getAvailableSliceAxes(nextSels, axes, i);
      if (available.length > 0) {
        const nextAxis = available.includes(axes[i]) ? axes[i] : available[0];
        nextAxes = axes.map((a, idx) => (idx === i ? nextAxis : a));
      }
    }
    commitOverrides(nextSels, nextAxes);
  };

  const [showSliders, setShowSliders] = useState(true);

  return (
    <div className="min-h-0">
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <div>
            <CardTitle>Dimension Selector</CardTitle>
            <CardDescription className="mt-1">
              Configure axis &amp; slices from meta.dimInfo
            </CardDescription>
          </div>
          <DimConfigBar
            variableName={meta?.name ?? 'variable'}
            dims={DIMS}
            sels={sels}
            axes={axes}
            onModeChange={updateMode}
            onAxisChange={updateAxis}
          />
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="rounded-md border bg-muted/30 p-2.5">
            <div className="rounded-lg bg-muted/20 p-2 mb-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowSliders((prev) => !prev)}
              >
                {showSliders ? 'Hide sliders' : 'Show sliders'}
              </Button>
            </div>

            {showSliders && (
              <div className="space-y-2">
                {DIMS.map((dim, i) => (
                  <div key={dimNames[i] ?? i} className="rounded-lg bg-muted/20 p-2">
                    <DimSlicer
                      dimName={dim.name}
                      dimSize={dim.size}
                      axis={axes[i]}
                      selection={sels[i]}
                      onChange={(next) => updateSelection(i, next)}
                      values={dim.values}
                      formatValue={dim.formatValue}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <Button onClick={() => onApply?.(sels, axes)}>Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
