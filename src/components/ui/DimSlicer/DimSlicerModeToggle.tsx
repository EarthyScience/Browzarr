'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';

export type SelectionMode = 'scalar' | 'slice';

interface DimSlicerModeToggleProps {
  mode: SelectionMode;
  onModeChange: (nextMode: SelectionMode) => void;
}

export const DimSlicerModeToggle: React.FC<DimSlicerModeToggleProps> = ({ mode, onModeChange }) => {
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

  return (
    <div ref={rootRef} className="relative">
      {expanded ? (
        <ButtonGroup orientation="horizontal" className="h-6 w-fit">
          <Button
            variant={mode === 'scalar' ? 'default' : 'outline'}
            size="sm"
            className="px-2 py-1 h-6 cursor-pointer"
            onClick={() => {
              onModeChange('scalar');
              setExpanded(false);
            }}
          >
            index
          </Button>
          <Button
            variant={mode === 'slice' ? 'default' : 'outline'}
            size="sm"
            className="px-2 py-1 h-6 cursor-pointer"
            onClick={() => {
              onModeChange('slice');
              setExpanded(false);
            }}
          >
            slice
          </Button>
        </ButtonGroup>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="px-2 py-1 h-6 cursor-pointer"
          onClick={() => setExpanded(prev => !prev)}
        >
          {mode}
        </Button>
      )}
    </div>
  );
};
