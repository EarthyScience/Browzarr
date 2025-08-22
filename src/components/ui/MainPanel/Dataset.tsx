"use client";

import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Input } from '../input';
import { Button } from '../button';
// import { CgDatabase } from "react-icons/cg";
import { TbDatabasePlus } from "react-icons/tb";
import LocalZarr from './LocalZarr';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const ZARR_STORES = {
  ESDC: 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr',
  SEASFIRE: 'https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr',
};

const Dataset = ({setOpenVariables} : {setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>}) => {
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [showLocalInput, setShowLocalInput] = useState(false);
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
  const [activeOption, setActiveOption] = useState<string>('ESDC')
  
  const { setInitStore, setVariable } = useGlobalStore(
    useShallow((state) => ({
      setInitStore: state.setInitStore,
      setVariable: state.setVariable,
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                tabIndex={0}
                variant="ghost"
                size="icon"
                className='cursor-pointer hover:scale-90 transition-transform duration-100 ease-out'
                aria-label="Select dataset"
                >
                <TbDatabasePlus className="size-8" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="flex flex-col">
              <span>Open <strong>dataset</strong> from:</span>
              <span className="ml-1">• ESDC (Earth System Data Cube)</span>
              <span className="ml-1">• Seasfire Dataset</span>
              <span className="ml-1">• <strong>Remote</strong> or <strong>Local Storage</strong></span>
            </TooltipContent>
          </Tooltip>
        </div>

      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        className="flex flex-col items-start max-w-[220px] p-3 gap-3 w-auto mb-1"
      >
        <Button
          variant={activeOption === 'ESDC' ? "default" : "ghost"}
          className='cursor-pointer'
          onClick={() => {
            setShowStoreInput(false);
            setShowLocalInput(false);
            setActiveOption('ESDC')
            setInitStore(ZARR_STORES.ESDC);
            setOpenVariables(true)
          }}
        >
          ESDC
        </Button>
        <Button
          variant={activeOption === 'seasfire' ? "default" : "ghost"}
          className='cursor-pointer'
          onClick={() => {
            setShowStoreInput(false);
            setShowLocalInput(false);
            setActiveOption('seasfire')
            setInitStore(ZARR_STORES.SEASFIRE);
            setOpenVariables(true)
          }}
        >
          Seasfire
        </Button>
        <div>
          <Button
            variant={activeOption === 'remote' ? "default" : "ghost"}
            className='cursor-pointer'
            onClick={() => {
              setShowLocalInput(false);
              setActiveOption('remote')
              setShowStoreInput((prev) => !prev);
            }}
          >
            Remote
          </Button>
          {showStoreInput && (
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const input = e.currentTarget.elements[0] as HTMLInputElement;
                setInitStore(input.value);
                setOpenVariables(true)
              }}
            >
              <Input className="w-[100px]" placeholder="Store URL" />
              <Button type="submit" variant="outline">
                Fetch
              </Button>
            </form>
          )}
        </div>
        <div>
          <Button
            variant={activeOption === 'local' ? "default" : "ghost"}
            className='cursor-pointer'
            onClick={() => {
              setShowLocalInput((prev) => !prev);
              setShowStoreInput(false);
              setActiveOption('local')
            }}
          >
            Local
          </Button>
          {showLocalInput && (
            <div className="mt-2">
              <LocalZarr setShowLocal={setShowLocalInput} setOpenVariables={setOpenVariables} />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Dataset;
