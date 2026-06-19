'use client';
import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { DimSlicerAxisToggle } from './DimSlicerAxisToggle';
import { DimSlicerModeToggle } from './DimSlicerModeToggle';
import { DimSlicerNumericControl } from './DimSlicerNumericControl';
import { DimSlicerTimeControl } from './DimSlicerTimeControl';

export type SelectionMode = 'scalar' | 'slice';
export type Axis = 'x' | 'y' | 'z' | 'c';

export interface SliceSelectionState {
  mode: SelectionMode;
  scalar: string;
  start: string;
  stop: string;
}

export function defaultSelection(dimSize?: number): SliceSelectionState {
  const maxIndex = dimSize ? Math.max(dimSize - 1, 0) : 0;
  return { mode: 'slice', scalar: '0', start: '0', stop: String(maxIndex) };
}

const MODE_ACCENT: Record<SelectionMode, string> = {
  scalar: 'border-l-teal-700',
  slice: 'border-l-[#644FF0]',
};

export interface DimOption {
  name: string;
  size: number;
  values?: number[];
  formatValue?: (value: number) => string;
}

export interface DimSlicerProps {
  availableDims: DimOption[];
  dimName: string;
  onDimChange: (dimName: string) => void;
  /** Called when the trash icon is clicked. If omitted, the icon is hidden. */
  onRemove?: () => void;
  dimSize: number;
  selection: SliceSelectionState;
  onChange: (next: SliceSelectionState) => void;
  step?: number;
  axis?: Axis;
  onAxisChange?: (axis: Axis) => void;
  values?: number[];
  formatValue?: (value: number) => string;
}

const DimSlicer: React.FC<DimSlicerProps> = ({
  availableDims,
  dimName,
  onDimChange,
  onRemove,
  dimSize,
  selection,
  onChange,
  step = 1,
  axis: propAxis = 'x',
  onAxisChange,
  values,
  formatValue,
}) => {
  const [currentAxis, setCurrentAxis] = useState<Axis>(propAxis);
  const effectiveDimSize = values ? values.length : dimSize;
  const sel = selection ?? defaultSelection(effectiveDimSize);

  const getIndexFromValue = (val: number): number => {
    if (!values) return val;
    let closestIndex = 0;
    let minDiff = Math.abs(values[0] - val);
    for (let i = 1; i < values.length; i++) {
      const diff = Math.abs(values[i] - val);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

  const parseOr = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
  };

  const maxIndex = Math.max(effectiveDimSize - 1, 0);

  const changeScalarBy = (delta: number) => {
    let val = parseOr(sel.scalar, 0) + delta;
    val = clamp(val, 0, maxIndex);
    onChange({ ...sel, scalar: String(val) });
  };

  const changeStartBy = (delta: number) => {
    let val = parseOr(sel.start, 0) + delta;
    val = clamp(val, 0, maxIndex);
    onChange({ ...sel, start: String(val) });
  };

  const changeStopBy = (delta: number) => {
    let val = parseOr(sel.stop, maxIndex) + delta;
    val = clamp(val, 0, maxIndex);
    onChange({ ...sel, stop: String(val) });
  };

  const updateSelection = (patch: Partial<SliceSelectionState>) => {
    onChange({ ...sel, ...patch });
  };

  const startIndex = clamp(parseOr(sel.start, 0), 0, maxIndex);
  const stopIndex = clamp(parseOr(sel.stop, maxIndex), 0, maxIndex);
  const scalarIndex = clamp(parseOr(sel.scalar, 0), 0, maxIndex);

  const startValue = values && effectiveDimSize > 0 && startIndex < values.length ? String(values[startIndex]) : sel.start;
  const stopValue = values && effectiveDimSize > 0 && stopIndex < values.length ? String(values[stopIndex]) : sel.stop;
  const scalarValue = values && effectiveDimSize > 0 && scalarIndex < values.length ? String(values[scalarIndex]) : sel.scalar;

  const formattedValue = (index: number) =>
    values && effectiveDimSize > 0 && index < values.length
      ? String(formatValue ? formatValue(values[index]) : values[index].toString())
      : String(index);

  const isTimeDimension = dimName.toLowerCase().includes('time');
  const isDateDimension = isTimeDimension || dimName.toLowerCase().includes('date');
  const showTimeControls = Boolean(values && isTimeDimension);

  return (
    <div className={`relative border border-l-2 rounded-md px-2 py-1.5 space-y-2 bg-muted/20 transition-colors ${MODE_ACCENT[sel.mode]}`}>

      {onRemove && (
        <button
          onClick={onRemove}
          className="cursor-pointer absolute top-0.5 right-0.5 rounded p-0.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Remove dimension"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Top row: dim select + mode toggle + axis toggle */}
      <div className="flex items-center justify-between gap-2 pr-5">
        <Select value={dimName} onValueChange={onDimChange}>
          <SelectTrigger className="h-6 w-auto min-w-0 text-xs px-2 py-0 border-0 cursor-pointer">
            <SelectValue placeholder="dim…" />
          </SelectTrigger>
          <SelectContent>
            {availableDims.map((d) => (
              <SelectItem key={d.name} value={d.name} className="text-xs">
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <DimSlicerModeToggle mode={sel.mode} onModeChange={mode => updateSelection({ mode })} />
          {sel.mode === 'slice' && (
            <DimSlicerAxisToggle
              axis={currentAxis}
              onAxisChange={axis => {
                setCurrentAxis(axis);
                onAxisChange?.(axis);
              }}
            />
          )}
        </div>
      </div>

      {/* Slider */}
      {sel.mode === 'slice' && (
        <div className="space-y-2 pb-0.5">
          <Slider
            min={0}
            max={maxIndex}
            step={step}
            value={[startIndex, stopIndex]}
            onValueChange={([newStart, newStop]) =>
              updateSelection({ start: String(newStart), stop: String(newStop) })
            }
            className="w-full cursor-pointer [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3"
          />
        </div>
      )}

      {sel.mode === 'scalar' && (
        <div className="space-y-2 pb-0.5">
          <Slider
            min={0}
            max={Math.max(effectiveDimSize - 1, 0)}
            step={step}
            value={[scalarIndex]}
            onValueChange={([val]) => updateSelection({ scalar: String(val) })}
            className="w-full cursor-pointer [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3"
          />
        </div>
      )}

      {isDateDimension ? (
        sel.mode === 'scalar' ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DimSlicerTimeControl
              layout="row"
              showInput={false}
              currentIndex={scalarIndex}
              onIndexChange={(newScalar: number) => updateSelection({ scalar: String(newScalar) })}
              value={scalarValue}
              placeholder={formattedValue(0)}
              ariaLabel="Scalar value"
              values={values ?? []}
              effectiveDimSize={effectiveDimSize}
              formattedValue={formattedValue}
              onValueChange={value => {
                const parsed = parseFloat(value);
                if (!Number.isNaN(parsed)) updateSelection({ scalar: String(getIndexFromValue(parsed)) });
              }}
              onIncrement={() => changeScalarBy(+1)}
              onDecrement={() => changeScalarBy(-1)}
            />
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            <DimSlicerTimeControl
              layout="row"
              showInput={false}
              currentIndex={startIndex}
              onIndexChange={(newStart: number) => updateSelection({ start: String(newStart) })}
              value={startValue}
              placeholder={formattedValue(0)}
              ariaLabel="Start value"
              values={values ?? []}
              effectiveDimSize={effectiveDimSize}
              formattedValue={formattedValue}
              onValueChange={value => {
                const parsed = parseFloat(value);
                if (!Number.isNaN(parsed)) updateSelection({ start: String(getIndexFromValue(parsed)) });
              }}
              onIncrement={() => changeStartBy(+1)}
              onDecrement={() => changeStartBy(-1)}
            />
            <div className="flex justify-end">
              <DimSlicerTimeControl
                layout="row"
                showInput={false}
                currentIndex={stopIndex}
                onIndexChange={(newStop: number) => updateSelection({ stop: String(newStop) })}
                value={stopValue}
                placeholder={formattedValue(Math.max(effectiveDimSize - 1, 0))}
                ariaLabel="Stop value"
                values={values ?? []}
                effectiveDimSize={effectiveDimSize}
                formattedValue={formattedValue}
                onValueChange={value => {
                  const parsed = parseFloat(value);
                  if (!Number.isNaN(parsed)) updateSelection({ stop: String(getIndexFromValue(parsed)) });
                }}
                onIncrement={() => changeStopBy(+1)}
                onDecrement={() => changeStopBy(-1)}
                includeEnd
              />
            </div>
          </div>
        )
      ) : (
        <div className="flex items-center justify-between gap-2">
          {sel.mode === 'slice' ? (
            showTimeControls ? (
              <DimSlicerTimeControl
                currentIndex={startIndex}
                onIndexChange={(newStart: number) => updateSelection({ start: String(newStart) })}
                value={startValue}
                placeholder={formattedValue(0)}
                ariaLabel="Start value"
                values={values ?? []}
                effectiveDimSize={effectiveDimSize}
                formattedValue={formattedValue}
                onValueChange={value => {
                  const parsed = parseFloat(value);
                  if (!Number.isNaN(parsed)) updateSelection({ start: String(getIndexFromValue(parsed)) });
                }}
                onIncrement={() => changeStartBy(+1)}
                onDecrement={() => changeStartBy(-1)}
              />
            ) : (
              <DimSlicerNumericControl
                value={startValue}
                placeholder={formattedValue(0)}
                onValueChange={value => {
                  const parsed = parseFloat(value);
                  if (!Number.isNaN(parsed)) updateSelection({ start: String(getIndexFromValue(parsed)) });
                }}
                onIncrement={() => changeStartBy(+1)}
                onDecrement={() => changeStartBy(-1)}
                ariaLabel="Start value"
                showInput={!isDateDimension}
              />
            )
          ) : (
            <div className="w-16" />
          )}

          {sel.mode === 'slice' ? (
            showTimeControls ? (
              <DimSlicerTimeControl
                layout="row"
                showInput={false}
                currentIndex={stopIndex}
                onIndexChange={(newStop: number) => updateSelection({ stop: String(newStop) })}
                value={stopValue}
                placeholder={formattedValue(Math.max(effectiveDimSize - 1, 0))}
                ariaLabel="Stop value"
                values={values ?? []}
                effectiveDimSize={effectiveDimSize}
                formattedValue={formattedValue}
                onValueChange={value => {
                  const parsed = parseFloat(value);
                  if (!Number.isNaN(parsed)) updateSelection({ stop: String(getIndexFromValue(parsed)) });
                }}
                onIncrement={() => changeStopBy(+1)}
                onDecrement={() => changeStopBy(-1)}
                includeEnd
              />
            ) : (
              <DimSlicerNumericControl
                value={stopValue}
                placeholder={formattedValue(Math.max(effectiveDimSize - 1, 0))}
                onValueChange={value => {
                  const parsed = parseFloat(value);
                  if (!Number.isNaN(parsed)) updateSelection({ stop: String(getIndexFromValue(parsed)) });
                }}
                onIncrement={() => changeStopBy(+1)}
                onDecrement={() => changeStopBy(-1)}
                ariaLabel="Stop value"
                showInput={!isDateDimension}
              />
            )
          ) : showTimeControls ? (
            <DimSlicerTimeControl
              currentIndex={scalarIndex}
              onIndexChange={(newScalar: number) => updateSelection({ scalar: String(newScalar) })}
              value={scalarValue}
              placeholder={formattedValue(0)}
              ariaLabel="Scalar value"
              values={values ?? []}
              effectiveDimSize={effectiveDimSize}
              formattedValue={formattedValue}
              onValueChange={value => {
                const parsed = parseFloat(value);
                if (!Number.isNaN(parsed)) updateSelection({ scalar: String(getIndexFromValue(parsed)) });
              }}
              onIncrement={() => changeScalarBy(+1)}
              onDecrement={() => changeScalarBy(-1)}
            />
          ) : (
            <DimSlicerNumericControl
              value={scalarValue}
              placeholder={formattedValue(0)}
              onValueChange={value => {
                const parsed = parseFloat(value);
                if (!Number.isNaN(parsed)) updateSelection({ scalar: String(getIndexFromValue(parsed)) });
              }}
              onIncrement={() => changeScalarBy(+1)}
              onDecrement={() => changeScalarBy(-1)}
              ariaLabel="Scalar value"
              showInput={!isDateDimension}
            />
          )}
        </div>
      )}
    </div>
  );
};

export { DimSlicer };
export default DimSlicer;