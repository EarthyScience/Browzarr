import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Loader2, Download, Play, Pause } from 'lucide-react';

interface SliceControlsProps {
  onSliceUpdate: (slice: [number, number | null]) => Promise<boolean>;
  isUpdating: boolean;
}

const SliceControls: React.FC<SliceControlsProps> = ({ onSliceUpdate, isUpdating }) => {
  const { dimArrays, dimNames } = useGlobalStore(
    useShallow(state => ({
      dimArrays: state.dimArrays,
      dimNames: state.dimNames
    }))
  );

  const { slice } = useZarrStore(
    useShallow(state => ({
      slice: state.slice
    }))
  );

  // Configuration
  const MAX_DISTANCE = 10; // Maximum distance between start and end
  
  // Local state
  const [startTime, setStartTime] = useState<number>(slice[0] || 0);
  const [endTime, setEndTime] = useState<number>(Math.min((slice[0] || 0) + MAX_DISTANCE, slice[1] || MAX_DISTANCE));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(500); // ms between updates

  // Get time dimension info
  const timeArray = dimArrays?.[0];
  const maxTime = timeArray ? timeArray.length - 1 : 100;
  const timeName = dimNames?.[0] || 'time';

  // Ensure end time doesn't exceed max distance from start
  const updateStartTime = useCallback((newStart: number) => {
    const clampedStart = Math.max(0, Math.min(newStart, maxTime));
    const newEnd = Math.min(clampedStart + MAX_DISTANCE, maxTime);
    
    setStartTime(clampedStart);
    setEndTime(newEnd);
  }, [maxTime]);

  // Ensure start time adjusts if end would exceed max distance
  const updateEndTime = useCallback((newEnd: number) => {
    const clampedEnd = Math.max(0, Math.min(newEnd, maxTime));
    const newStart = Math.max(0, clampedEnd - MAX_DISTANCE);
    
    setStartTime(newStart);
    setEndTime(clampedEnd);
  }, [maxTime]);

  // Animation: pushes the end index forward and updates slice
  const startAnimation = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = async () => {
      // Push end time forward
      const newEnd = Math.min(endTime + 1, maxTime);
      
      // If we've reached the end, loop back
      if (newEnd >= maxTime) {
        updateStartTime(0); // This will set start=0, end=MAX_DISTANCE
        return;
      }
      
      // Update end time (which will adjust start if needed)
      updateEndTime(newEnd);
      
      // Update the slice with new range
      await onSliceUpdate([Math.max(0, newEnd - MAX_DISTANCE), newEnd]);
    };

    const intervalId = setInterval(animate, playSpeed);
    return () => clearInterval(intervalId);
  }, [isPlaying, endTime, maxTime, playSpeed, onSliceUpdate, updateStartTime, updateEndTime]);

  // Manual slice update
  const handleSliceUpdate = useCallback(async () => {
    const success = await onSliceUpdate([startTime, endTime]);
    if (!success) {
      console.error('Failed to update slice');
    }
  }, [startTime, endTime, onSliceUpdate]);

  // Format time value for display
  const formatTimeValue = useCallback((value: number) => {
    if (timeArray && timeArray[value] !== undefined) {
      return timeArray[value];
    }
    return value;
  }, [timeArray]);

  return (
    <Card className="absolute top-24 right-24 z-50 w-80 bg-background/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Slice Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Range Display */}
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-sm font-medium">
            {timeName} Range: {formatTimeValue(startTime)} - {formatTimeValue(endTime)}
          </div>
          <div className="text-xs text-muted-foreground">
            Window Size: {endTime - startTime + 1} steps (max: {MAX_DISTANCE + 1})
          </div>
        </div>

        {/* Start Time Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Time: {formatTimeValue(startTime)}</label>
          <Slider
            value={[startTime]}
            onValueChange={([value]) => updateStartTime(value)}
            max={maxTime}
            min={0}
            step={1}
            className="w-full"
          />
          <Input
            type="number"
            value={startTime}
            onChange={(e) => updateStartTime(Number(e.target.value))}
            min={0}
            max={maxTime}
            className="text-center"
          />
        </div>

        {/* End Time Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">End Time: {formatTimeValue(endTime)}</label>
          <Slider
            value={[endTime]}
            onValueChange={([value]) => updateEndTime(value)}
            max={maxTime}
            min={MAX_DISTANCE}
            step={1}
            className="w-full"
          />
          <Input
            type="number"
            value={endTime}
            onChange={(e) => updateEndTime(Number(e.target.value))}
            min={MAX_DISTANCE}
            max={maxTime}
            className="text-center"
          />
        </div>

        {/* Animation Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Animation</label>
            <div className="text-xs text-muted-foreground">
              Speed: {playSpeed}ms
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={isPlaying ? "destructive" : "default"}
              size="sm"
              onClick={isPlaying ? stopAnimation : startAnimation}
              disabled={isUpdating}
              className="flex items-center gap-1"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? 'Stop' : 'Play'}
            </Button>
            
            <Slider
              value={[playSpeed]}
              onValueChange={([value]) => setPlaySpeed(value)}
              min={100}
              max={2000}
              step={100}
              className="flex-1"
            />
          </div>
        </div>

        {/* Manual Update Button */}
        <Button 
          onClick={handleSliceUpdate}
          disabled={isUpdating || isPlaying}
          className="w-full"
          variant="outline"
        >
          {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isUpdating ? 'Updating...' : 'Update Slice'}
        </Button>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>Range: [{startTime}, {endTime}] ({endTime - startTime + 1} steps)</div>
          <div>Max window: {MAX_DISTANCE + 1} time steps</div>
        </div>
      </CardContent>
    </Card>
  );
};

export {SliceControls};