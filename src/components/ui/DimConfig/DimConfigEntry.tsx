'use client';

import {
  Axis,
  SelectionMode,
  SliceSelectionState,
} from '@/components/DimSlicer';
import { Button } from '@/components/ui/button';
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from '@/components/ui/button-group';

import { cn } from '@/lib/utils';

const AXIS_OPTIONS: Axis[] = ['x', 'y', 'z', 'c'];

const AXIS_COLOR: Record<Axis, string> = {
  x: 'text-pink-500',
  y: 'text-green-600',
  z: 'text-blue-500',
  c: 'text-yellow-600',
};

const SELECTED_AXIS_BUTTON_CLASSES: Record<Axis, string> = {
  x: 'text-white bg-pink-500 border-pink-500 hover:bg-pink-600',
  y: 'text-white bg-green-600 border-green-600 hover:bg-green-700',
  z: 'text-white bg-blue-500 border-blue-500 hover:bg-blue-600',
  c: 'text-white bg-yellow-600 border-yellow-600 hover:bg-yellow-700',
};

const formatSelection = (sel: SliceSelectionState) =>
  sel.mode === 'scalar'
    ? `[${sel.scalar}]`
    : `[${sel.start}:${sel.stop}]`;

export interface DimConfigEntryProps {
  dimName: string;
  selection: SliceSelectionState;
  axis: Axis;
  sliceAllowed: boolean;
  availableAxes: Axis[];
  onModeChange: (mode: SelectionMode) => void;
  onAxisChange: (axis: Axis) => void;
}

export function DimConfigEntry({
  dimName,
  selection,
  axis,
  sliceAllowed,
  availableAxes,
  onModeChange,
  onAxisChange,
}: DimConfigEntryProps) {
  const isSlice = selection.mode === 'slice';
  const axisValue = availableAxes.includes(axis)
    ? axis
    : (availableAxes[0] ?? axis);

  return (
    <ButtonGroup className="h-7">
      <ButtonGroupText className="h-7 px-2">
        {dimName}
      </ButtonGroupText>

      <ButtonGroupSeparator />

      {sliceAllowed ? (
        <Button
          size="xs"
          variant={isSlice ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onModeChange('slice')}
          aria-pressed={isSlice}
          aria-label={`Slice mode for ${dimName}`}
        >
          slice
        </Button>
      ) : null}

      <Button
        size="xs"
        variant={!isSlice ? 'default' : 'outline'}
        className="cursor-pointer"
        onClick={() => onModeChange('scalar')}
        aria-pressed={!isSlice}
        aria-label={`Scalar mode for ${dimName}`}
      >
        scalar
      </Button>

      {isSlice ? (
        <>
          <ButtonGroupSeparator />
          {AXIS_OPTIONS.map(a => {
            const isDisabled =
              a === 'c' || !availableAxes.includes(a);
            const isSelected = axisValue === a;

            return (
              <Button
                key={a}
                size="xs"
                variant={isSelected ? 'default' : 'outline'}
                disabled={isDisabled}
                className={cn(
                  'min-w-6 px-1.5 cursor-pointer',
                  isSelected ? SELECTED_AXIS_BUTTON_CLASSES[a] : undefined,
                  isSelected && !isDisabled && 'shadow-sm'
                )}
                onClick={() => onAxisChange(a)}
                aria-pressed={isSelected}
                aria-label={`Axis ${a} for ${dimName}`}
              >
                {a}
              </Button>
            );
          })}
        </>
      ) : null}

      <ButtonGroupSeparator />

      <ButtonGroupText className="px-2 text-muted-foreground">
        {formatSelection(selection)}
      </ButtonGroupText>
    </ButtonGroup>
  );
}
