'use client';

import { useState } from 'react';

import {
  Axis,
  canUseSliceMode,
  getAvailableSliceAxes,
  SelectionMode,
  SliceSelectionState,
} from '@/components/ui/DimSlicer';
import { Button } from '@/components/ui/button';

import { DimConfigEntry } from './DimConfigEntry';

export interface DimConfigBarProps {
  variableName: string;
  dims: { name: string }[];
  sels: SliceSelectionState[];
  axes: Axis[];
  onModeChange: (index: number, mode: SelectionMode) => void;
  onAxisChange: (index: number, axis: Axis) => void;
}

const formatConfigToken = (selection: SliceSelectionState) => {
  if (selection.mode === 'scalar') {
    return selection.scalar || '0';
  }

  const start = selection.start || '0';
  const stop = selection.stop || '';

  if (start === '0' && stop === '') {
    return ':';
  }

  return `${start}:${stop}`;
};

const AXIS_COLOR: Record<Axis, string> = {
  x: 'text-pink-500',
  y: 'text-green-600',
  z: 'text-blue-500',
  c: 'text-yellow-600',
};

export function DimConfigBar({
  variableName,
  dims,
  sels,
  axes,
  onModeChange,
  onAxisChange,
}: DimConfigBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div>
              <span className="text-foreground">{variableName}</span>
              <span className="text-muted-foreground">[</span>
              {sels.map((selection, index) => {
                const tokenClass =
                  selection.mode === 'scalar'
                    ? 'text-slate-500'
                    : AXIS_COLOR[axes[index]];

                return (
                  <span key={dims[index].name} className={tokenClass}>
                    {formatConfigToken(selection)}
                    {index < sels.length - 1 ? ', ' : ''}
                  </span>
                );
              })}
              <span className="text-muted-foreground">]</span>
            </div>
            <div className="text-muted-foreground">
              Current slicing expression
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer"
            aria-expanded={expanded}
            onClick={() => setExpanded(prev => !prev)}
          >
            {expanded ? 'Hide config dimensions' : 'Config dimensions'}
          </Button>
        </div>

        {expanded ? (
          <div className="space-y-2">
            {dims.map((dim, i) => (
              <DimConfigEntry
                key={dim.name}
                dimName={dim.name}
                selection={sels[i]}
                axis={axes[i]}
                sliceAllowed={canUseSliceMode(sels, axes, i)}
                availableAxes={getAvailableSliceAxes(sels, axes, i)}
                onModeChange={mode => onModeChange(i, mode)}
                onAxisChange={axis => onAxisChange(i, axis)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
