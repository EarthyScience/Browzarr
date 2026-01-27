import React, { useState, useMemo, useEffect } from "react"
import { useCacheStore, useGlobalStore, usePlotStore, useZarrStore } from '@/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { SliderThumbs } from "@/components/ui/SliderThumbs"
import { Button } from "@/components/ui/button"
import Metadata, { defaultAttributes, renderAttributes } from "@/components/ui/MetaData"
import { Input } from "../input"
import { BsFillQuestionCircleFill } from "react-icons/bs";
import { parseLoc, HandleKernelNums } from "@/utils/HelperFuncs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {Popover, PopoverTrigger, PopoverContent} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Switch } from "../switch"
import Hider from "../Hider"

const formatArray = (value: string | number[]): string => {
  if (typeof value === 'string') return value
  return Array.isArray(value) ? value.join(', ') : String(value)
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
type Slice = [number, number | null]

function ChunkIDs(slices:{xSlice: Slice, ySlice: Slice, zSlice: Slice}, chunkShape: number[], dataShape:number[], is4D:boolean ){
  const {xSlice, ySlice, zSlice} = slices
  const zStartIdx = Math.floor(zSlice[0]/chunkShape[0])
  const zEndIdx = zSlice[1] ? Math.ceil(zSlice[1]/chunkShape[0]) : is4D ? Math.ceil(dataShape[1]/chunkShape[0]) : Math.ceil(dataShape[0]/chunkShape[0]) //If Slice[1] is null, use the end of the array
  const yStartIdx = Math.floor(ySlice[0]/chunkShape[1])
  const yEndIdx = ySlice[1] ? Math.ceil(ySlice[1]/chunkShape[1]) : is4D ? Math.ceil(dataShape[2]/chunkShape[1]) : Math.ceil(dataShape[1]/chunkShape[1])
  const xStartIdx = Math.floor(xSlice[0]/chunkShape[2])
  const xEndIdx = xSlice[1] ? Math.ceil(xSlice[1]/chunkShape[2]) : is4D ? Math.ceil(dataShape[3]/chunkShape[2]) : Math.ceil(dataShape[2]/chunkShape[2])
  const ids = []
  for (let z = zStartIdx; z < zEndIdx; z++) {
    for (let y = yStartIdx; y < yEndIdx; y++) {
      for (let x = xStartIdx; x < xEndIdx; x++) {
        const chunkID = `z${z}_y${y}_x${x}`
        ids.push(chunkID)
      }
    }
  }
  return ids
}

function HandleCustomSteps(e: string, chunkSize: number){
    const newVal = parseInt(e);
    const chunkStep = Math.floor(newVal/chunkSize) * chunkSize
    return chunkStep
  }


const MetaDataInfo = ({ meta, metadata, setShowMeta, setOpenVariables, popoverSide }: { meta: any, metadata: Record<string, any>, setShowMeta: React.Dispatch<React.SetStateAction<boolean>>, setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>, popoverSide: string  }) => {
  const {is4D, idx4D, variable, initStore, setIs4D, setIdx4D, setVariable, setTextureArrayDepths} = useGlobalStore(useShallow(state => ({
    is4D: state.is4D, idx4D: state.idx4D, variable: state.variable,
    initStore: state.initStore,
    setIs4D: state.setIs4D, setIdx4D: state.setIdx4D, setVariable: state.setVariable,
    setTextureArrayDepths: state.setTextureArrayDepths,
  })))
  const {maxSize, cache, setMaxSize} = useCacheStore(useShallow(state => ({maxSize: state.maxSize, cache:state.cache, setMaxSize:state.setMaxSize})))
  const [cacheSize, setCacheSize] = useState(maxSize)
  const { zSlice, ySlice, xSlice, compress, coarsen, kernelSize, kernelDepth, setZSlice, setYSlice, setXSlice, ReFetch, setCompress, setCoarsen, setKernelSize, setKernelDepth } = useZarrStore(useShallow(state => ({
    zSlice: state.zSlice, ySlice: state.ySlice, xSlice: state.xSlice,
    compress: state.compress, coarsen: state.coarsen, kernelSize: state.kernelSize,
    kernelDepth: state.kernelDepth,
    setZSlice: state.setZSlice, setYSlice: state.setYSlice, setXSlice: state.setXSlice,
    ReFetch: state.ReFetch, setCompress: state.setCompress,
    setCoarsen: state.setCoarsen, setKernelSize: state.setKernelSize,
    setKernelDepth: state.setKernelDepth
  })))
  const {maxTextureSize, max3DTextureSize} = usePlotStore(useShallow(state => ({maxTextureSize: state.maxTextureSize, max3DTextureSize: state.max3DTextureSize})))

  const [tooBig, setTooBig] = useState(false)
  const [cached, setCached] = useState(false)
  const [cachedChunks, setCachedChunks] = useState<string | null>(null)
  const [texCount, setTexCount] = useState(0)

  // ---- Meta Info ---- //
  const {dimArrays, dimNames, dimUnits} = meta.dimInfo
  const totalSize = meta.totalSize ? meta.totalSize : 0
  const shapeLength = meta.shape.length;
  const chunkIDs = meta.chunks && useMemo(()=>ChunkIDs({xSlice, ySlice, zSlice}, meta.chunks, meta.shape, meta.shape.length == 4),[zSlice, xSlice, ySlice, meta])
  const zLength = useMemo(() => meta.shape ? meta.shape[shapeLength-3] : 0, [meta])
  const yLength = useMemo(() => meta.shape ? meta.shape[shapeLength-2] : 0, [meta])
  const xLength = useMemo(() => meta.shape ? meta.shape[shapeLength-1] : 0, [meta])
  const dataShape = coarsen ? meta.shape.map((val: number, idx: number) => idx === 0 ? val/kernelDepth : val/kernelSize): meta.shape
  const chunkShape = coarsen ? meta.chunks.map((val: number, idx: number) => idx === 0 ? val/kernelDepth : val/kernelSize): meta.chunks

  // ---- Booleans ---- //
  const is3D = useMemo(() => meta.shape ? meta.shape.length == 3 : false, [meta])
  const isFlat = meta.shape.length == 2
  const hasTimeChunks = (shapeLength > 2 ? meta.shape[shapeLength-3]/meta.chunks[shapeLength-3] > 1 : false) 
  const hasYChunks = (meta.shape[shapeLength-2]/meta.chunks[shapeLength-2] > 1 ) 
  const hasXChunks = (meta.shape[shapeLength-1]/meta.chunks[shapeLength-1] > 1 ) 

  const currentSize = useMemo(() => {
    const is2D = isFlat
    
    const getSliceDims = (slice: [number, number | null], defaultLast: number, first = 0) => {
      const sliceFirst = slice[0]?? first;
      const sliceLast = slice[1]?? defaultLast;
      return { first: sliceFirst, last: sliceLast, steps: sliceLast - sliceFirst };
    };

    const z = is2D ? { first: 0, last: 1, steps: 1 } : getSliceDims(zSlice, zLength);
    const x = getSliceDims(xSlice, meta.shape[is4D ? 3 : is3D ? 2 : 1]);
    const y = getSliceDims(ySlice, meta.shape[is4D ? 2 : is3D ? 1 : 0]);

    const maxSize = is2D ? maxTextureSize : max3DTextureSize;
    const texCounts = [z.steps / maxSize, y.steps / maxSize, x.steps / maxSize];
    
    setTextureArrayDepths(
      texCounts.some(count => count > 1)
        ? texCounts.map(val => Math.ceil(val))
        : [1, 1, 1]
    );
    const thisCount = texCounts.reduce((prod, val) => prod * Math.ceil(val), 1)
    setTexCount(thisCount)

    if (thisCount > 14){ // We can only have 14 textures. 
      setTooBig(x=>true)
    } else{
      setTooBig(x=>false)
    }
    // Calculate size
    if (is2D) {
      const totalSteps = x.steps * y.steps;
      const sizeRatio = totalSteps / (meta.shape[0] * meta.shape[1]);
      return totalSize * sizeRatio;
    } else {
      const chunkIndices = is4D ? [3, 2, 1] : [2, 1, 0];
      const xChunksNeeded = Math.ceil(x.steps / meta.chunks[chunkIndices[0]]);
      const yChunksNeeded = Math.ceil(y.steps / meta.chunks[chunkIndices[1]]);
      const zChunksNeeded = Math.ceil(z.steps / meta.chunks[chunkIndices[2]]);
      
      return xChunksNeeded * yChunksNeeded * zChunksNeeded * meta.chunkSize;
    }
  }, [meta, zSlice, xSlice, ySlice, zLength, is3D, is4D]);
  
  const cachedSize = useMemo(()=>{
    const thisDtype = meta.dtype as string
    if (thisDtype.includes("32") || thisDtype.includes("f4")){
      return currentSize / 2;
    } else if (thisDtype.includes("64") || thisDtype.includes("f8")){
      return currentSize / 4;
    } else if (thisDtype.includes("8") || thisDtype.includes("i1") ){
      return currentSize * 2;
    } else {
      return currentSize;
    }
  },[currentSize, meta])

  const smallCache = cachedSize > cacheSize

  useEffect(()=>{
    const this4D = meta.shape.length == 4;
    setIs4D(this4D);
  },[meta])

  // ---- Available Chunks ---- //
  useEffect(()=>{
    setCompress(false)
    setIdx4D(null);
    setCachedChunks(null);
    if (cache.has(`${initStore}_${meta.name}`)){
      
      setCached(true);
      return;
    }else if (chunkIDs){
      let accum = 0; 
      for (const id of chunkIDs){
        if (cache.has(`${initStore}_${meta.name}_chunk_${id}`)){
          accum ++;
        }
      }
      if ( accum > 0){
        setCachedChunks(`${accum}/${chunkIDs.length}`)
        setCached(true); 
        return;
      } else {
        setCached(false)
      }
    } else {
      setCached(false)
    }
  },[meta, chunkIDs])

  return (
    <> 
        <b>{`${meta.long_name} `}</b>
          { popoverSide=="left" ? <Popover>
            <PopoverTrigger className="cursor-pointer" asChild>
              <Badge variant="default" className="block">
              Attributes
              </Badge>
            </PopoverTrigger>
            <PopoverContent
              data-meta-popover
              className="max-h-[50vh] overflow-y-auto max-w-200"
              align="center"
              >
              {renderAttributes(metadata, defaultAttributes)}
            </PopoverContent>
          </Popover>
          :
          <div> <Metadata data={metadata} variable ={'Attributes'} /> </div>
          }
        <br/>
        <br/>
        <div className="grid grid-cols-[40%_40%_20%]">
          <div className="flex flex-col">
            <b>Data Shape</b>
          {`[${formatArray(dataShape)}]`}
          </div>
          <div className="flex flex-col">
            <b>Chunk Shape</b>
          {`[${formatArray(chunkShape)}]`}
          </div>
          <div className="flex flex-col items-center">
            <label htmlFor="coarsen"><b>Coarsen</b></label>
            <Switch id="coarsen"  checked={coarsen} onCheckedChange={e=> setCoarsen(e)}/>
          </div>
        </div>
        <Hider show={coarsen} className="mt-2">
          <div className="grid grid-cols-2 gap-x-1">
            <div className="grid grid-cols-[auto_50px]">
              <b>Temporal Coarsening</b>
              <Input type='number' min='2' step='2' value={String(kernelDepth)} 
                onChange={e=>setKernelDepth(parseInt(e.target.value))}
                onBlur={e=>setKernelDepth(Math.max(2, HandleKernelNums(e.target.value)))}
              />
            </div>
            <div className="grid grid-cols-[auto_50px]">
              <b>Spatial Coarsening</b>
              <Input type='number' min='2' step='2' value={String(kernelSize)} 
                onChange={e=>setKernelSize(parseInt(e.target.value))}
                onBlur={e=>setKernelSize(Math.max(2, HandleKernelNums(e.target.value)))}
              />
            </div>
          </div>
        </Hider>
        <br/>
        <>
        {is4D &&
        <>
          <div>
            <p>
            This is Four-Dimensional Dataset. You must select an index along the first dimension. <br/>
            Please select an index from <b>0</b> to <b>{meta.shape[0]-1}</b>
            </p>
            <Input type="number" min={0} max={meta.shape[0]-1} value={String(idx4D)} onChange={e=>setIdx4D(parseInt(e.target.value))}/>
          </div>
        </>
        }
        {((is3D || isFlat || idx4D != null) && !(cached && !cachedChunks)) &&
          <>
            {(hasTimeChunks || hasXChunks || hasYChunks )  && (
              <>
              <span className="block text-center text-xl font-bold">Trim Data</span>
              <div className="grid gap-4 ">    
                {hasTimeChunks && <div className="grid gap-1">
                  <div className="flex justify-center">
                    <b>{dimNames[0] == "Default" ? 'Axis 0': dimNames[is4D ? 1 : 0] }</b>
                  </div>
                  <SliderThumbs
                    min={0}
                    max={zLength}
                    value={[zSlice[0] ? zSlice[0] : 0, zSlice[1] ? zSlice[1] : zLength]}
                    step={chunkShape[0]}
                    onValueChange={(values: number[]) => setZSlice([values[0], values[1]] as [number, number | null])}
                    
                  />
                  <div className="grid grid-cols-2">
                    <span >Min: <b>{parseLoc(dimArrays[is4D ? 1 : 0]?.[zSlice[0]]?? null, dimUnits[is4D ? 1 : 0]?? null)}</b>  <br /> Index: 
                      <input className='w-[50px]' type="number" value={zSlice[0]} 
                        onChange={e=>setZSlice([parseInt(e.target.value), zSlice[1]])}
                        onBlur={e=>setZSlice([HandleCustomSteps(e.target.value,chunkShape[0]), zSlice[1]])}
                      />
                    </span>
                    <span >Max: <b>{parseLoc(dimArrays[is4D ? 1 : 0]?.[zSlice[1] ? zSlice[1]-1 : zLength-1]?? null, dimUnits[is4D ? 1 : 0]?? null)}</b><br /> Index: 
                      <input className='w-[50px]' type="number" value={zSlice[1] ? zSlice[1] : zLength} 
                        onChange={e=>setZSlice([zSlice[0], parseInt(e.target.value)])}
                        onBlur={e=>setZSlice([zSlice[0], HandleCustomSteps(e.target.value,chunkShape[0])])}
                      />
                    </span>
                  </div>
                </div>  }
                {(hasYChunks ) && <div className="grid gap-1">
                  <div className="flex justify-center">
                    <b>{dimNames[1] == "Default" ? 'Axis 1': dimNames[isFlat ? 0 : shapeLength-2] }</b>
                  </div>
                  <SliderThumbs
                    min={0}
                    max={yLength}
                    value={[ySlice[0] ? ySlice[0] : 0, ySlice[1] ? ySlice[1] : yLength]}
                    step={isFlat ? chunkShape[0] : chunkShape[1]}
                    onValueChange={(values: number[]) => setYSlice([values[0], values[1]] as [number, number | null])}
                  />
                  <div className="grid grid-cols-2">
                    <span >Min: <b>{parseLoc(dimArrays[isFlat ? 0 : shapeLength-2]?.[ySlice[0]]?? null, dimUnits[isFlat ? 0 : shapeLength-2]?? null)}</b>  <br /> Index: 
                      <input className='w-[50px]' type="number" value={ySlice[0]} 
                        onChange={e=>setYSlice([parseInt(e.target.value), ySlice[1]])}
                        onBlur={e=>setYSlice([HandleCustomSteps(e.target.value,chunkShape[1]), ySlice[1]])}
                      />
                    </span>
                    <span >Max: <b>{parseLoc(dimArrays[isFlat ? 0 : shapeLength-2]?.[ySlice[1] ? ySlice[1]-1 : yLength-1]?? null, dimUnits[isFlat ? 0 : shapeLength-2]?? null)}</b><br /> Index: 
                      <input className='w-[50px]' type="number" value={ySlice[1] ? ySlice[1] : yLength} 
                        onChange={e=>setYSlice([ySlice[0] , parseInt(e.target.value)])}
                        onBlur={e=>setYSlice([ySlice[0], HandleCustomSteps(e.target.value,chunkShape[1])])}
                      />
                    </span>
                  </div>
                </div>  }
                {(hasXChunks ) && <div className="grid gap-1">
                  <div className="flex justify-center">
                    <b>{dimNames[2] == "Default" ? 'Axis 2': dimNames[isFlat ? 1 : shapeLength-1] }</b>
                  </div>
                  <SliderThumbs
                    min={0}
                    max={xLength}
                    value={[xSlice[0] ? xSlice[0] : 0, xSlice[1] ? xSlice[1] : xLength]}
                    step={isFlat ? chunkShape[1] : chunkShape[2]}
                    onValueChange={(values: number[]) => setXSlice([values[0], values[1]] as [number, number | null])}
                  />
                  <div className="grid grid-cols-2">
                    <span >Min: <b>{parseLoc(dimArrays[isFlat ? 1 : shapeLength-1]?.[xSlice[0]]?? null, dimUnits[isFlat ? 1 : shapeLength-1]?? null)}</b>  <br /> Index: 
                      <input className='w-[50px]' type="number" value={xSlice[0]} 
                        onChange={e=>setXSlice([parseInt(e.target.value), xSlice[1]])}
                        onBlur={e=>setXSlice([HandleCustomSteps(e.target.value,chunkShape[2]), xSlice[1]])}
                      />
                    </span>
                    <span >Max: <b>{parseLoc(dimArrays[isFlat ? 1 : shapeLength-1]?.[xSlice[1] ? xSlice[1]-1 : xLength-1]?? null, dimUnits[isFlat ? 1 : shapeLength-1]?? null)}</b><br /> Index: 
                      <input className='w-[50px]' type="number" value={xSlice[1] ? xSlice[1] : xLength} 
                        onChange={e=>setXSlice([xSlice[0] , parseInt(e.target.value)])}
                        onBlur={e=>setXSlice([xSlice[0], HandleCustomSteps(e.target.value,chunkShape[2])])}
                      />
                    </span>
                  </div>
                </div> }
              </div>
              </>
            )}
            <br/>
            <div className="grid gap-2">
              <div>
                <b>Raw Size: </b>{formatBytes(currentSize)}
              </div>
              <div>
                <b>Stored size: {compress ? "<" : null} </b>{formatBytes(cachedSize)}
              </div>
            </div>
            {currentSize > maxSize && (
              <>
              <div className={`flex items-center gap-2 p-2 ${smallCache ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"} rounded-md border`}>
                    <div className={`w-2 h-2 ${smallCache ? "bg-red-500" : "bg-emerald-500"} rounded-full`}></div>
                    <span className={`text-xs font-medium ${smallCache ? "text-red-800 dark:text-red-200" : "text-emerald-800 dark:text-emerald-200"}`}>
                      {smallCache ? "Selection won't fit in Cache" : "Data Will Fit"}
                    </span>                  
                    </div>
                    <div className="">
                      Decrease selection or Increase cache size <br/>
                      <div className="flex justify-center items-center">
                        Expand Cache: 
                          <div className="flex items-center gap-1">
                            <Input
                              className="w-[65px] h-[20px] no-spinner"
                              type="number"
                              min={200}
                              step={20}
                              value={cacheSize / (1024 * 1024)}
                              onChange={(e) => setCacheSize(parseInt(e.target.value)*(1024*1024))}
                            />
                            <span className="text-sm font-semibold">MB</span>
                          </div>

                          <Tooltip >
                            <TooltipTrigger asChild>
                            <BsFillQuestionCircleFill/>
                            </TooltipTrigger>
                            <TooltipContent>
                              Increasing this too far can cause crashes. Mobile users beware 
                            </TooltipContent>
                          </Tooltip>
                      </div>
                      <SliderThumbs 
                        id="newCache-size"
                        min={0}
                        max={1000}
                        value={[cacheSize / (1024 * 1024)]}
                        step={10}
                        onValueChange={e=>setCacheSize(maxSize+e[0]*(1024*1024))}
                    />
              </div>
              </>
            )
            }
            <div className="grid grid-cols-[auto_50%] gap-2 mt-2">
              <div>
                <label htmlFor="compress-data" className="inline-flex">Compress Data 
                <Tooltip >
                  <TooltipTrigger asChild>
                    <BsFillQuestionCircleFill/>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[min(100%,16rem)] break-words whitespace-normal">
                    Compress data to preserve memory at the expense of slightly longer load times
                  </TooltipContent>
                </Tooltip>  
                </label>
              </div>
              
              <Switch id="compress-data" checked={compress} onCheckedChange={e=>setCompress(e)}/>
            </div>
          </>}
      </>
      <div className="grid gap-2 mt-2">
        {cached &&
        <div>
          {cachedChunks ? 
            <b>{cachedChunks} chunks already cached. </b> :
            <b>This data is already cached. </b>
          } 
        </div>
        }
        {tooBig && 
          <div className="bg-[#FFBEB388] rounded-md p-1">
            <span className="text-xs font-medium text-red-800 dark:text-red-200">
              Not only will this certainly not fit in memory, but it also won&apos;t fit in a single shader call. You are wild for this one. Textures:  <b>{texCount}/14</b>
            </span>
          </div>
        }
        {!tooBig && <Button
          variant="pink"        
          className="cursor-pointer hover:scale-[1.05]"
          disabled={((is4D && idx4D == null) || smallCache)}
          onClick={() => {
            if (variable == meta.name){
              ReFetch();
            }
            else{
              setMaxSize(cacheSize)
              setVariable(meta.name)
              ReFetch();
            }
            setShowMeta(false)
            setOpenVariables(false)
          }}
        >
        Plot
        </Button>}
      </div>
  </>
  )
}

export default MetaDataInfo