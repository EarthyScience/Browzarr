"use client";

import React, { SetStateAction, useEffect, useState, ReactNode } from 'react';
import { useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Input } from '../input';
import { Button } from '../button';
import { TbDatabasePlus } from "react-icons/tb";
import { TbVariable } from "react-icons/tb";
import LocalZarr from './LocalZarr';
import LocalNetCDF from './LocalNetCDF';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switcher } from '../Switcher';

const ZARR_STORES = {
  ESDC: 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr',
  SEASFIRE: 'https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr',
};

const DescriptionContent = ({
  setOpenVariables,
  onCloseDialog,
}: {
  setOpenVariables: React.Dispatch<SetStateAction<boolean>>;
  onCloseDialog: () => void;
}) => {
  const {titleDescription} = useGlobalStore(useShallow(state => ({
    titleDescription: state.titleDescription
  })))
  const {title, description} = titleDescription
  return (
    <div className='grid gap-1'>
      <div className='mb-2'>
        <h1 className="text-lg font-bold break-all">
          {title ? title : "Store"}
        </h1>
        <p className="whitespace-pre-wrap break-words"
          style={{ overflowWrap: 'anywhere' }}
          >
            {description ? description : "No Description"}
        </p>
      </div>
      <div className='flex justify-center my-2'>
        <Button
        variant={"default"}
        className='cursor-pointer mt-[-20px]'
        onClick={() => {
          setOpenVariables(true);
          onCloseDialog();
        }}
        >
          Open Variables 
          <TbVariable className="size-8" />
        </Button>
      </div>
    </div>
  )
}

const DatasetOption = ({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) => {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      className='cursor-pointer w-full justify-start'
      onClick={onClick}
    >
      {children}
    </Button>
  );
};


const Dataset = ({setOpenVariables} : {setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>}) => {
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [showLocalInput, setShowLocalInput] = useState(false);
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
  const [activeOption, setActiveOption] = useState<string>('ESDC')
  const [showDescriptionDialog, setShowDescriptionDialog] = useState<boolean>(false)
  const [openDescriptionPopover, setOpenDescriptionPopover] = useState<boolean>(false)
  const [isSafari, setIsSafari] = useState<boolean>(false)
  const {useNC} = useZarrStore(useShallow(state => ({
    useNC:state.fetchNC
  })))
  
  const { initStore, setInitStore } = useGlobalStore(
    useShallow((state) => ({
      setInitStore: state.setInitStore,
      initStore: state.initStore,
    }))
  );

  useEffect(() => {
    const handleResize = () => {
      setPopoverSide(window.innerWidth < 768 ? "top" : "left");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      const vendor = (navigator as any).vendor || '';
      const isSafariDetected = /safari/i.test(ua) && !/chrome|crios|android|fxios|edg/i.test(ua) && /apple/i.test(vendor);
      setTimeout(() => {
        setIsSafari(isSafariDetected);
      }, 0);
    }
  }, []);
  console.log(activeOption)
  return (
    <>
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <Tooltip delayDuration={500} >
            <TooltipTrigger asChild>
              <div>
                <Button
                  tabIndex={0}
                  variant="ghost"
                  size="icon"
                  className='cursor-pointer hover:scale-90 transition-transform duration-100 ease-out'
                  aria-label="Select dataset"
                  >
                  <TbDatabasePlus className="size-8" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side={popoverSide === "left" ? "left" : "top"}
              align={popoverSide === "left" ? "start" : "center"}
            >
              <span>Select dataset</span>
            </TooltipContent>
          </Tooltip>
        </div>

      </PopoverTrigger>
      <PopoverContent side={popoverSide} className="w-auto p-0"
        onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              // If the click is inside the MetaData popover, do not close
              if (target.closest('[data-meta-popover]')) {
                e.preventDefault();
              }
            }}
        >
        <div className="flex flex-col items-start max-w-[220px] p-3 gap-1 w-auto">
          <p className="px-2 text-sm text-muted-foreground">Curated</p>
          <DatasetOption
            active={activeOption === 'ESDC'}
            onClick={() => {
              setShowStoreInput(false);
              setShowLocalInput(false);
              setActiveOption('ESDC');
              setInitStore(ZARR_STORES.ESDC);
              if (popoverSide === 'top') {
                setShowDescriptionDialog(true);
              } else {
                setOpenDescriptionPopover(true);
              }
            }}
          >
            ESDC
          </DatasetOption>
          <DatasetOption
            active={activeOption === 'seasfire'}
            onClick={() => {
              setShowStoreInput(false);
              setShowLocalInput(false);
              setActiveOption('seasfire');
              setInitStore(ZARR_STORES.SEASFIRE);
              if (popoverSide === 'top') {
                setShowDescriptionDialog(true);
              } else {
                setOpenDescriptionPopover(true);
              }
            }}
          >
            Seasfire
          </DatasetOption>

          <div className="w-full h-px bg-gray-300 my-2" />
          <div className="w-full">
            <DatasetOption
              active={activeOption === 'remote'}
              onClick={() => {
                setShowStoreInput((prev) => !prev);
                setShowLocalInput(false);
                setActiveOption('remote');
              }}
            >
              Remote Zarr
            </DatasetOption>
            {showStoreInput && (
              <form
                className="mt-2 flex items-center gap-2"
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements[0] as HTMLInputElement;
                  if (initStore != input.value){
                    setInitStore(input.value);
                  } else {
                    useGlobalStore.getState().setStatus(null)
                  }
                  
                  if (input.value) {
                    if (popoverSide === 'top') {
                      setShowDescriptionDialog(true);
                    } else {
                      setOpenDescriptionPopover(true);
                    }
                  }
                }}
              >
                <Input className="w-full" placeholder="Store URL" />
                <Button type="submit" variant="outline" className='cursor-pointer'
                  onClick={()=>useGlobalStore.getState().setStatus("Fetching...")}
                >
                  Fetch
                </Button>
              </form>
            )}
          </div>
          <div className="w-full">
            <DatasetOption
              active={activeOption === 'local'}
              onClick={() => {
                setShowLocalInput((prev) => !prev);
                setShowStoreInput(false);
                setActiveOption('local');
              }}
            >
              Local
            </DatasetOption>
            {showLocalInput && 
              <div className="mt-2">
                <>
                  <Switcher leftText='Zarr' rightText='NetCDF' state={!useNC} onClick={()=>useZarrStore.setState({fetchNC:!useNC})} />
                  {
                    useNC ? 
                    <LocalNetCDF setShowLocal={setShowLocalInput} setOpenVariables={popoverSide === 'top' ? setShowDescriptionDialog : setOpenDescriptionPopover} />
                    : isSafari ? 
                      <div className="p-3 rounded-md border border-yellow-600 text-tiny max-w-[300px]">
                        <strong>Local folder upload is not supported in Safari.</strong> Please use Chrome, Firefox, or Edge instead.
                      </div>
                    : 
                    <LocalZarr setShowLocal={setShowLocalInput} setOpenVariables={popoverSide === 'top' ? setShowDescriptionDialog : setOpenDescriptionPopover} setInitStore={setInitStore} />
                  }
                </>
              </div>
            }
          </div>
        </div>
      </PopoverContent>
    </Popover>
      {popoverSide === 'left' && (
        <Popover open={openDescriptionPopover} onOpenChange={setOpenDescriptionPopover}>
          <PopoverTrigger asChild>
            {/* This is an invisible trigger, positioned relative to the main panel */}
            <div
              className="absolute -top-8"
              style={{
                left: ['local', 'remote'].includes(activeOption) ? -215 : -130,
              }}
            />
          </PopoverTrigger>
          <PopoverContent data-meta-popover side="left" align="start" className="max-h-[80vh] overflow-y-auto w-[300px]">
            <DescriptionContent
              setOpenVariables={setOpenVariables}
              onCloseDialog={() => setOpenDescriptionPopover(false)}
            />
          </PopoverContent>
        </Popover>
      )}
      {popoverSide === 'top' && (
        <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
          <DialogContent data-meta-popover className="max-w-[85%] md:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogTitle className='sr-only'>Dataset Description</DialogTitle>
            <DescriptionContent
              setOpenVariables={setOpenVariables}
              onCloseDialog={() => setShowDescriptionDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Dataset;
