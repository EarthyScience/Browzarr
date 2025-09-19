import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { FaPlay, FaPause, FaForwardStep, FaBackwardStep } from "react-icons/fa6";
import { PiSliders } from "react-icons/pi";
import { parseLoc } from '@/utils/HelperFuncs';

interface SliceControlsProps {
  onSliceUpdate: (slice: [number, number | null]) => Promise<boolean>;
  isUpdating: boolean;
}

const frameRates = [1, 2, 4, 6, 8, 12, 16, 24, 36, 48, 54, 60, 80, 120];

const SliceInterface: React.FC<{ 
  visible: boolean; 
  onSliceUpdate: (slice: [number, number | null]) => Promise<boolean>;
  isUpdating: boolean;
}> = ({ visible, onSliceUpdate, isUpdating }) => {
  
  const { dimArrays, dimNames, dimUnits } = useGlobalStore(
    useShallow(state => ({
      dimArrays: state.dimArrays,
      dimNames: state.dimNames,
      dimUnits: state.dimUnits,
    }))
  );

  const { slice } = useZarrStore(
    useShallow(state => ({
      slice: state.slice
    }))
  );

  // Local state for slice window animation
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0); // Position within the loaded slice
  const [fps, setFPS] = useState<number>(5);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousVal = useRef<number>(0);
  const previousFPS = useRef<number>(5);

  // Calculate slice window size and bounds
  const sliceStart = slice[0] || 0;
  const sliceEnd = slice[1] || sliceStart + 10;
  const sliceLength = sliceEnd - sliceStart + 1;
  const totalLength = dimArrays[0]?.length || 100;

  // Animation effect
  useEffect(() => {
    if (isAnimating && !isUpdating) {
      if (previousFPS.current !== fps && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      previousFPS.current = fps;
      const dt = 1000 / frameRates[fps];
      previousVal.current = currentPosition;
      
      intervalRef.current = setInterval(async () => {
        previousVal.current = (previousVal.current + 1) % sliceLength;
        setCurrentPosition(previousVal.current);
        
        // Update the actual slice to show the new position
        const newSliceStart = sliceStart + previousVal.current;
        const newSliceEnd = Math.min(newSliceStart, sliceEnd);
        await onSliceUpdate([newSliceStart, newSliceEnd]);
      }, dt);
      
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAnimating, fps, sliceLength, isUpdating, sliceStart, sliceEnd, onSliceUpdate]);

  // Reset animation when slice changes
  useEffect(() => {
    setIsAnimating(false);
    setCurrentPosition(0);
  }, [slice]);

  // Format labels
  const getCurrentLabel = () => {
    const actualIndex = sliceStart + currentPosition;
    return parseLoc(dimArrays[0]?.[actualIndex] || actualIndex, dimUnits[0], true);
  };

  const getSliceStartLabel = () => {
    return parseLoc(dimArrays[0]?.[sliceStart] || sliceStart, dimUnits[0], true);
  };

  const getSliceEndLabel = () => {
    return parseLoc(dimArrays[0]?.[sliceEnd] || sliceEnd, dimUnits[0], true);
  };

  // Handle manual position change
  const handlePositionChange = useCallback(async (newPosition: number) => {
    setCurrentPosition(newPosition);
    // Update the actual slice when position changes manually
    const newSliceStart = sliceStart + newPosition;
    const newSliceEnd = Math.min(newSliceStart, sliceEnd);
    await onSliceUpdate([newSliceStart, newSliceEnd]);
  }, [sliceStart, sliceEnd, onSliceUpdate]);

  // Step controls
  const stepBackward = useCallback(async () => {
    const newPos = currentPosition > 0 ? currentPosition - 1 : sliceLength - 1;
    setCurrentPosition(newPos);
    // Update the actual slice
    const newSliceStart = sliceStart + newPos;
    const newSliceEnd = Math.min(newSliceStart, sliceEnd);
    await onSliceUpdate([newSliceStart, newSliceEnd]);
  }, [currentPosition, sliceLength, sliceStart, sliceEnd, onSliceUpdate]);

  const stepForward = useCallback(async () => {
    const newPos = (currentPosition + 1) % sliceLength;
    setCurrentPosition(newPos);
    // Update the actual slice
    const newSliceStart = sliceStart + newPos;
    const newSliceEnd = Math.min(newSliceStart, sliceEnd);
    await onSliceUpdate([newSliceStart, newSliceEnd]);
  }, [currentPosition, sliceLength, sliceStart, sliceEnd, onSliceUpdate]);

  // Update slice window position
  const updateSliceWindow = useCallback(async (direction: 'forward' | 'backward' = 'forward') => {
    if (isUpdating) return;
    
    let newStart: number;
    let newEnd: number;
    
    if (direction === 'forward') {
      // Move window forward by half its size
      const moveAmount = Math.max(1, Math.floor(sliceLength / 2));
      newStart = Math.min(sliceStart + moveAmount, totalLength - sliceLength);
      newEnd = Math.min(newStart + sliceLength - 1, totalLength - 1);
    } else {
      // Move window backward by half its size
      const moveAmount = Math.max(1, Math.floor(sliceLength / 2));
      newStart = Math.max(0, sliceStart - moveAmount);
      newEnd = newStart + sliceLength - 1;
    }
    
    await onSliceUpdate([newStart, newEnd]);
    setCurrentPosition(0); // Reset to start of new window
  }, [sliceStart, sliceLength, totalLength, onSliceUpdate, isUpdating]);

  return (
    <Card className='absolute top-24 right-4 z-50 w-80 bg-background/80 backdrop-blur-sm' 
          style={{ display: visible ? '' : 'none' }}>
      <CardContent className='flex flex-col gap-2 w-full h-full px-3 py-3'>
        
        {/* Current Position Display */}
        <div className='text-xs sm:text-sm text-center font-medium'>
          {getCurrentLabel()}
        </div>

        {/* Slice Window Info */}
        <div className='text-xs text-center text-muted-foreground'>
          Window: {getSliceStartLabel()} - {getSliceEndLabel()} ({sliceLength} steps)
        </div>
        
        {/* Position Slider */}
        <div className='flex items-center gap-2 w-full'>
          <span className='text-xs'>{getSliceStartLabel()}</span>
          <Slider
            value={[currentPosition]}
            min={0}
            max={sliceLength - 1}
            step={1}
            className='flex-1'
            onValueChange={(vals: number[]) => {
              const v = Array.isArray(vals) ? vals[0] : 0;
              handlePositionChange(v);
            }}
            disabled={isUpdating}
          />
          <span className='text-xs'>{getSliceEndLabel()}</span>
        </div>
        
        {/* Control Buttons */}
        <div className='grid grid-cols-3 items-center w-full gap-2'>
          
          {/* Speed Controls */}
          <div className='justify-self-start'>
            <Button
              variant='secondary'
              size='sm'
              disabled={fps <= 0 || isUpdating}
              onClick={() => setFPS(x => Math.max(0, x - 1))}
            >
              Slower
            </Button>
          </div>
          
          {/* Play Controls */}
          <div className='flex flex-col items-center justify-center gap-1 w-full'>
            <div className='flex justify-around w-full'>
              <Button
                disabled={isAnimating || isUpdating}
                variant='default'
                size='sm'
                onClick={stepBackward}
                title='Step Backward'
              >
                <FaBackwardStep />
              </Button>

              <Button
                variant='default'
                size='sm'
                className='mx-2'
                onClick={() => setIsAnimating(!isAnimating)}
                disabled={isUpdating}
                title={isAnimating ? 'Pause' : 'Play'}
              >
                {isAnimating ? <FaPause /> : <FaPlay />}
              </Button>

              <Button
                disabled={isAnimating || isUpdating}
                variant='default'
                size='sm'
                onClick={stepForward}
                title='Step Forward'
              >
                <FaForwardStep />
              </Button>
            </div>
            
            <div className='text-[11px] leading-none'>
              <b>{frameRates[fps]}</b> FPS
            </div>
          </div>
          
          {/* Speed Controls */}
          <div className='justify-self-end'>
            <Button
              variant='secondary'
              size='sm'
              disabled={fps >= frameRates.length - 1 || isUpdating}
              onClick={() => setFPS(x => Math.min(frameRates.length - 1, x + 1))}
            >
              Faster
            </Button>
          </div>
        </div>

        {/* Window Navigation */}
        <div className='flex gap-2 mt-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => updateSliceWindow('backward')}
            disabled={isUpdating || sliceStart <= 0}
            className='flex-1'
          >
            ← Move Window Back
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => updateSliceWindow('forward')}
            disabled={isUpdating || sliceEnd >= totalLength - 1}
            className='flex-1'
          >
            Move Window Forward →
          </Button>
        </div>

        {/* Progress Info */}
        <div className='text-xs text-muted-foreground text-center'>
          Position: {currentPosition + 1}/{sliceLength} | 
          Global: {sliceStart + currentPosition + 1}/{totalLength}
        </div>
      </CardContent>
    </Card>
  );
};

const SliceControls: React.FC<SliceControlsProps> = ({ onSliceUpdate, isUpdating }) => {
  const { plotOn } = useGlobalStore(
    useShallow(state => ({
      plotOn: state.plotOn,
    }))
  );

  const [showOptions, setShowOptions] = useState<boolean>(false);
  const enableCond = plotOn && !isUpdating;

  return (
    <>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div style={!enableCond ? { pointerEvents: 'none' } : {}}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-8 right-4 z-50 size-10 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out bg-background/80 backdrop-blur-sm"
              style={{
                color: enableCond ? '' : 'var(--text-disabled)'
              }}
              onClick={() => {if (enableCond) setShowOptions(x => !x)}}
            >
              <PiSliders className="size-6" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" align="start" className="flex flex-col">
          <span>Slice controls</span>
        </TooltipContent>
      </Tooltip>
      
      <SliceInterface 
        visible={showOptions && enableCond} 
        onSliceUpdate={onSliceUpdate}
        isUpdating={isUpdating}
      />
    </>
  );
};

export { SliceControls };