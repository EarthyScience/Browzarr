"use client";

import React, { useMemo, useState, useCallback } from 'react';
import DimSlicer, { defaultSelection, SliceSelectionState } from '@/components/ui/DimSlicer';
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
  onApply?: (sels: SliceSelectionState[]) => void;
};

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

  const [sels, setSels] = useState<SliceSelectionState[]>(() =>
    DIMS.map((d) => defaultSelection(d.size)),
  );

  // Reset selections when DIMS shape changes
  const dimsKey = DIMS.map((d) => `${d.name}:${d.size}`).join('|');
  const [lastKey, setLastKey] = useState(dimsKey);
  if (dimsKey !== lastKey) {
    setLastKey(dimsKey);
    setSels(DIMS.map((d) => defaultSelection(d.size)));
  }

  const update = useCallback((i: number, next: SliceSelectionState) =>
    setSels((prev) => prev.map((s, idx) => (idx === i ? next : s))),
  []);

  return (
    <div className="min-h-0">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Dimension Selector</CardTitle>
          <CardDescription className="mt-1">
            Configure axis &amp; slices from meta.dimInfo
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-1.5">
          {DIMS.map((dim, i) => (
            <DimSlicer
              key={dim.name}
              dimName={dim.name}
              dimSize={dim.size}
              selection={sels[i]}
              onChange={(next) => update(i, next)}
              values={dim.values}
              formatValue={dim.formatValue}
            />
          ))}

          <div className="flex justify-end pt-2">
            <Button onClick={() => onApply?.(sels)}>Apply</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}