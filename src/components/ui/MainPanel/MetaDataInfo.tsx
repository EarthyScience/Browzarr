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



const MetaDataInfo = ({ meta, setShowMeta, noCard = false }: { meta: any, setShowMeta: React.Dispatch<React.SetStateAction<boolean>>, noCard?: boolean }) => {
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
    <>
      {noCard ? (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Variable Information</h3>
            <p className="text-sm text-muted-foreground">Detailed metadata and configuration options</p>
          </div>

          {/* Basic Info Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Long Name</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                {meta.long_name}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Shape</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md font-mono">
                [{formatArray(meta.shape)}]
              </p>
            </div>
          </div>

          {/* 4D Dataset Section */}
          {is4D && (
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">4D Dataset Configuration</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This is a Four-Dimensional Dataset. You must select an index along the first dimension.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Select index (0 to {meta.shape[0]-1}):
                </label>
                <Input 
                  type="number" 
                  min={0} 
                  max={meta.shape[0]-1} 
                  value={String(idx4D)} 
                  onChange={e=>setIdx4D(parseInt(e.target.value))}
                  className="max-w-32"
                />
              </div>
            </div>
          )}

          {/* Data Range Section */}
          {(is3D || idx4D != null) && (
            <div className="space-y-4">
              {totalSize > 1e8 && hasTimeChunks && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <h4 className="text-sm font-medium text-orange-900 dark:text-orange-100">Data Range Selection</h4>
                  <p className="text-xs text-orange-800 dark:text-orange-200">
                    Large dataset detected. Select a time range to reduce memory usage.
                  </p>
                  <div className="space-y-3">
                    <SliderThumbs
                      min={0}
                      max={length}
                      value={[slice[0] ? slice[0] : 0, slice[1] ? slice[1] : length]}
                      step={1}
                      onValueChange={(values: number[]) => setSlice([values[0], values[1]] as [number, number | null])}
                    />
                    <div className="flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <label className="font-medium"> Min: </label>
                        <input 
                          className='w-16 px-2 py-1 rounded border border-orange-300 dark:border-orange-600 bg-background text-foreground' 
                          type="number" 
                          value={slice[0]} 
                          onChange={e=>setSlice([parseInt(e.target.value), slice[1]])}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium"> Max: </label>
                        <input 
                          className='w-16 px-2 py-1 rounded border border-orange-300 dark:border-orange-600 bg-background text-foreground text-right' 
                          type="number" 
                          value={slice[1] ? slice[1] : length} 
                          onChange={e=>setSlice([slice[0] , parseInt(e.target.value)])}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Memory Usage Section */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium text-foreground">Memory Usage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Size:</span>
                    <span className="text-sm font-medium">{formatBytes(currentSize)}</span>
                  </div>
                  
                  <div className="mt-3">
                    {currentSize < 1e8 && (
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                          Selected data will fit in memory
                        </span>
                      </div>
                    )}
                    {currentSize > 1e8 && currentSize < 2e8 && (
                      <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded-md border border-orange-200 dark:border-orange-800">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-xs font-medium text-orange-800 dark:text-orange-200">
                          Data may not fit in memory
                        </span>
                      </div>
                    )}
                    {currentSize > 2e8 && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-xs font-medium text-red-800 dark:text-red-200">
                          Data will not fit in memory
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              variant="pink"
              size="sm"
              className="cursor-pointer hover:scale-[1.02] transition-transform"
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
              Plot Variable
            </Button>
          </div>
        </div>
      ) : (
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
      )}
    </>
  )
}

export default MetaDataInfo