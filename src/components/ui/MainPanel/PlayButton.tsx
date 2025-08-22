"use client";
import { useGlobalStore, usePlotStore } from '@/utils/GlobalStates'
import React, {useEffect, useMemo, useState, useRef} from 'react'
import { useShallow } from 'zustand/shallow'
import '../css/MainPanel.css'
import { PiPlayPauseFill } from "react-icons/pi";
import { FaPlay, FaPause } from "react-icons/fa6";
import { parseLoc } from '@/utils/HelperFuncs';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"


const frameRates = [1, 2, 4, 6, 8, 12, 16, 24, 36, 48, 54, 60, 80, 120]

const PlayInterFace = ({visible}:{visible : boolean}) =>{
    
    const {animate, animProg, setAnimate, setAnimProg} = usePlotStore(useShallow(state => ({
        animate: state.animate,
        animProg: state.animProg,
        setAnimate: state.setAnimate,
        setAnimProg: state.setAnimProg
    })))

    const {dimArrays, dimNames, dimUnits} = useGlobalStore(useShallow(state => ({
        dimArrays: state.dimArrays,
        dimNames: state.dimNames,
        dimUnits: state.dimUnits 
    })))

    const timeLength = useMemo(()=>dimArrays[0].length,[dimArrays])
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousVal = useRef<number>(0)
    const [fps, setFPS] = useState<number>(5)
    const previousFPS = useRef<number>(5)


    useEffect(() => {
        if (animate) {
            if (previousFPS.current != fps && intervalRef.current){
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        previousFPS.current = fps
        const dt = 1000/frameRates[fps];
        previousVal.current = Math.round(animProg*timeLength)
        intervalRef.current = setInterval(() => {
            previousVal.current += 1;
            setAnimProg(((previousVal.current + 1) % timeLength)/timeLength);
        }, dt);
        } else {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        }
        return ()=>{
             if (intervalRef.current){
                clearInterval(intervalRef.current);
             }
        }
        
    }, [animate, fps]);

    const currentLabel = parseLoc(dimArrays[0][Math.min(Math.round(animProg*timeLength),timeLength-1)], dimUnits[0], true)
    const firstLabel = parseLoc(dimArrays[0][0], dimUnits[0], true)
    const lastLabel = parseLoc(dimArrays[0][timeLength-1], dimUnits[0], true)

    return (
        <div style={{ display: visible ? '' : 'none' }}>
          <Card className='play-interface py-1'>
            <CardContent className='flex flex-col gap-1 w-full h-full px-1 py-1'>
              <div className='text-xs sm:text-sm text-center'>
                {currentLabel}
              </div>
              <div className='flex items-center gap-1 w-full'>
                <span className='text-xs'>{firstLabel}</span>
                <Slider
                  value={[Math.round(animProg * timeLength)]}
                  min={0}
                  max={timeLength}
                  step={1}
                  className='flex-1'
                  onValueChange={(vals: number[])=>{
                    const v = Array.isArray(vals) ? vals[0] : 0;
                    setAnimProg(v / timeLength);
                  }}
                />
                <span className='text-xs'>{lastLabel}</span>
              </div>
              <div className='grid grid-cols-3 items-center w-full'>
                <div className='justify-self-start'>
                  <Button
                    variant='secondary'
                    size='sm'
                    className='cursor-pointer'
                    disabled={fps <= 0}
                    onClick={() => setFPS(x => Math.max(0, x - 1))}
                  >
                    Slower
                  </Button>
                </div>
                <div className='flex flex-col items-center justify-center gap-1 w-full'>
                  <Button
                    variant='default'
                    size='sm'
                    className='cursor-pointer'
                    onClick={() => setAnimate(!animate)}
                    aria-label={animate ? 'Pause' : 'Play'}
                    title={animate ? 'Pause' : 'Play'}
                  >
                    {animate ? <FaPause /> : <FaPlay />}
                  </Button>
                  <div className='text-[11px] leading-none'>
                    <b>{frameRates[fps]}</b> FPS
                  </div>
                </div>
                <div className='justify-self-end'>
                  <Button
                    variant='secondary'
                    size='sm'
                    className='cursor-pointer'
                    disabled={fps >= frameRates.length - 1}
                    onClick={() => setFPS(x => Math.min(frameRates.length - 1, x + 1))}
                  >
                    Faster
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )      
}

const PlayButton = () => {
    const {isFlat, plotOn} = useGlobalStore(useShallow(state => ({
        isFlat: state.isFlat,
        plotOn: state.plotOn
    })))
    const [showOptions, setShowOptions] = useState<boolean>(false)
    const cond = useMemo(()=>!isFlat && plotOn, [isFlat,plotOn])
    const enableCond = (!isFlat && plotOn)
  return (
    <div>
      {enableCond ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
              onClick={() => {if (cond){setShowOptions(x=>!x)}}}
            >
              <PiPlayPauseFill className="size-8" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="flex flex-col">
            <span>Animation <strong>controls:</strong></span>
            <span className="ml-1">• <strong>Play</strong> / Pause</span>
            <span className="ml-1">• <strong>Speed</strong> control</span>
            <span className="ml-1">• <strong>Time</strong> Slider</span>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          disabled
          style={{
            color: 'var(--text-disabled)',
            transform: 'scale(1)',
          }}
        >
          <PiPlayPauseFill className="size-8" />
        </Button>
      )}
      <PlayInterFace visible={showOptions}/>
    </div>
  )
}

export default PlayButton
