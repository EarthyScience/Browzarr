"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { DimConfigBar } from '@/components/ui/DimConfig';
import DimSlicer, {
  Axis,
  canUseSliceMode,
  defaultAxisForIndex,
  defaultSelectionForIndex,
  getAvailableSliceAxes,
  SelectionMode,
  SliceSelectionState,
} from '@/components/ui/DimSlicer';
import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { parseLoc } from '@/utils/HelperFuncs';

type Props = {
  meta: any;
  metadata?: Record<string, any>;
  onApply?: (sels: SliceSelectionState[], axes: Axis[]) => void;
};

export default function MetaDimSelector({ meta, onApply }: Props) {
  const { dimArrays = [], dimNames = [], dimUnits = [] } = meta?.dimInfo ?? {};

  const DIMS = useMemo(
    () =>
      dimArrays.map((arr: any, idx: number) => {
        const values = Array.isArray(arr) ? arr : [];
        const size = values.length;
        return {
          name: dimNames?.[idx] ?? `dim${idx}`,
          size,
          values,
          formatValue: (i: number) => parseLoc(values?.[i] ?? i, dimUnits?.[idx] ?? null),
        };
      }),
    [dimArrays, dimNames, dimUnits]
  );

  const [sels, setSels] = useState<SliceSelectionState[]>(() =>
    DIMS.map((d, i) => defaultSelectionForIndex(i, d.size))
  );
  const [axes, setAxes] = useState<Axis[]>(() => DIMS.map((_, i) => defaultAxisForIndex(i)));
  const [showSliders, setShowSliders] = useState(true);

  useEffect(() => {
    // reset selections/axes when meta dims change
    setSels(DIMS.map((d, i) => defaultSelectionForIndex(i, d.size)));
    setAxes(DIMS.map((_, i) => defaultAxisForIndex(i)));
  }, [DIMS.length]);

  const updateSelection = (i: number, next: SliceSelectionState) => {
    setSels(prev => prev.map((s, idx) => (idx === i ? next : s)));
  };

  const updateAxis = (i: number, axis: Axis) => {
    if (axis === 'c') return;
    if (!getAvailableSliceAxes(sels, axes, i).includes(axis)) return;
    setAxes(prev => prev.map((a, idx) => (idx === i ? axis : a)));
  };

  const updateMode = (i: number, mode: SelectionMode) => {
    if (mode === 'slice' && !canUseSliceMode(sels, axes, i)) return;

    const nextSels = sels.map((s, idx) => (idx === i ? { ...s, mode } : s));
    setSels(nextSels);

    if (mode === 'slice') {
      const available = getAvailableSliceAxes(nextSels, axes, i);
      if (available.length > 0) {
        const nextAxis = available.includes(axes[i]) ? axes[i] : available[0];
        setAxes(prev => prev.map((a, idx) => (idx === i ? nextAxis : a)));
      }
    }
  };

  return (
    <div className="min-h-0">
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <div>
            <CardTitle>Dimension Selector</CardTitle>
            <CardDescription className="mt-1">Configure axis & slices from meta.dimInfo</CardDescription>
          </div>

          <DimConfigBar variableName={meta?.name ?? 'variable'} dims={DIMS} sels={sels} axes={axes} onModeChange={updateMode} onAxisChange={updateAxis} />
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="rounded-md border bg-muted/30 p-2.5">
            <div className="rounded-lg bg-muted/20 p-2 mb-2">
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowSliders(prev => !prev)}>
                {showSliders ? 'Hide sliders' : 'Show sliders'}
              </Button>
            </div>

            {showSliders && (
              <div className="space-y-2">
                {DIMS.map((dim, i) => (
                  <div key={dim.name} className="rounded-lg bg-muted/20 p-2">
                    <DimSlicer dimName={dim.name} dimSize={dim.size} axis={axes[i]} selection={sels[i]} onChange={next => updateSelection(i, next)} values={dim.values} formatValue={dim.formatValue} />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => {
                  onApply?.(sels, axes);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
