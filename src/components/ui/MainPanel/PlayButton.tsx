"use client";
import { useGlobalStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates'
import {useEffect, useMemo, useState, useRef} from 'react'
import { useShallow } from 'zustand/shallow'
import '../css/MainPanel.css'
import { PiPlayPauseFill } from "react-icons/pi";
import { FaPlay, FaPause, FaForwardStep , FaBackwardStep  } from "react-icons/fa6";
import { parseLoc } from '@/utils/HelperFuncs';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"


const frameRates = [1, 2, 4, 6, 8, 12, 16, 24, 36, 48, 54, 60, 80, 120]

interface ChunkViz {
  zSlice: [number, number| null];
  timeLength: number;
  chunkWidth:number;
  showNext:boolean;
  showPrev: boolean;
  animProg: number;
}

const ChunkVisualizer = ({zSlice, timeLength, chunkWidth, showNext, showPrev, animProg} : ChunkViz) =>{

  const rightPercentage = (1 - (zSlice[1] ? zSlice[1]/timeLength : 1)) * 100
  const leftPercentage = (zSlice[0]/timeLength) * 100
  const playHeadPos = leftPercentage + animProg * ((100 - rightPercentage) - leftPercentage);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "20px", // or whatever height you want
        border: "1px var(--text-paragraph) solid",
        background: "none"
      }}
    >
      {/* Available DATA */}
      <div
        style={{
          position: "absolute",
          left: `${leftPercentage}%`,
          right: `${(1 - (zSlice[1] ? zSlice[1]/timeLength : 1)) * 100}%`,
          background: "var(--play-background)",
          top:0,
          bottom:0,
        }}
      />
      {/* EXTRA CHUNKS */}
        <div
          style={{
            position: "absolute",
            left: `${100 - rightPercentage}%`,
            right: `${rightPercentage - chunkWidth}%`,
            background: "var(--accent-1)",
            visibility: showNext ? "visible" : "hidden",
            top:0,
            bottom:0,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${leftPercentage - chunkWidth}%`,
            right: `${100 - leftPercentage}%`,
            background: "var(--accent-1)",
            visibility: showPrev ? "visible" : "hidden",
            top:0,
            bottom:0,
          }}
        />
      {/* PlayHead */}
      <div 
        style={{
          position:'absolute',
          left:`${playHeadPos}%`,
          width: 0,
          borderLeft: "1px red solid",
          borderRight: "1px red solid",
          top: 0,
          bottom:0
        }}
      />
    </div>

  )
}

const PlayInterFace = ({visible, setKeepOpen}:{visible : boolean, setKeepOpen: React.Dispatch<React.SetStateAction<boolean>>}) =>{
    
    const {animate, animProg, zSlice, setAnimate, setAnimProg} = usePlotStore(useShallow(state => ({
        animate: state.animate,
        animProg: state.animProg,
        zSlice: state.zSlice,
        setAnimate: state.setAnimate,
        setAnimProg: state.setAnimProg
    })))

    const {dimArrays, dimUnits, zMeta, variable} = useGlobalStore(useShallow(state => ({
        dimArrays: state.dimArrays,
        dimUnits: state.dimUnits,
        zMeta: state.zMeta,
        variable: state.variable,
    })))
    const timeSlice = dimArrays[0].slice(zSlice[0], zSlice[1] ? zSlice[1] : undefined)
  
    const {reFetch, setZSlice, ReFetch} = useZarrStore(useShallow(state =>({
      reFetch: state.reFetch,
      setZSlice: state.setZSlice,
      ReFetch: state.ReFetch
    })))
    const timeLength = dimArrays[dimArrays.length-3].length
    const sliceDist = zSlice[1] ? zSlice[1] - zSlice[0] : timeLength - zSlice[0];
    const [chunkTimeLength, chunkDivWidth] = useMemo(()=>{
      const meta = (zMeta as {name : string, chunks:number[]}[])?.find((e: any) => e.name === variable);
        if (meta) {
          const {chunks} = meta
          const chunkTimeSize = chunks[chunks.length - 3]
          const tempWidth = (chunkTimeSize/timeLength) * 100
          return [chunkTimeSize, tempWidth]
        }
        else{
          return  [0, 0]
        }
      },[zMeta, variable, timeLength])
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousVal = useRef<number>(0)
    const [fps, setFPS] = useState<number>(5)
    const previousFPS = useRef<number>(5)
    const [showNextChunk, setShowNextChunk] = useState(false)
    const [showPrevChunk, setShowPrevChunk] = useState(false)

    useEffect(() => {
        if (animate) {
            if (previousFPS.current != fps && intervalRef.current){
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        previousFPS.current = fps
        const dt = 1000/frameRates[fps];
        previousVal.current = Math.round(animProg*sliceDist)
        intervalRef.current = setInterval(() => {
            previousVal.current += 1;
            setAnimProg(((previousVal.current + 1) % sliceDist)/sliceDist);
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

    const currentLabel = parseLoc(timeSlice[Math.round(animProg * (sliceDist))], dimUnits[0], true)
    const firstLabel = parseLoc(timeSlice[0], dimUnits[0], true)
    const lastLabel = parseLoc(timeSlice[sliceDist-1], dimUnits[0], true)

    useEffect(()=>{
      setAnimate(false)
      setAnimProg(0)
    },[reFetch])

    return (
          <Card className='play-interface py-1' style={{ display: visible ? '' : 'none' }}>
            <CardContent className='flex flex-col gap-1 w-full h-full px-1 py-1'>
              <div className='flex justify-between'>
                <Button 
                  variant='secondary'
                  size='sm'
                  className='cursor-pointer'
                  disabled={zSlice[0] == 0}
                  onClick={()=>{
                    setZSlice([zSlice[0] - chunkTimeLength, zSlice[1]]);
                    setKeepOpen(true);
                    ReFetch();
                  }}
                  onPointerOver={()=>setShowPrevChunk(true)}
                  onPointerLeave={()=>setShowPrevChunk(false)}
                >
                  Grab Prev Chunk
                </Button>
                <div className='text-xs sm:text-sm text-center'>
                  {currentLabel}
                </div>
                <Button 
                  variant='secondary'
                  size='sm'
                  className='cursor-pointer'
                  disabled={!zSlice[1] || zSlice[1] == timeLength}
                  onClick={()=>{
                    // @ts-expect-error button is disable when zSlice[1] is null so not possible to be null during op
                    setZSlice([zSlice[0], zSlice[1]+chunkTimeLength]);
                    setKeepOpen(true);
                    ReFetch();
                  }}
                  onPointerOver={()=>setShowNextChunk(true)}
                  onPointerLeave={()=>setShowNextChunk(false)}
                >
                  Grab Next Chunk
                </Button>
              </div>
              
              <ChunkVisualizer 
                zSlice={zSlice} timeLength={timeLength} chunkWidth={chunkDivWidth} 
                showPrev={showPrevChunk} showNext={showNextChunk} animProg={animProg}/>
              <div className='flex items-center gap-1 w-full'>
                <span className='text-xs'>{firstLabel}</span>
                <Slider
                  value={[Math.round(animProg * timeLength)]}
                  min={0}
                  max={timeLength-1}
                  step={1}
                  className='flex-1'
                  onValueChange={(vals: number[])=>{
                    const v = Array.isArray(vals) ? vals[0] : 0;
                    setAnimProg(v / (timeLength));
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
                  <div className='flex justify-around '>
                    <Button
                      disabled={animate}
                      variant='default'
                      size='sm'
                      className='cursor-pointer'
                      onClick={() => {
                        previousVal.current = Math.round(animProg*timeLength) - 1;
                        if (previousVal.current == -1){
                          previousVal.current = timeLength-1;
                        }
                        setAnimProg(((previousVal.current) % timeLength)/timeLength);
                      }}
                      aria-label={animate ? 'Pause' : 'Play'}
                      title={animate ? 'Pause' : 'Play'}
                    >
                      { <FaBackwardStep />}
                    </Button>

                    <Button
                      variant='default'
                      size='sm'
                      className='cursor-pointer mx-2'
                      onClick={() => setAnimate(!animate)}
                      aria-label={animate ? 'Pause' : 'Play'}
                      title={animate ? 'Pause' : 'Play'}
                    >
                      {animate ? <FaPause /> : <FaPlay />}
                    </Button>

                    <Button
                      disabled={animate}
                      variant='default'
                      size='sm'
                      className='cursor-pointer'
                      onClick={() => {
                        previousVal.current = Math.round(animProg*timeLength) + 1;
                        setAnimProg(((previousVal.current) % timeLength)/timeLength);
                      }}
                      aria-label={animate ? 'Pause' : 'Play'}
                      title={animate ? 'Pause' : 'Play'}
                    >
                      { <FaForwardStep />}
                    </Button>
                  </div>
                  
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
      )      
}

const PlayButton = () => {
    const {isFlat, plotOn} = useGlobalStore(useShallow(state => ({
        isFlat: state.isFlat,
        plotOn: state.plotOn,
    })))
    const {reFetch} = useZarrStore(useShallow(state =>({
      reFetch: state.reFetch
    })))

    const [showOptions, setShowOptions] = useState<boolean>(false)
    const cond = useMemo(()=>!isFlat && plotOn, [isFlat,plotOn])
    const enableCond = (!isFlat && plotOn)
    const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
    const [keepOpen, setKeepOpen] = useState(false)

    useEffect(()=>{
      if (keepOpen){
        setKeepOpen(false)
      } else {
        setShowOptions(false)
      }
    },[reFetch])

    useEffect(() => {
        const handleResize = () => {
          setPopoverSide(window.innerWidth < 768 ? "top" : "left");
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
      }, []);
    
  return (
    <>
      <Tooltip delayDuration={500} >
        <TooltipTrigger asChild>
          <div style={!enableCond ? { pointerEvents: 'none' } : {}}>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
              style={{
                color: enableCond ? '' : 'var(--text-disabled)'
              }}
              onClick={() => {if (cond){setShowOptions(x=>!x)}}}
            >
              <PiPlayPauseFill className="size-8" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side={popoverSide === "left" ? "left" : "top"}
          align={popoverSide === "left" ? "start" : "center"}
          className="flex flex-col"
        >
          <span>Animation controls</span>
        </TooltipContent>

      </Tooltip>
      <PlayInterFace visible={(showOptions && enableCond)} setKeepOpen={setKeepOpen}/>
    </>
  )
}

export default PlayButton
