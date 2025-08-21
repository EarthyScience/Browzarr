import React, { useState, useMemo, useEffect } from "react"
import { useGlobalStore, useZarrStore } from '@/utils/GlobalStates'
import { useShallow } from 'zustand/shallow'
import { SliderThumbs } from "@/components/ui/SliderThumbs"
import { Card } from "@/components/ui/card"
// import { Button } from "./button"
import { Button } from "@/components/ui/button"
import { Input } from "../input"
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



const MetaDataInfo = ({ meta, setShowMeta }: { meta: any, setShowMeta: React.Dispatch<React.SetStateAction<boolean>> }) => {
  const {is4D, idx4D, variable, setIs4D, setIdx4D, setVariable} = useGlobalStore(useShallow(state => ({
    is4D: state.is4D,
    idx4D: state.idx4D,
    variable: state.variable,
    setIs4D: state.setIs4D,
    setIdx4D: state.setIdx4D,
    setVariable: state.setVariable,
  })))
  const { slice, reFetch, setSlice, setReFetch } = useZarrStore(useShallow(state => ({
    reFetch: state.reFetch,
    slice: state.slice,
    setSlice: state.setSlice,
    setReFetch: state.setReFetch
  })))

  const totalSize = useMemo(() => meta.totalSize ? meta.totalSize : 0, [meta])
  const length = useMemo(() => meta.shape ? meta.shape.length == 4 ? meta.shape[1] : meta.shape[0] : 0, [meta])
  const is3D = useMemo(() => meta.shape ? meta.shape.length == 3 : false, [meta])
  const hasTimeChunks = is4D ? meta.shape[1]/meta.chunks[1] > 1 : meta.shape[0]/meta.chunks[0] > 1
  const currentSize = useMemo(() => {
    if (is3D){
      const firstStep = slice[0] ? slice[0] : 0
      const secondStep = slice[1] ? slice[1] : length
      const timeSteps = secondStep - firstStep
      const xChunks = meta.shape[2] / meta.chunks[2]
      const yChunks = meta.shape[1] / meta.chunks[1]
      const timeChunkSize = xChunks * yChunks * meta.chunkSize
      const chunkTimeStride = meta.chunks ? meta.chunks[0] : 1
      return Math.ceil(timeSteps / chunkTimeStride) * timeChunkSize
    }else if(is4D){
      const firstStep = slice[0] ? slice[0] : 0
      const secondStep = slice[1] ? slice[1] : length
      const timeSteps = secondStep - firstStep
      const xChunks = meta.shape[3] / meta.chunks[3]
      const yChunks = meta.shape[2] / meta.chunks[2]
      const timeChunkSize = xChunks * yChunks * meta.chunkSize
      const chunkTimeStride = meta.chunks ? meta.chunks[1] : 1
      return Math.ceil(timeSteps / chunkTimeStride) * timeChunkSize
    }else{return 0;}
  }, [meta, slice])

  useEffect(()=>{
    const this4D = meta.shape.length == 4;
    setIs4D(this4D);
  })

  useEffect(()=>{
    setSlice([0,null]);
    setIdx4D(null)
  },[meta])

  return (
    <Card className="meta-container max-w-sm md:max-w-md p-4 mb-4 border border-muted select-none">
      <div className="meta-info">
         <b>Long Name</b> <br/>
                {`${meta.long_name}`}<br/>
                    <br/>
                    <b>Shape</b><br/> 
                    {`[${formatArray(meta.shape)}]`}<br/>
                    <br/>
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
        {(is3D || idx4D != null) &&
          <>
            {totalSize > 1e8 && hasTimeChunks && (
              <>
                <div className="flex justify-center">
                  <b>Select Data Range</b>
                </div>
                <div className="w-full flex flex-col justify-between">
                  <SliderThumbs
                    min={0}
                    max={length}
                    value={[slice[0] ? slice[0] : 0, slice[1] ? slice[1] : length]}
                    step={1}
                    onValueChange={(values: number[]) => setSlice([values[0], values[1]] as [number, number | null])}
                  />
                  <div className="flex justify-between text-xs mt-4">
                    <span>Min: <br /> <input className='w-[50px]' type="number" value={slice[0]} onChange={e=>setSlice([parseInt(e.target.value), slice[1]])}/></span>
                    <span>Max: <br /> <input className='w-[50px] text-right' type="number" value={slice[1] ? slice[1] : length} onChange={e=>setSlice([slice[0] , parseInt(e.target.value)])}/></span>
                  </div>
                </div>
              </>
            )}
            <b>Total Size: </b>{formatBytes(currentSize)}<br />
            {currentSize < 1e8 && (
              <span className="bg-green-500 rounded px-2 py-1">Selected data will fit in memory</span>
            )}
            {currentSize > 1e8 && currentSize < 2e8 && (
              <span className="bg-yellow-500 rounded px-2 py-1">Data may not fit in memory</span>
            )}
            {currentSize > 2e8 && (
              <span className="bg-red-400 rounded px-2 py-1">Data will not fit in memory</span>
            )}
          </>
        }
      </div>
      <Button
        variant="pink"
        size="sm"
        className="cursor-pointer hover:scale-[1.05]"
        disabled={(is4D && idx4D == null)}
        onClick={() => {
          if (variable == meta.name){
            setReFetch(!reFetch)
          }
          else{
            setVariable(meta.name)
          }
          setShowMeta(false)
        }}
      >
        Plot
      </Button>
    </Card>
  )
}

export default MetaDataInfo