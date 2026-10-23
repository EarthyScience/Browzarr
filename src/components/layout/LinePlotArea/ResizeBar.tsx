'use client';

import { useEffect, useState, useCallback } from 'react';
import '../css/ResizeBar.css'

const MIN_HEIGHT = 50; // Minimum height in pixels
const KEYBOARD_STEP = 10; // Pixels to move per keypress

const ResizeBar = ({height,setHeight}:{height:number,setHeight:React.Dispatch<React.SetStateAction<number>>}) => {
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const [maxHeight, setMaxHeight] = useState<number>(window.innerHeight - MIN_HEIGHT);
    
    // Update max height on window resize
    useEffect(() => {
        const updateMaxHeight = () => {
            setMaxHeight(window.innerHeight - 100);
        };
        
        window.addEventListener('resize', updateMaxHeight);
        return () => window.removeEventListener('resize', updateMaxHeight);
    }, []);
    
    // Throttled height update using requestAnimationFrame
    const updateHeight = useCallback((newHeight: number) => {
        requestAnimationFrame(() => {
            const boundedHeight = Math.min(Math.max(newHeight, MIN_HEIGHT), maxHeight);
            setHeight(newHeight);
        });
    }, [setHeight, maxHeight]);
    
    // Handle keyboard controls
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                updateHeight(height - KEYBOARD_STEP);
                break;
            case 'ArrowDown':
                e.preventDefault();
                updateHeight(height + KEYBOARD_STEP);
                break;
            case 'Home':
                e.preventDefault();
                updateHeight(MIN_HEIGHT);
                break;
            case 'End':
                e.preventDefault();
                updateHeight(maxHeight);
                break;
        }
    }, [height, maxHeight, updateHeight]);
    
    // Start resizing on mousedown/touchstart
    const handleStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent text selection
      setIsResizing(true);
    };
    
    // Adjust height on mousemove/touchmove
    const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
      if (isResizing) {
        e.preventDefault();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        updateHeight(clientY);
      }
    }, [isResizing, updateHeight]);
    
    // Stop resizing on mouseup/touchend/touchcancel
    const handleEnd = useCallback(() => {
      setIsResizing(false);
    }, []);
    
    // Handle window resize during dragging
    const handleWindowResize = useCallback(() => {
      if (isResizing) {
        setIsResizing(false);
      }
    }, [isResizing]);
    
    // Add/remove document event listeners based on resizing state
    useEffect(() => {
      if (isResizing) {
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
        window.addEventListener('resize', handleWindowResize);
      }
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
        window.removeEventListener('resize', handleWindowResize);
      };
    }, [isResizing, handleMove, handleEnd, handleWindowResize]);

  return (
    <div 
      className='resize-bar' 
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      onKeyDown={handleKeyDown}
      style={{
        top:`${height}px`,
      }}
      role="slider"
      aria-label="Resize plot height"
      aria-valuemin={MIN_HEIGHT}
      aria-valuemax={maxHeight}
      aria-valuenow={height}
      tabIndex={0}
    />
  )
}

export default ResizeBar
