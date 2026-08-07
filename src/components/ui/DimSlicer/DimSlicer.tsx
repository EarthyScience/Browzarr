'use client';
import React, { useCallback, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  label?: string;
  size: number;
  values?: number[];
  formatValue?: (value: number) => string;
}

export interface DimSlicerProps {
  availableDims: DimOption[];
  dimName: string;
  onDimChange: (dimName: string, newName: string) => void;
  onRemove?: () => void;
  dimSize: number;
  selection: SliceSelectionState;
  onChange: (dimName: string, next: SliceSelectionState) => void;
  step?: number;
  axis?: Axis;
  values?: number[];
  formatValue?: (value: number) => string;
  /** If set, locks the mode and hides the mode toggle */
  lockMode?: SelectionMode;
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const parseOr = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
};

const DimSlicerComponent: React.FC<DimSlicerProps> = ({
  availableDims,
  dimName,
  onDimChange,
  onRemove,
  dimSize,
  selection,
  onChange,
  step = 1,
  axis: propAxis = 'x',
  values,
  formatValue,
  lockMode,
}) => {
  const effectiveDimSize = values ? values.length : dimSize;
  const rawSel = selection ?? defaultSelection(effectiveDimSize);
  const sel = lockMode ? { ...rawSel, mode: lockMode } : rawSel;

  const getIndexFromValue = (val: number): number => {
    if (!values || values.length === 0) {
      return clamp(Math.round(val / step) * step, 0, maxIndex);
    }
    let closestIndex = 0;
    let minDiff = Math.abs(Number(values[0]) - val);
    for (let i = 1; i < values.length; i++) {
      const diff = Math.abs(Number(values[i]) - val);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  

  const maxIndex = Math.max(effectiveDimSize - 1, 0);

  const changeScalarBy = useCallback((delta: number) => {
    let val = parseOr(sel.scalar, 0) + delta;
    val = clamp(val, 0, maxIndex);
    onChange(dimName,{ ...sel, scalar: String(val) });
  },[onChange, clamp, parseOr])

  const changeStartBy = useCallback((delta: number) => {
    let val = parseOr(sel.start, 0) + delta;
    val = clamp(val, 0, maxIndex);
    onChange(dimName,{ ...sel, start: String(val) });
  },[onChange, clamp, parseOr])

  const changeStopBy = useCallback((delta: number) => {
    let val = parseOr(sel.stop, maxIndex) + delta;
    val = clamp(val, 0, maxIndex);
    onChange(dimName,{ ...sel, stop: String(val) });
  },[onChange, clamp, parseOr])

  const updateSelection = useCallback((patch: Partial<SliceSelectionState>) => {
    const next = { ...sel, ...patch };
    if (lockMode) next.mode = lockMode;
    onChange(dimName,next);
  },[onChange])

  const startIndex = clamp(parseOr(sel.start, 0), 0, maxIndex);
  const stopIndex = clamp(parseOr(sel.stop, maxIndex), 0, maxIndex);
  const scalarIndex = clamp(parseOr(sel.scalar, 0), 0, maxIndex);

  const startValue = values && effectiveDimSize > 0 && startIndex < values.length ? String(values[startIndex]) : sel.start;
  const stopValue = values && effectiveDimSize > 0 && stopIndex < values.length ? String(values[stopIndex]) : sel.stop;
  const scalarValue = values && effectiveDimSize > 0 && scalarIndex < values.length ? String(values[scalarIndex]) : sel.scalar;

  const formattedValue = useCallback(
    (index: number) =>
      values && effectiveDimSize > 0 && index < values.length
        ? String(formatValue ? formatValue(values[index]) : values[index].toString())
        : String(index),
    [values, effectiveDimSize, formatValue]
  );

  const isTimeDimension =
    /time|date|hour|hr|step|lead|period/i.test(dimName) ||
    Boolean(values && values.length > 0 && formatValue && /\b(h|hr|hrs|hours|min|sec|s|d|days|ms|since)\b/i.test(formatValue(values[0]) || ''));
  const isDateDimension = isTimeDimension || dimName.toLowerCase().includes('date');
  const showTimeControls = Boolean(values && isTimeDimension);

  const updateScalar = useCallback((newScalar: string | number) => {
    if (typeof newScalar === 'string') {
      const parsed = parseFloat(newScalar);
      if (!Number.isNaN(parsed)) updateSelection({ scalar: String(getIndexFromValue(parsed)) });
    } else  updateSelection({ scalar: String(newScalar) })
  },[updateSelection])

  const updateStart = useCallback((newStart: string | number) => {
    if (typeof newStart === 'string') {
      const parsed = parseFloat(newStart);
      if (!Number.isNaN(parsed)) updateSelection({ start: String(getIndexFromValue(parsed))})
    } else updateSelection({ start: String(newStart)})
  },[updateSelection])

  const updateStop = useCallback((newStop: string | number) => {
    if (typeof newStop === 'string') {
      const parsed = parseFloat(newStop);
      if (!Number.isNaN(parsed)) updateSelection({ stop: String(getIndexFromValue(parsed))})
    } else updateSelection({ stop: String(newStop)})
  },[updateSelection])

  return (
    <div className={`relative border border-l-2 rounded-md px-2 py-1.5 space-y-2 bg-muted/20 transition-colors ${MODE_ACCENT[sel.mode]}`}>

      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 rounded p-0.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          aria-label="Remove dimension"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Top row: dim select + mode toggle + axis toggle */}
      <div className="flex items-center justify-between gap-2 pr-5">
        <Select value={dimName} onValueChange={(name) => onDimChange(dimName, name)}>
          <SelectTrigger className="h-6 w-auto min-w-0 text-xs px-2 py-0 border-0 cursor-pointer">
            <SelectValue placeholder="dim…" />
          </SelectTrigger>
          <SelectContent>
            {availableDims.map((d) => (
              <SelectItem key={d.name} value={d.name} className="text-xs">
                {d.label ?? d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          {!lockMode && (
            <DimSlicerModeToggle
              mode={sel.mode}
              onModeChange={mode => updateSelection({ mode })}
            />
          )}
          {sel.mode === 'slice' && (
            <span className={`text-xs font-bold px-2 py-1 h-6 flex items-center border rounded-md ${propAxis === 'x' ? 'text-pink-500' :
              propAxis === 'y' ? 'text-green-500' :
                propAxis === 'z' ? 'text-blue-500' :
                  'text-yellow-500'
              }`}>
              {propAxis}
            </span>
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

      {/* Bottom controls */}
      {isDateDimension ? (
        sel.mode === 'scalar' ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DimSlicerTimeControl
              layout="row"
              showInput={false}
              currentIndex={scalarIndex}
              onIndexChange={updateScalar}
              value={scalarValue}
              placeholder={formattedValue(0)}
              ariaLabel="Scalar value"
              values={values ?? []}
              effectiveDimSize={effectiveDimSize}
              formattedValue={formattedValue}
              onValueChange={updateScalar}
              onIncrement={changeScalarBy}
              onDecrement={changeScalarBy}
            />
          </div>
        ) : (
          <div className="flex justify-between">
            <DimSlicerTimeControl
              layout="row"
              showInput={false}
              currentIndex={startIndex}
              onIndexChange={updateStart}
              value={startValue}
              placeholder={formattedValue(0)}
              ariaLabel="Start value"
              values={values ?? []}
              effectiveDimSize={effectiveDimSize}
              formattedValue={formattedValue}
              onValueChange={updateStart}
              onIncrement={changeStartBy}
              onDecrement={changeStartBy}
            />
            <DimSlicerTimeControl
              layout="row"
              showInput={false}
              currentIndex={stopIndex}
              onIndexChange={updateStop}
              value={stopValue}
              placeholder={formattedValue(Math.max(effectiveDimSize - 1, 0))}
              ariaLabel="Stop value"
              values={values ?? []}
              effectiveDimSize={effectiveDimSize}
              formattedValue={formattedValue}
              onValueChange={updateStop}
              onIncrement={changeStopBy}
              onDecrement={changeStopBy}
              includeEnd
            />

          </div>
        )
      ) : (
        <div className="flex items-center justify-between gap-2">
          {sel.mode === 'slice' ? (
            showTimeControls ? (
              <DimSlicerTimeControl
                currentIndex={startIndex}
                onIndexChange={updateStart}
                value={startValue}
                placeholder={formattedValue(0)}
                ariaLabel="Start value"
                values={values ?? []}
                effectiveDimSize={effectiveDimSize}
                formattedValue={formattedValue}
                onValueChange={updateStart}
                onIncrement={changeStartBy}
                onDecrement={changeStartBy}
              />
            ) : (
              <DimSlicerNumericControl
                value={startValue}
                placeholder={formattedValue(0)}
                onValueChange={updateStart}
                onIncrement={changeStartBy}
                onDecrement={changeStartBy}
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
                onIndexChange={updateStop}
                value={stopValue}
                placeholder={formattedValue(Math.max(effectiveDimSize - 1, 0))}
                ariaLabel="Stop value"
                values={values ?? []}
                effectiveDimSize={effectiveDimSize}
                formattedValue={formattedValue}
                onValueChange={updateStop}
                onIncrement={changeStopBy}
                onDecrement={changeStopBy}
                includeEnd
              />
            ) : (
              <DimSlicerNumericControl
                value={stopValue}
                placeholder={formattedValue(Math.max(effectiveDimSize - 1, 0))}
                onValueChange={updateStop}
                onIncrement={changeStopBy}
                onDecrement={changeStopBy}
                ariaLabel="Stop value"
                showInput={!isDateDimension}
              />
            )
          ) : showTimeControls ? (
            <DimSlicerTimeControl
              currentIndex={scalarIndex}
              onIndexChange={updateScalar}
              value={scalarValue}
              placeholder={formattedValue(0)}
              ariaLabel="Scalar value"
              values={values ?? []}
              effectiveDimSize={effectiveDimSize}
              formattedValue={formattedValue}
              onValueChange={updateScalar}
              onIncrement={changeScalarBy}
              onDecrement={changeScalarBy}
            />
          ) : (
            <DimSlicerNumericControl
              value={scalarValue}
              placeholder={formattedValue(0)}
              onValueChange={updateScalar}
              onIncrement={changeScalarBy}
              onDecrement={changeScalarBy}
              ariaLabel="Scalar value"
              showInput={!isDateDimension}
            />
          )}
        </div>
      )}
    </div>
  );
};

export const DimSlicer = React.memo(DimSlicerComponent);
export default DimSlicer;