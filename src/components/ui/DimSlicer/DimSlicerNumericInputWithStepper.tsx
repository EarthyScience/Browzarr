'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button-enhanced';
import { ButtonGroup } from '@/components/ui/button-group';
import { MinusIcon, PlusIcon } from 'lucide-react';

interface DimSlicerNumericInputWithStepperProps {
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  onIncrement: () => void;
  onDecrement: () => void;
  ariaLabel: string;
  showInput?: boolean;
}

export const DimSlicerNumericInputWithStepper: React.FC<DimSlicerNumericInputWithStepperProps> = ({
  value,
  placeholder,
  onValueChange,
  onIncrement,
  onDecrement,
  ariaLabel,
  showInput = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [localValue, setLocalValue] = useState(value);
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

  // Sync prop changes to local state
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const commitValue = () => {
    onValueChange(localValue);
    setLocalValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue();
    }
  };

  return (
    <div ref={rootRef}>
      <ButtonGroup orientation="horizontal" className="h-7 w-fit">
        {showInput && (
          <Input
            type="number"
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={commitValue}
            onKeyDown={handleKeyDown}
            onClick={() => setExpanded(false)}
            className="no-spinner h-7 text-xs w-16 text-center appearance-none"
            placeholder={placeholder}
            aria-label={ariaLabel}
          />
        )}
        {expanded ? (
          <ButtonGroup orientation="horizontal" aria-label={ariaLabel} className="h-fit">
            <Button variant="outline" size="icon-sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onDecrement}>
              <MinusIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="h-7 w-7 p-0 cursor-pointer" onClick={onIncrement}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </ButtonGroup>
        ) : (
          <Button
            variant="outline"
            size="icon-sm"
            className="h-7 w-7 p-0 cursor-pointer shrink-0"
            onClick={() => setExpanded(true)}
            aria-label={ariaLabel}
          >
            ±
          </Button>
        )}
      </ButtonGroup>
    </div>
  );
};
