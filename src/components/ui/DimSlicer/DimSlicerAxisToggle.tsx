'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';

export type Axis = 'x' | 'y' | 'z' | 'c';

const AXIS_OPTIONS: Axis[] = ['x', 'y', 'z', 'c'];

const AXIS_BUTTON_CLASS: Record<Axis, string> = {
  x: 'text-pink-500',
  y: 'text-green-500',
  z: 'text-blue-500',
  c: 'text-yellow-500',
};

interface DimSlicerAxisToggleProps {
  axis: Axis;
  onAxisChange?: (axis: Axis) => void;
}

export const DimSlicerAxisToggle: React.FC<DimSlicerAxisToggleProps> = ({
  axis,
  onAxisChange,
}) => {
  return (
    <ButtonGroup orientation="horizontal" className="h-6 w-fit">
      {AXIS_OPTIONS.map(a => {
        const isDisabled = a === 'c';
        const buttonClass = AXIS_BUTTON_CLASS[a];

        return (
          <Button
            key={a}
            variant={axis === a ? 'default' : 'outline'}
            size="sm"
            disabled={isDisabled}
            className={`px-2 py-1 h-6 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${axis === a ? buttonClass : ''}`}
            onClick={() => {
              if (!isDisabled) {
                onAxisChange?.(a);
              }
            }}
          >
            {a}
          </Button>
        );
      })}
    </ButtonGroup>
  );
};
