import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react'
import { useIsMobile } from '@/hooks';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge, Switch, Input, Hider, QuickTip, Button } from "@/components/ui";
import { defaultAttributes, renderAttributes } from "@/components/ui/MetaComponents/Helpers";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useShallow } from 'zustand/shallow';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { SliderThumbs } from "@/components/ui/Widgets/SliderThumbs";
import { BsFillQuestionCircleFill } from "react-icons/bs";
import { clearProjectionData } from '@/components/textures/ProjectionTexture';
import { SliderGroup, ArrayInfo } from '../MetaComponents';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

interface Dimfo {
  dimArrays: ArrayLike<number>[];
  dimNames: string[];
  dimUnits: (string | null)[];
}

interface DimContextProps {
    dimArrays: ArrayLike<number>[];
    dimNames: string[];
    dimUnits: (string | null)[];
    initOffset: number;
    setActiveDims: React.Dispatch<React.SetStateAction<number>>,
    setDeactiveDims: React.Dispatch<React.SetStateAction<number>>,
    removeSelectionDim: (dim: string) => void
}

const DimContext = createContext<DimContextProps | undefined>(undefined)

export function useDimContext() {
  const context = useContext(DimContext);
  if (context === undefined) {
    throw new Error('useDimContext must be used within an AppProvider');
  }
  return context;
}

type Props = {
  meta: {
    name?: string;
    shape?: number[];
    chunks?: number[];
    totalSize?: number;
    dtype?: string;
    long_name?: string;
    dimInfo?: Dimfo;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
};

function MetaInfo({
    selectionInfo,
    meta,
    cacheSize,
    setDataSize,
    setCacheSize
}: {
    selectionInfo: Record<string, any>;
    meta: Record<string, any>;
    cacheSize: number,
    setDataSize: React.Dispatch<React.SetStateAction<number>>;
    setCacheSize: React.Dispatch<React.SetStateAction<number>>;
}) {
    const initStore = useGlobalStore(s => s.initStore);
    const {cache, maxSize} = useCacheStore((s) => s);
    const {compress, coarsen, kernelSize, kernelDepth} = useZarrStore((s) => s);
    const {maxTextureSize, max3DTextureSize} = usePlotStore((s) => s);
    const dataShape = meta?.shape as number[] || [];
    const dtype = meta.totalSize ? Math.round(meta.totalSize/dataShape.reduce((a,b) => a * b, 1)) : 4;
    const sizeData = useMemo(()=>{
        let prod = 1;
        const sizes:number[] = [];
        // ---- Get total Size ----//
        Array.from(selectionInfo.values() as Iterable<{ plotDim:number, dataDim: number; start: number; stop: number }>).forEach((dimObj) => {
            const numKey = dimObj.plotDim;
            if (numKey >= 0){
                const size = Math.abs((dimObj.stop + 1)- dimObj.start)
                sizes.push(size)
                prod *= size
            }
        })
        // ---- Get Texture Counts ---- //
        const is2D = sizes.length == 2;
        const texSize = is2D ? maxTextureSize : max3DTextureSize;
        let texProd = 1;
        for (const size of sizes){
            const texCount = Math.ceil(size/texSize);
            texProd *= texCount;
        }
        // ---- Apply Coarsen ---- //
        if (coarsen){
            prod /= Math.pow(kernelSize,2)
            if (!is2D) prod /= kernelDepth
            prod = Math.round(prod)
        }
        
        return{
            size: prod * dtype, texCount:texProd
        }
    },[selectionInfo, coarsen, kernelSize, kernelDepth])

    const currentSize = sizeData.size;
    const texCount = sizeData.texCount;
    const tooBig = texCount > 12;
    const cachedSize = useMemo(() => {
        const cachedSize = currentSize * 2/dtype;
        setDataSize(cachedSize);
        return cachedSize;
    }, [currentSize, meta]);

    const smallCache = cachedSize > cacheSize;
    const [cachedChunks, setCachedChunks] = useState<string | null>(null);
    let cacheBase = `${initStore}_${meta.name}`;
    useEffect(() => {
        let newCached = false;
        let newCachedChunks: string | null = null;
        
        if (meta && meta.chunks && meta.shape) {
            const chunks = meta.chunks;
            const slices: Record<string, number>[] = Array.from({length: 3}).map(() => ({start: 0, end: 1}))
            Array.from(selectionInfo.values() as Iterable<{ plotDim:number, dataDim: number; start: number; stop: number }>).forEach((dimObj)=>{
                const numKey = dimObj.plotDim
                if (numKey < 0) return;
                const idx = dimObj.dataDim;
                const chunkSize = chunks[idx]
                slices[numKey] = {
                    start: Math.floor(dimObj.start/chunkSize), 
                    end: Math.ceil(dimObj.stop/chunkSize)
                }
            })
            const [zDim, yDim, xDim] = slices;
            let accum = 0;
            let total = 0;
            for (let z = zDim.start; z < zDim.end; z++) {
                for (let y = yDim.start; y < yDim.end; y++) {
                    for (let x = xDim.start; x < xDim.end; x++) {
                        total++;
                        if (cache.has(`${cacheBase}_chunk_z${z}_y${y}_x${x}`)) accum++;
                    }
                }
            }
            if (total > 0 && accum > 0) {
                newCachedChunks = `${accum}/${total}`;
                newCached = true;
            } else if (cache.has(`${initStore}_${meta.name}`)) {
                newCached = true;
            }
        } else if (meta && cache.has(`${initStore}_${meta.name}`)) {
            newCached = true;
        }
        setCachedChunks((prev) => (prev !== newCachedChunks ? newCachedChunks : prev));
      }, [meta, cache, initStore, selectionInfo]);

    return(
        <div className="flex flex-col gap-2">
        {/* Size info badge */}
        <div className="flex items-center gap-2 text-xs bg-background border px-2 py-1 rounded-md shadow-sm w-fit">
            <span className="text-muted-foreground">Raw:</span> <span className="font-medium">{formatBytes(currentSize)}</span>
            <span className="text-muted-foreground/50">|</span>
            <span className="text-muted-foreground">Stored:</span> <span className="font-medium">{compress ? "<" : ""}{formatBytes(cachedSize)}</span>
        </div>
        <ArrayInfo dataShape={meta?.shape} chunkShape={meta?.chunks}/>
        {/* Messages */}
        <div className="flex flex-col gap-1 text-xs">
            {tooBig && (
            <span className="font-medium text-destructive">
                Too many textures ({texCount}/12). Won&apos;t fit.
            </span>
            )}
            {cachedChunks && (
            <span className="font-medium text-muted-foreground">
                {`${cachedChunks} chunks already cached`}
            </span>
            )}
        </div>

        {/* Cache expand UI if needed */}
        {currentSize > maxSize && (
            <Alert variant={smallCache ? "destructive" : "default"} className="mt-2 w-full border-0">
            {smallCache ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            <AlertTitle>
                {smallCache ? "Selection won't fit in Cache" : "Data Will Fit"}
            </AlertTitle>
            <AlertDescription className="w-full min-w-0">
                <div className="flex flex-col gap-3 mt-1 w-full min-w-0">
                <span className="leading-none text-muted-foreground break-words">Decrease selection or expand cache size</span>
                <div className="flex items-center gap-4 w-full min-w-0">
                    <SliderThumbs
                    id="newCache-size"
                    min={200}
                    max={1200}
                    value={[cacheSize / (1024 * 1024)]}
                    step={10}
                    onValueChange={(e) => setCacheSize(e[0] * (1024 * 1024))}
                    className="flex-1 min-w-0"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                    <Input
                        className="w-[70px] h-[28px] text-xs no-spinner"
                        type="number"
                        min={200}
                        step={20}
                        value={cacheSize / (1024 * 1024)}
                        onChange={(e) => setCacheSize(parseInt(e.target.value) * (1024 * 1024))}
                    />
                    <span className="text-xs font-semibold">MB</span>
                    <QuickTip message='Increasing this too far can cause crashes. Mobile users beware'>
                        <BsFillQuestionCircleFill className="ml-1 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                        </QuickTip>
                    </div>
                </div>
                </div>
            </AlertDescription>
            </Alert>
        )}
        </div>
    )
}

export const MetaData = ({ meta, metadata }: Props) => {
    // --- STATES --- //
    const isMobile = useIsMobile();
    const { dimArrays, dimNames, dimUnits } = useMemo(() => ({
        dimArrays: (meta?.dimInfo?.dimArrays ?? []).map((a) => Array.from(a)),
        dimNames: meta?.dimInfo?.dimNames ?? [],
        dimUnits: (meta?.dimInfo?.dimUnits ?? []).map((u) => u ?? ''),
    }), [meta?.dimInfo]);
    const dataShape = meta?.shape || [];
    const dataLength = dataShape.length;
    const { setDimArrays, setDimNames, setDimUnits, setVariable, variable } = useGlobalStore(useShallow(s => s));
    const { maxSize, setMaxSize } = useCacheStore(useShallow(s => s))
    const { ReFetch, compress, setCompress, coarsen, setCoarsen, kernelSize, setKernelSize, kernelDepth, setKernelDepth } = useZarrStore(
    useShallow(s => s))
    const [cacheSize, setCacheSize] = useState(maxSize);
    const [dataSize, setDataSize] = useState(maxSize)
    // --- Coarsen Values --- //
    const [displaySpat, setDisplaySpat] = useState(String(kernelSize));
    const [displayDepth, setDisplayDepth] = useState(String(kernelDepth));
    // --- Selected Dim-Data --- //
    const [selectionInfo, setSelectionInfo] = useState<Map<string, any>>(new Map())
    const updateSelectionInfo = useCallback((dim: string, dimObj: Record<string,any> ) => {
        setSelectionInfo(prev => {
            const newSelectionInfo = new Map(prev)
            newSelectionInfo.set(dim, dimObj)
            return newSelectionInfo
        })
    },[setSelectionInfo])
    const removeSelectionDim = useCallback((dim: string) =>{
        setSelectionInfo(prev => {
            const newSelectionInfo = new Map(prev)
            newSelectionInfo.delete(dim)
            return newSelectionInfo
        })
    },[setSelectionInfo])
    const [deactiveDims, setDeactiveDims] = useState(Math.max(0, dataLength - 3))
    const [activeDims, setActiveDims] = useState(Math.min(dataLength, 3))
    const [collapsedOpen, setCollapsedOpen] = useState(false)
    // --- Context States --- //
    const initOffset = Math.max(0, dataLength - 3);
    const contextValue = useMemo(
        () => ({ dimArrays, dimNames, dimUnits, initOffset, setActiveDims, setDeactiveDims, removeSelectionDim }),
        [dimArrays, dimNames, dimUnits, initOffset, setActiveDims, setDeactiveDims, removeSelectionDim]
    );
    // --- Ready Checkers --- //
    const [duplicateWarning, setDuplicateWarning] = useState<string | undefined>()
    const smallCache = dataSize > cacheSize;
    useEffect(()=>{
        const dims = Array.from(selectionInfo.values()).map(obj => obj.dataDim)
        const duplicates = dims.filter((item, index) => dims.indexOf(item) !== index).map(val => dimNames[val]);
        if (duplicates.length) setDuplicateWarning(`${duplicates}`)
        else if(duplicateWarning) setDuplicateWarning(undefined)
    },[selectionInfo])
    // --- PLOT FUNCTION --- //
    function handlePlot(){
        setDimArrays(dimArrays);
        setDimNames(dimNames);
        setDimUnits(dimUnits);

        let ndSlices:[number, number][] = Array.from({length: dataLength})
        let axisIdices = Array.from({length: activeDims})
        Array.from(selectionInfo.values()).forEach((dimObj) => {
            const numKey = dimObj.plotDim
            const dimLoc = dimObj.dataDim
            if ( numKey >= 0 ) axisIdices[numKey] = dimLoc; 
            ndSlices[dimLoc] = [dimObj.start, dimObj.stop]
        })
        const axisMapping = {
            x: axisIdices.at(-1) as number, 
            y: axisIdices.at(-2) as number,
            z: axisIdices.at(-3) as number
        }
        useZarrStore.setState({ndSlices, axisMapping})
        if (variable === meta.name) {
            ReFetch();
        } else {
            setMaxSize(cacheSize);
            setVariable(meta.name || '');
            clearProjectionData()
            ReFetch();
        }
    }
    return (
        <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-col gap-4 mb-2 min-w-0">
                <div className="flex flex-col gap-3 w-full min-w-0">
                    <div className="flex items-center gap-2">
                        <b className="text-base">{`${meta.long_name ?? meta.name ?? ''} `}</b>
                        {isMobile ? (
                            <Dialog>
                            <DialogTrigger className="cursor-pointer" asChild>
                                <Badge variant="default" className="block">Attributes</Badge>
                            </DialogTrigger>
                            <DialogContent className="metadata-dialog">
                                <DialogHeader>
                                <DialogTitle>Attributes</DialogTitle>
                                <DialogDescription className="sr-only">Metadata Information for variable</DialogDescription>
                                </DialogHeader>
                                <div className="max-h-[60vh] text-[12px] overflow-y-auto break-words p-0">
                                <div className="grid grid-cols-1 md:grid-cols-[max-content_1fr] gap-x-1 gap-y-[6px]">
                                    {renderAttributes(metadata, defaultAttributes)}
                                </div>
                                </div>
                            </DialogContent>
                            </Dialog>
                        ) : (
                            <Popover>
                            <PopoverTrigger className="cursor-pointer" asChild>
                                <Badge variant="default" className="block">Attributes</Badge>
                            </PopoverTrigger>
                            <PopoverContent
                                data-meta-popover
                                className="w-[300px] max-h-[50vh] overflow-y-auto"
                                align="center"
                            >
                                {renderAttributes(metadata, defaultAttributes)}
                            </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm w-full min-w-0">
                        <div className="flex items-center gap-2">
                            <label htmlFor="coarsen" className="font-semibold cursor-pointer">Coarsen</label>
                            <Switch id="coarsen" className='cursor-pointer' checked={coarsen} onCheckedChange={(e) => setCoarsen(e)} />
                        </div>

                        <div className="flex items-center gap-2">
                            <label htmlFor="compress-data" className="font-semibold cursor-pointer flex items-center">
                            Compress
                            <QuickTip message='Compress data to preserve memory at the expense of slightly longer load times'>
                                <BsFillQuestionCircleFill className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            </QuickTip>
                            </label>
                            <Switch id="compress-data" className='cursor-pointer' checked={compress} onCheckedChange={(e) => setCompress(e)} />
                        </div>

                        <div className="flex items-center justify-end ml-auto min-w-0">
                            <Button
                                disabled={smallCache || Boolean(duplicateWarning)}
                                variant={'pink'}
                                className="cursor-pointer hover:scale-[1.05] shadow-sm h-8 px-4"
                                onClick={handlePlot}
                            >
                            Plot
                            </Button>
                        </div>
                    </div>
                    <MetaInfo selectionInfo={selectionInfo} cacheSize={cacheSize} setCacheSize={setCacheSize} setDataSize={setDataSize} meta={meta} />
                </div>
                <Hider show={coarsen}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 bg-background p-3 rounded-md border text-sm">
                    <div
                        className="flex items-center justify-between sm:justify-start sm:gap-4"
                        style={{ visibility: dataShape.length >= 3 ? 'visible' : 'hidden' }}
                    >
                        <span className="font-semibold">Temporal Coarsening</span>
                        <div className="flex items-center gap-2">
                        <Input
                            type='number'
                            min='0'
                            step={1}
                            value={displayDepth}
                            className="w-16 h-8 text-center"
                            onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setDisplayDepth(e.target.value);
                            setKernelDepth(Math.pow(2, val));
                            }}
                        />
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                        <span className="font-semibold">Spatial Coarsening</span>
                        <div className="flex items-center gap-2">
                            <Input
                                type='number'
                                min='0'
                                step={1}
                                value={displaySpat}
                                className="w-16 h-8 text-center"
                                onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setDisplaySpat(e.target.value);
                                setKernelSize(Math.pow(2, val));
                                }}
                            />
                        </div>
                    </div>
                    <div className="col-span-1 sm:col-span-2 text-xs text-muted-foreground/70 italic sm:text-center mt-1">
                        Values represent 2ⁿ
                    </div>
                    </div>
                </Hider>
            </div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground/80">Active Dimensions</h3>
            </div>
            <div className='warn-box' style={{display: duplicateWarning ? '' : 'none'}}>
                <b>{duplicateWarning}</b> set to multiple dimensions
            </div>
            <DimContext.Provider value={contextValue} >
                <SliderGroup dimCount={activeDims} collapsed={false} canShrink={activeDims == 3} updateSelectionInfo={updateSelectionInfo}/>
                <div className="mt-6 mb-2" style={{display: deactiveDims ? '' : 'none'}}>
                    <button
                    onClick={() => setCollapsedOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        {collapsedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        Collapsed dimensions
                    <span className="ml-1 text-muted-foreground/60 text-xs font-normal bg-muted px-1.5 py-0.5 rounded-full">{deactiveDims}</span>
                    </button>
                    <Hider show={collapsedOpen} className='ml-4'>
                        <SliderGroup dimCount={deactiveDims} collapsed={true} canShrink={activeDims < 3} updateSelectionInfo={updateSelectionInfo}/>
                    </Hider>
                </div>
                
            </DimContext.Provider>
        </div>
    )
}


