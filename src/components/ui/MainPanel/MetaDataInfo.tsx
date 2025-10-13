import React, { useState, useMemo, useEffect } from "react"
import { useAnalysisStore, useCacheStore, useGlobalStore, usePlotStore, useZarrStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { SliderThumbs } from "@/components/ui/SliderThumbs"
import { Button } from "@/components/ui/button"
import { Input } from "../input"
import { BsFillQuestionCircleFill } from "react-icons/bs";
import { parseLoc } from "@/utils/HelperFuncs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


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


const MetaDataInfo = ({ meta, setShowMeta, setOpenVariables }: { meta: any, setShowMeta: React.Dispatch<React.SetStateAction<boolean>>, setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>  }) => {
  const {is4D, idx4D, variable, initStore, setIs4D, setIdx4D, setVariable, setTextureArrayDepths} = useGlobalStore(useShallow(state => ({
    is4D: state.is4D,
    idx4D: state.idx4D,
    variable: state.variable,
    initStore: state.initStore,
    setIs4D: state.setIs4D,
    setIdx4D: state.setIdx4D,
    setVariable: state.setVariable,
    setTextureArrayDepths: state.setTextureArrayDepths
  })))
  const {dimArrays, dimNames, dimUnits} = meta.dimInfo
  const {maxSize, setMaxSize} = useCacheStore.getState()
  const [cacheSize, setCacheSize] = useState(maxSize)
  const { zSlice, ySlice, xSlice, reFetch, compress, setZSlice, setYSlice, setXSlice, setReFetch, setCompress } = useZarrStore(useShallow(state => ({
    reFetch: state.reFetch,
    zSlice: state.zSlice,
    ySlice: state.ySlice,
    xSlice: state.xSlice,
    compress: state.compress,
    setZSlice: state.setZSlice,
    setYSlice: state.setYSlice,
    setXSlice: state.setXSlice,
    setReFetch: state.setReFetch,
    setCompress: state.setCompress
  })))
  const cache = useCacheStore(state => state.cache)
  const {maxTextureSize, max3DTextureSize} = usePlotStore(useShallow(state => ({maxTextureSize: state.maxTextureSize, max3DTextureSize: state.max3DTextureSize})))
  const [tooBig, setTooBig] = useState(false)
  const [cached, setCached] = useState(false)
  const [cachedChunks, setCachedChunks] = useState<string | null>(null)

  const totalSize = useMemo(() => meta.totalSize ? meta.totalSize : 0, [meta])
  const zLength = useMemo(() => meta.shape ? meta.shape.length == 4 ? meta.shape[1] : meta.shape[0] : 0, [meta])
  const yLength = useMemo(() => meta.shape ? meta.shape.length == 4 ? meta.shape[2] : meta.shape[1] : 0, [meta])
  const xLength = useMemo(() => meta.shape ? meta.shape.length == 4 ? meta.shape[3] : meta.shape[2] : 0, [meta])
  const is3D = useMemo(() => meta.shape ? meta.shape.length == 3 : false, [meta])
  const hasTimeChunks = is4D ? meta.shape[1]/meta.chunks[1] > 1 : meta.shape[0]/meta.chunks[0] > 1
  const hasYChunks = is4D ? meta.shape[2]/meta.chunks[2] > 1 : meta.shape[1]/meta.chunks[1] > 1
  const hasXChunks = is4D ? meta.shape[3]/meta.chunks[3] > 1 : meta.shape[2]/meta.chunks[2] > 1
  const chunkIDs = useMemo(()=>ChunkIDs({xSlice, ySlice, zSlice}, meta.chunks, meta.shape, meta.shape.length == 4),[zSlice, xSlice, ySlice, meta])
  const isFlat = meta.shape.length == 2
  const currentSize = useMemo(() => {
    if (is3D) {
      const zFirst = zSlice[0] ?? 0;
      const zLast = zSlice[1] ?? zLength;
      const zSteps = zLast - zFirst;
      
      const xFirst = xSlice[0] ?? 0;
      const xLast = xSlice[1] ?? meta.shape[2];
      const xSteps = xLast - xFirst;
      
      const yFirst = ySlice[0] ?? 0;
      const yLast = ySlice[1] ?? meta.shape[1];
      const ySteps = yLast - yFirst;
      
      const xChunkSize = meta.chunks[2];
      const yChunkSize = meta.chunks[1];
      const zChunkSize = meta.chunks[0];
      
      const xChunksNeeded = Math.ceil(xSteps / xChunkSize);
      const yChunksNeeded = Math.ceil(ySteps / yChunkSize);
      const zChunksNeeded = Math.ceil(zSteps / zChunkSize);

      const zSize = zLast - zFirst;
      const ySize = yLast - yFirst;
      const xSize = xLast - xFirst;

      const zTexCount = zSize/(isFlat ? maxTextureSize : max3DTextureSize)
      const yTexCount = ySize/(isFlat ? maxTextureSize : max3DTextureSize)
      const xTexCount = xSize/(isFlat ? maxTextureSize : max3DTextureSize)
      if (zTexCount > 1 ||
          yTexCount > 1 ||
          xTexCount > 1){
            const arrayDepths = [zTexCount, yTexCount, xTexCount].map((val)=>Math.ceil(val))
            setTextureArrayDepths(arrayDepths)
      } else{ 
        setTextureArrayDepths([1,1,1])
      }
      return xChunksNeeded * yChunksNeeded * zChunksNeeded * meta.chunkSize;
    } else if (is4D) {
      const zFirst = zSlice[0] ?? 0;
      const zLast = zSlice[1] ?? zLength;
      const zSteps = zLast - zFirst;
      
      const xFirst = xSlice[0] ?? 0;
      const xLast = xSlice[1] ?? meta.shape[3];
      const xSteps = xLast - xFirst;
      
      const yFirst = ySlice[0] ?? 0;
      const yLast = ySlice[1] ?? meta.shape[2];
      const ySteps = yLast - yFirst;
      
      const xChunkSize = meta.chunks[3];
      const yChunkSize = meta.chunks[2];
      const zChunkSize = meta.chunks[1];
      
      const xChunksNeeded = Math.ceil(xSteps / xChunkSize);
      const yChunksNeeded = Math.ceil(ySteps / yChunkSize);
      const zChunksNeeded = Math.ceil(zSteps / zChunkSize);

      const zSize = zLast - zFirst;
      const ySize = yLast - yFirst;
      const xSize = xLast - xFirst;

      const zTexCount = zSize/maxTextureSize
      const yTexCount = ySize/maxTextureSize
      const xTexCount = xSize/maxTextureSize
      if (zTexCount > 1 ||
          yTexCount > 1 ||
          xTexCount > 1){
            const arrayDepths = [zTexCount, yTexCount, xTexCount].map((val)=>Math.ceil(val))
            setTextureArrayDepths(arrayDepths)
      } else{ 
        setTextureArrayDepths([1,1,1])
      }
      return xChunksNeeded * yChunksNeeded * zChunksNeeded * meta.chunkSize;
    } else {
      return 0;
    }
  }, [meta, zSlice, xSlice, ySlice, zLength, is3D, is4D]);
  
  const cachedSize = useMemo(()=>{
    const thisDtype = meta.dtype as string
    if (thisDtype.includes("32")){
      return currentSize / 2;
    } else if (thisDtype.includes("64")){
      return currentSize / 4;
    } else if (thisDtype.includes("8")){
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

  
  const chunkShape = meta.chunks
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
      // Don't put any more work in the landing page version. Since it won't be visible in the future
      // The logic here was to just get divs to be used later in a Card or Dialog component!
    <> 
      <div className="meta-info">
        <b>Long Name</b> <br/>
        {`${meta.long_name}`}<br/>
        <br/>
        <div className="grid grid-cols-2">
          <div>
            <b>Data Shape</b><br/> 
          {`[${formatArray(meta.shape)}]`}
          </div>
          <div>
            <b>Chunk Shape</b><br/> 
          {`[${formatArray(meta.chunks)}]`}
          </div>
        </div>
        
        <br/>
        {true && 
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
        {((is3D || idx4D != null) && !(cached && !cachedChunks)) &&
          <>
            {(hasTimeChunks || hasXChunks || hasYChunks ) && totalSize > 50e6 && (
              <>
              <span className="block text-center text-xl font-bold">Trim Data</span>
              <div className="grid gap-4 ">    
                {hasTimeChunks && <div className="grid gap-1">
                  <div className="flex justify-center">
                    <b>{dimNames[0] == "Default" ? 'Axis 0': dimNames[0] }</b>
                  </div>
                  <SliderThumbs
                    min={0}
                    max={zLength}
                    value={[zSlice[0] ? zSlice[0] : 0, zSlice[1] ? zSlice[1] : zLength]}
                    step={chunkShape[0]}
                    onValueChange={(values: number[]) => setZSlice([values[0], values[1]] as [number, number | null])}
                    
                  />
                  <div className="grid grid-cols-2">
                    <span >Min: <b>{parseLoc(dimArrays[0][zSlice[0]], dimUnits[0])}</b>  <br /> Index: 
                      <input className='w-[50px]' type="number" value={zSlice[0]} 
                        onChange={e=>setZSlice([parseInt(e.target.value), zSlice[1]])}
                        onBlur={e=>setZSlice([HandleCustomSteps(e.target.value,chunkShape[0]), zSlice[1]])}
                      />
                    </span>
                    <span >Max: <b>{parseLoc(dimArrays[0][zSlice[1] ? zSlice[1]-1 : zLength-1], dimUnits[0])}</b><br /> Index: 
                      <input className='w-[50px]' type="number" value={zSlice[1] ? zSlice[1] : zLength} 
                        onChange={e=>setZSlice([zSlice[0], parseInt(e.target.value)])}
                        onBlur={e=>setZSlice([zSlice[0], HandleCustomSteps(e.target.value,chunkShape[0])])}
                      />
                    </span>
                  </div>
                </div>  }
                {hasYChunks && <div className="grid gap-1">
                  <div className="flex justify-center">
                    <b>{dimNames[1] == "Default" ? 'Axis 1': dimNames[1] }</b>
                  </div>
                  <SliderThumbs
                    min={0}
                    max={yLength}
                    value={[ySlice[0] ? ySlice[0] : 0, ySlice[1] ? ySlice[1] : yLength]}
                    step={chunkShape[1]}
                    onValueChange={(values: number[]) => setYSlice([values[0], values[1]] as [number, number | null])}
                  />
                  <div className="grid grid-cols-2">
                    <span >Min: <b>{parseLoc(dimArrays[1][ySlice[0]], dimUnits[1])}</b>  <br /> Index: 
                      <input className='w-[50px]' type="number" value={ySlice[0]} 
                        onChange={e=>setYSlice([parseInt(e.target.value), ySlice[1]])}
                        onBlur={e=>setYSlice([HandleCustomSteps(e.target.value,chunkShape[1]), ySlice[1]])}
                      />
                    </span>
                    <span >Max: <b>{parseLoc(dimArrays[1][ySlice[1] ? ySlice[1]-1 : yLength-1], dimUnits[1])}</b><br /> Index: 
                      <input className='w-[50px]' type="number" value={ySlice[1] ? ySlice[1] : yLength} 
                        onChange={e=>setYSlice([ySlice[0] , parseInt(e.target.value)])}
                        onBlur={e=>setYSlice([ySlice[0], HandleCustomSteps(e.target.value,chunkShape[1])])}
                      />
                    </span>
                  </div>
                </div>  }
                {hasXChunks && <div className="grid gap-1">
                  <div className="flex justify-center">
                    <b>{dimNames[2] == "Default" ? 'Axis 2': dimNames[2] }</b>
                  </div>
                  <SliderThumbs
                    min={0}
                    max={xLength}
                    value={[xSlice[0] ? xSlice[0] : 0, xSlice[1] ? xSlice[1] : xLength]}
                    step={chunkShape[2]}
                    onValueChange={(values: number[]) => setXSlice([values[0], values[1]] as [number, number | null])}
                  />
                  <div className="grid grid-cols-2">
                    <span >Min: <b>{parseLoc(dimArrays[2][xSlice[0]], dimUnits[2])}</b>  <br /> Index: 
                      <input className='w-[50px]' type="number" value={xSlice[0]} 
                        onChange={e=>setXSlice([parseInt(e.target.value), xSlice[1]])}
                        onBlur={e=>setXSlice([HandleCustomSteps(e.target.value,chunkShape[2]), xSlice[1]])}
                      />
                    </span>
                    <span >Max: <b>{parseLoc(dimArrays[2][xSlice[1] ? xSlice[1]-1 : xLength-1], dimUnits[2])}</b><br /> Index: 
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
                      <div className="flex justify-center">
                        <p>Expand Cache: <b>{cacheSize/(1024*1024)}MB</b>
                          <Tooltip>
                            <TooltipTrigger>
                            <BsFillQuestionCircleFill/>
                            </TooltipTrigger>
                            <TooltipContent>
                              Increasing this too far can cause crashes. Mobile users beware 
                            </TooltipContent>
                          </Tooltip>
                        </p>
                      </div>
                      
                      <SliderThumbs 
                        id="newCache-size"
                        min={0}
                        max={1000}
                        step={10}
                        onValueChange={e=>setCacheSize(maxSize+e[0]*(1024*1024))}
                    />
              </div>
              </>
            )
            }
            <div className="grid grid-cols-[auto_40%] items-center gap-2 mt-2">
              <div>
              <label htmlFor="compress-data">Compress Data </label>
              <Tooltip>
                <TooltipTrigger>
                  <BsFillQuestionCircleFill/>
                </TooltipTrigger>
                <TooltipContent className="max-w-[min(100%,16rem)] break-words whitespace-normal">
                  Compress data to preserve memory at the expense of slightly longer load times
                </TooltipContent>
              </Tooltip>
              </div>
              
              <Input className="w-[50px]" type="checkbox" id="compress-data" checked={compress} onChange={e=>setCompress(e.target.checked)}/>
            </div>
          </>}
      </>}
      </div>
      {cached &&
      <div>
        {cachedChunks ? 
          <b>{cachedChunks} chunks already cached. </b> :
          <b>This data is already cached. </b>
        } 
      </div>
      }
      {false && 
        <div className="bg-[#FFBEB388] rounded-md p-1">
          <span className="text-xs font-medium text-red-800 dark:text-red-200">
            One or more of the dimensions in your dataset exceed this browsers maximum texture size: <b>{isFlat ? maxTextureSize : max3DTextureSize}</b>
          </span>
        </div>
      }
      {true && <Button
        variant="pink"
        size="sm"
        
        className="cursor-pointer hover:scale-[1.05]"
        disabled={((is4D && idx4D == null) || smallCache)}
        onClick={() => {
          if (variable == meta.name){
            setReFetch(!reFetch)
          }
          else{
            setMaxSize(cacheSize)
            setVariable(meta.name)
            setReFetch(!reFetch)
          }
          setShowMeta(false)
          setOpenVariables(false)
        }}
      >
      Plot
      </Button>}
  </>
  )
}

export default MetaDataInfo