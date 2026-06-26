'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';

export type Axis = 'x' | 'y' | 'z' | 'c';

const AXIS_CLASS: Record<Axis, string> = {
  x: 'text-pink-500',
  y: 'text-green-500',
  z: 'text-blue-500',
  c: 'text-yellow-500',
};

interface DimSlicerAxisToggleProps {
  axis: Axis;
  onAxisChange?: (axis: Axis) => void;
  /** If provided, only these axes are shown. Defaults to all four. */
  allowedAxes?: Axis[];
}

export const DimSlicerAxisToggle: React.FC<DimSlicerAxisToggleProps> = ({
  axis,
  onAxisChange,
  allowedAxes,
}) => {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const axisOptions: Axis[] = allowedAxes ?? ['x', 'y', 'z', 'c'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {expanded ? (
        <ButtonGroup orientation="horizontal" className="h-6 w-fit">
          {axisOptions.map(a => (
            <Button
              key={a}
              variant={axis === a ? 'default' : 'outline'}
              size="sm"
              className={`text-xs px-2 py-1 h-6 cursor-pointer ${axis === a ? AXIS_CLASS[a] : ''}`}
              onClick={() => {
                onAxisChange?.(a);
                setExpanded(false);
              }}
            >
              {a}
            </Button>
          ))}
        </ButtonGroup>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className={`text-xs px-2 py-1 h-6 cursor-pointer font-bold ${AXIS_CLASS[axis]}`}
          onClick={() => setExpanded(prev => !prev)}
        >
          {axis}
        </Button>
      )}
    </div>
  );
};