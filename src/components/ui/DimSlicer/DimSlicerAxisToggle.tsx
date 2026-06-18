'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';

export type Axis = 'x' | 'y' | 'z' | 'c';

interface DimSlicerAxisToggleProps {
  axis: Axis;
  onAxisChange?: (axis: Axis) => void;
}

export const DimSlicerAxisToggle: React.FC<DimSlicerAxisToggleProps> = ({ axis, onAxisChange }) => {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const axisOptions: Axis[] = ['x', 'y', 'z', 'c'];

  const axisClass = axis === 'x'
    ? 'text-pink-500'
    : axis === 'y'
      ? 'text-green-500'
      : axis === 'z'
        ? 'text-blue-500'
        : 'text-yellow-500';

  return (
    <div ref={rootRef} className="relative">
      {expanded ? (
        <ButtonGroup orientation="horizontal" className="h-6 w-fit">
          {axisOptions.map(a => {
            const buttonClass = a === 'x' ? 'text-pink-500' : a === 'y' ? 'text-green-500' : a === 'z' ? 'text-blue-500' : 'text-yellow-500';
            return (
              <Button
                key={a}
                variant={axis === a ? 'default' : 'outline'}
                size="sm"
                className={`text-xs px-2 py-1 h-6 cursor-pointer ${axis === a ? buttonClass : ''}`}
                onClick={() => {
                  onAxisChange?.(a);
                  setExpanded(false);
                }}
              >
                {a}
              </Button>
            );
          })}
        </ButtonGroup>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className={`text-xs px-2 py-1 h-6 cursor-pointer font-bold ${axisClass}`}
          onClick={() => setExpanded(prev => !prev)}
        >
          {axis}
        </Button>
      )}
    </div>
  );
};
