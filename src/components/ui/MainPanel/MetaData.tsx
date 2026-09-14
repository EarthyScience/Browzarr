import React, { useState, useEffect, useMemo, createContext, useContext } from 'react'
import { useIsMobile } from '@/hooks';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge, Switch, Input, Hider, QuickTip, Button } from "@/components/ui";
import { defaultAttributes, renderAttributes } from "@/components/ui/MetaData";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { parseLoc } from '@/utils/HelperFuncs';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useShallow } from 'zustand/shallow';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { SliderThumbs } from "@/components/ui/Widgets/SliderThumbs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BsFillQuestionCircleFill } from "react-icons/bs";
import { clearProjectionData } from '@/components/textures/ProjectionTexture';
import { SliderGroup } from '../MetaComponents/SliderGroup';

interface Dimfo {
  dimArrays: ArrayLike<number>[];
  dimNames: string[];
  dimUnits: (string | null)[];
}

interface DimContextProps {
    dimArrays: ArrayLike<number>[];
    dimNames: string[];
    dimUnits: (string | null)[];
    setActiveDims: React.Dispatch<React.SetStateAction<number>>,
    setDeactiveDims: React.Dispatch<React.SetStateAction<number>>
}

const DimContext = createContext<DimContextProps | undefined>(undefined)

export function useDimContext() {
  const context = useContext(DimContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
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

export const MetaData = ({ meta, metadata }: Props) => {
    const isMobile = useIsMobile();
    const { dimArrays, dimNames, dimUnits } = useMemo(() => ({
        dimArrays: (meta?.dimInfo?.dimArrays ?? []).map((a) => Array.from(a)),
        dimNames: meta?.dimInfo?.dimNames ?? [],
        dimUnits: (meta?.dimInfo?.dimUnits ?? []).map((u) => u ?? ''),
    }), [meta?.dimInfo]);
    const dataShape = meta?.shape || [];
    const dataLength = dataShape.length;
    const chunkShape = meta?.chunks || [];

    const { setDimArrays, setDimNames, setDimUnits, setVariable, variable } = useGlobalStore(useShallow(s => s));

    const { maxSize, setMaxSize } = useCacheStore(useShallow(s => s))
    const { ndSlices, axisMapping, ReFetch, compress, setCompress, coarsen, setCoarsen, kernelSize, setKernelSize, kernelDepth, setKernelDepth } = useZarrStore(
    useShallow(s => s))
    const [cacheSize, setCacheSize] = useState(maxSize);
    const [dataSize, setDataSize] = useState(maxSize)

    // --- Coarsen Values --- //
    const [displaySpat, setDisplaySpat] = useState(String(kernelSize));
    const [displayDepth, setDisplayDepth] = useState(String(kernelDepth));

    const [selectionInfo, setSelectionInfo] = useState<Record<number, any>>({})

    const [deactiveDims, setDeactiveDims] = useState(Math.max(0, dataLength - 3))
    const [activeDims, setActiveDims] = useState(Math.min(dataLength, 3))
    const [collapsedOpen, setCollapsedOpen] = useState(false)

    const contextValue = useMemo(
        () => ({ dimArrays, dimNames, dimUnits, setActiveDims, setDeactiveDims }),
        [dimArrays, dimNames, dimUnits, setActiveDims, setDeactiveDims]
    );

    function handlePlot(){
        setDimArrays(dimArrays);
        setDimNames(dimNames);
        setDimUnits(dimUnits);

        let ndSlices = Array.from({length: dataLength})
        

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
                            //   disabled={smallCache}
                            variant={'pink'}
                            className="cursor-pointer hover:scale-[1.05] shadow-sm h-8 px-4"
                            //   onClick={handlePlot}
                            >
                            Plot
                            </Button>
                        </div>
                    </div>
                    {/* 
                    <MetaStatusBadges
                    meta={meta}
                    availableDims={availableDims}
                    cacheSize={cacheSize}
                    setCacheSize={setCacheSize}
                    setDataSize={setDataSize}
                    /> */}
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
            <DimContext.Provider value={contextValue} >
                <SliderGroup dimCount={activeDims} collapsed={false} canShrink={activeDims == 3} setSelectionInfo={setSelectionInfo}/>
                <div className="mt-6 mb-2">
                      <button
                        onClick={() => setCollapsedOpen((o) => !o)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {collapsedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        Collapsed dimensions
                        <span className="ml-1 text-muted-foreground/60 text-xs font-normal bg-muted px-1.5 py-0.5 rounded-full">{deactiveDims}</span>
                      </button>
                
                      {collapsedOpen && (
                        <div className='ml-4'>
                            <SliderGroup dimCount={deactiveDims} collapsed={true} canShrink={activeDims <= 3} setSelectionInfo={setSelectionInfo}/>
                        </div>
                      )}
                    </div>
                
            </DimContext.Provider>
        </div>
    )
}


