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

const ZARR_STORES = {
  ESDC: 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr',
  SEASFIRE: 'https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr',
};

const Dataset = () => {
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
        <div
            role="button"
            tabIndex={0}
            aria-label="Select dataset"
            >
            <TbDatabasePlus className='panel-item' />
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
              setInitStore('local')
            }}
          >
            Local
          </Button>
          {showLocalInput && (
            <div className="mt-2">
              <LocalZarr setShowLocal={setShowLocalInput} />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Dataset;
