'use client';
import React from 'react';
import { Slider } from '@/components/ui/slider';

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

export const SLICE_AXES: Axis[] = ['x', 'y', 'z'];

export function getUsedSliceAxes(
  sels: SliceSelectionState[],
  axes: Axis[],
  excludeIndex?: number
): Set<Axis> {
  const used = new Set<Axis>();
  sels.forEach((sel, i) => {
    if (i === excludeIndex || sel.mode !== 'slice') return;
    if (SLICE_AXES.includes(axes[i])) {
      used.add(axes[i]);
    }
  });
  return used;
}

export function getAvailableSliceAxes(
  sels: SliceSelectionState[],
  axes: Axis[],
  dimIndex: number
): Axis[] {
  const used = getUsedSliceAxes(sels, axes, dimIndex);
  return SLICE_AXES.filter(a => !used.has(a));
}

export function canUseSliceMode(
  sels: SliceSelectionState[],
  axes: Axis[],
  dimIndex: number
): boolean {
  return getAvailableSliceAxes(sels, axes, dimIndex).length > 0;
}

export function defaultSelection(dimSize?: number): SliceSelectionState {
  const maxIndex = dimSize ? Math.max(dimSize - 1, 0) : 0;
  return { mode: 'slice', scalar: '0', start: '0', stop: String(maxIndex) };
}

export function defaultAxisForIndex(index: number): Axis {
  return SLICE_AXES[index] ?? 'x';
}

export function defaultSelectionForIndex(
  index: number,
  dimSize?: number
): SliceSelectionState {
  const base = defaultSelection(dimSize);
  if (index < SLICE_AXES.length) {
    return { ...base, mode: 'slice' };
  }
  return { ...base, mode: 'scalar' };
}

const MODE_ACCENT: Record<SelectionMode, string> = {
  scalar: 'border-l-black-700',
  slice: 'border-l-pink-400',
};

const AXIS_ACCENT: Record<Axis, string> = {
  x: 'border-l-pink-500',
  y: 'border-l-green-600',
  z: 'border-l-blue-500',
  c: 'border-l-yellow-600',
};

function dimBadge(selection: SliceSelectionState, dimSize: number, step: number): string {
  if (selection.mode === 'scalar') return selection.scalar || '0';
  const start = selection.start !== '' ? selection.start : '0';
  const stop = selection.stop !== '' ? selection.stop : String(dimSize);
  const stepStr = step !== 1 ? `:${step}` : '';
  return `${start}–${stop}${stepStr}`;
}


export interface DimSlicerProps {
  /** Dimension name, e.g. "time" or "dim_0" */
  dimName: string;
  /** Size of this dimension */
  dimSize: number;
  /** Current selection state */
  selection: SliceSelectionState;
  /** Assigned axis for this dimension */
  axis: Axis;
  /** Called whenever the selection changes */
  onChange: (next: SliceSelectionState) => void;
  /** Step size for the slider (optional, defaults to 1) */
  step?: number;
  /** Array of actual values for this dimension (optional, if provided, dimSize should match values.length) */
  values?: number[];
  /** Function to format values for display (optional) */
  formatValue?: (value: number) => string;
}

const DimSlicer: React.FC<DimSlicerProps> = ({
  dimName,
  dimSize,
  selection,
  axis,
  onChange,
  step = 1,
  values,
  formatValue,
}) => {
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

  const changeScalarBy = (delta: number) => {
    let val = parseOr(sel.scalar, 0) + delta;
    val = clamp(val, 0, Math.max(effectiveDimSize - 1, 0));
    onChange({ ...sel, scalar: String(val) });
  };

  const maxIndex = Math.max(effectiveDimSize - 1, 0);

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
  const showIndexLabel = !isDateDimension;

  const indexLabel = dimBadge(sel, effectiveDimSize, step);

  return (
    <div
      className={`border rounded-md px-2 py-1.5 space-y-2 transition-colors ${
        sel.mode === 'scalar' ? MODE_ACCENT.scalar : AXIS_ACCENT[axis]
      }`}
    >
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
            className="w-full cursor-pointer"
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
            className="w-full [&_[data-slot=slider-range]]:bg-transparent cursor-pointer"
          />
        </div>
      )}

      {isDateDimension ? (
        sel.mode === 'scalar' ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>
                {dimName}
                {showIndexLabel ? (
                  <span className="ml-1 text-muted-foreground/70">[{indexLabel}]</span>
                ) : null}
                <span className="text-muted-foreground/50"> [{effectiveDimSize}]</span>
              </span>
            </div>

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
                if (!Number.isNaN(parsed)) {
                  updateSelection({ scalar: String(getIndexFromValue(parsed)) });
                }
              }}
              onIncrement={() => changeScalarBy(+1)}
              onDecrement={() => changeScalarBy(-1)}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
              <span>
                {dimName}
                {showIndexLabel ? (
                  <span className="ml-1 text-muted-foreground/70">[{indexLabel}]</span>
                ) : null}
                <span className="text-muted-foreground/50"> [{effectiveDimSize}]</span>
              </span>
            </div>

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
                  if (!Number.isNaN(parsed)) {
                    updateSelection({ start: String(getIndexFromValue(parsed)) });
                  }
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
                    if (!Number.isNaN(parsed)) {
                      updateSelection({ stop: String(getIndexFromValue(parsed)) });
                    }
                  }}
                  onIncrement={() => changeStopBy(+1)}
                  onDecrement={() => changeStopBy(-1)}
                  includeEnd
                />
              </div>
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
                  if (!Number.isNaN(parsed)) {
                    updateSelection({ start: String(getIndexFromValue(parsed)) });
                  }
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
                  if (!Number.isNaN(parsed)) {
                    updateSelection({ start: String(getIndexFromValue(parsed)) });
                  }
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

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground shrink-0">
              {dimName}
              {showIndexLabel ? (
                <span className="ml-1 text-muted-foreground/70">[{indexLabel}]</span>
              ) : null}
              <span className="text-muted-foreground/50"> [{effectiveDimSize}]</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
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
                    if (!Number.isNaN(parsed)) {
                      updateSelection({ stop: String(getIndexFromValue(parsed)) });
                    }
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
                    if (!Number.isNaN(parsed)) {
                      updateSelection({ stop: String(getIndexFromValue(parsed)) });
                    }
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
                  if (!Number.isNaN(parsed)) {
                    updateSelection({ scalar: String(getIndexFromValue(parsed)) });
                  }
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
                  if (!Number.isNaN(parsed)) {
                    updateSelection({ scalar: String(getIndexFromValue(parsed)) });
                  }
                }}
                onIncrement={() => changeScalarBy(+1)}
                onDecrement={() => changeScalarBy(-1)}
                ariaLabel="Scalar value"
                showInput={!isDateDimension}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { DimSlicer };
export default DimSlicer;
