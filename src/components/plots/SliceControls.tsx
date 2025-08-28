import React, { useState, useCallback } from 'react';
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

  // Local state for slice controls
  const [startTime, setStartTime] = useState<number>(slice[0] || 0);
  const [endTime, setEndTime] = useState<number | null>(slice[1]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(500); // ms between updates

  // Get time dimension info (assuming first dimension is time)
  const timeArray = dimArrays?.[0];
  const maxTime = timeArray ? timeArray.length - 1 : 100;
  const timeName = dimNames?.[0] || 'time';

  const handleSliceUpdate = useCallback(async () => {
    const newSlice: [number, number | null] = [startTime, endTime];
    const success = await onSliceUpdate(newSlice);
    if (!success) {
      console.error('Failed to update slice');
    }
  }, [startTime, endTime, onSliceUpdate]);

  // Animation controls
  const startAnimation = useCallback(() => {
    setIsPlaying(true);
    let currentTime = startTime;
    
    const animate = () => {
      if (currentTime >= maxTime) {
        currentTime = 0; // Loop back to start
      } else {
        currentTime += 1;
      }
      
      setStartTime(currentTime);
      onSliceUpdate([currentTime, currentTime + 1]);
      
      if (isPlaying) {
        setTimeout(() => {
          requestAnimationFrame(animate);
        }, playSpeed);
      }
    };
    
    requestAnimationFrame(animate);
  }, [startTime, maxTime, isPlaying, playSpeed, onSliceUpdate]);

  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
  }, []);

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
        {/* Time Range Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {timeName} Range: {formatTimeValue(startTime)} 
            {endTime !== null && ` - ${formatTimeValue(endTime)}`}
          </label>
          
          {/* Start Time Slider */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Start Time</label>
            <Slider
              value={[startTime]}
              onValueChange={([value]) => setStartTime(value)}
              max={maxTime}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          {/* End Time Slider */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">End Time (optional)</label>
            <Slider
              value={[endTime || maxTime]}
              onValueChange={([value]) => setEndTime(value)}
              max={maxTime}
              min={startTime}
              step={1}
              className="w-full"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEndTime(null)}
              className="text-xs"
            >
              Use Single Time Step
            </Button>
          </div>
        </div>

        {/* Manual Input */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Start</label>
            <Input
              type="number"
              value={startTime}
              onChange={(e) => setStartTime(Number(e.target.value))}
              min={0}
              max={maxTime}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End</label>
            <Input
              type="number"
              value={endTime || ''}
              onChange={(e) => setEndTime(e.target.value ? Number(e.target.value) : null)}
              min={startTime}
              max={maxTime}
              placeholder="Auto"
            />
          </div>
        </div>

        {/* Animation Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Animation</label>
          <div className="flex gap-2">
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="sm"
              onClick={isPlaying ? stopAnimation : startAnimation}
              disabled={isUpdating}
              className="flex items-center gap-1"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? 'Stop' : 'Play'}
            </Button>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Speed (ms)</label>
              <Input
                type="number"
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                min={100}
                max={2000}
                step={100}
                size={1}
              />
            </div>
          </div>
        </div>

        {/* Update Button */}
        <Button 
          onClick={handleSliceUpdate}
          disabled={isUpdating || isPlaying}
          className="w-full"
        >
          {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isUpdating ? 'Updating...' : 'Update Slice'}
        </Button>

        {/* Current Status */}
        <div className="text-xs text-muted-foreground text-center">
          Current: {formatTimeValue(startTime)}
          {endTime && ` to ${formatTimeValue(endTime)}`}
        </div>
      </CardContent>
    </Card>
  );
};

export {SliceControls};