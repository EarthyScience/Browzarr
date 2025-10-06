"use client";

import React, { SetStateAction, useEffect, useState } from 'react';
import { useGlobalStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Input } from '../input';
import { Button } from '../button';
// import { CgDatabase } from "react-icons/cg";
import { TbDatabasePlus } from "react-icons/tb";
import LocalZarr from './LocalZarr';
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const ZARR_STORES = {
  ESDC: 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr',
  SEASFIRE: 'https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr',
};

const DescriptionContent = ({setOpenVariables}:{setOpenVariables : React.Dispatch<SetStateAction<boolean>>}) => {
  const {titleDescription} = useGlobalStore(useShallow(state => ({
    titleDescription: state.titleDescription
  })))
  const {title, description} = titleDescription
  return (
    <div className='grid gap-1'>
      <div className='mb-2'>
        <b>Title</b>
        <h1>
          {title ? title : "No Title"}
        </h1>
        <b>Description</b>
        <p>{description ? description : "No Description"}</p>
      </div>
      <div className='flex justify-center my-2'>
        <Button
        variant={"default"}
        className='cursor-pointer mt-[-20px]'
        onClick={e=>setOpenVariables(true)}
        >Variables</Button>
      </div>
    </div>
  )
}

const Dataset = ({setOpenVariables} : {setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>}) => {
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [showLocalInput, setShowLocalInput] = useState(false);
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
  const [activeOption, setActiveOption] = useState<string>('ESDC')
  const [openDescription, setOpenDescription] = useState<boolean>(false)
  
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
    <Popover >
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
            {popoverSide === "left" ? (
              <TooltipContent side="left" align="start">
                <span>Select dataset</span>
              </TooltipContent>
            ) : (
              <TooltipContent side="top" align="center">
                <span>Select dataset</span>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        className="flex flex-col items-start max-w-[220px] p-3 gap-3 w-auto mb-1"
      >
        <p >Curated</p>
        <Popover >
          <PopoverTrigger asChild 
            onClick={() => {
              setShowStoreInput(false);
              setShowLocalInput(false);
              setActiveOption('ESDC')
              setInitStore(ZARR_STORES.ESDC);
            }}
          >
            <Button
              variant={activeOption === 'ESDC' ? "default" : "ghost"}
              className='cursor-pointer mt-[-20px]'
            >
              ESDC
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="flex flex-col items-start max-w-[300px] p-3 gap-3 w-auto mb-1"
            side={'left'}
          >
              <DescriptionContent setOpenVariables={setOpenVariables} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
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
          </PopoverTrigger>
          <PopoverContent side='left'>
            <DescriptionContent setOpenVariables={setOpenVariables} />
          </PopoverContent>
        </Popover>
        
        <div className="w-full h-px bg-gray-300" />
        <p >Personal</p>
        <div>
          <Button
            variant={activeOption === 'remote' ? "default" : "ghost"}
            className='cursor-pointer mt-[-20px]'
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
              <Button type="submit" variant="outline" className='cursor-pointer'>
                Fetch
              </Button>
            </form>
          )}
        </div>
        <Popover open={openDescription} onOpenChange={setOpenDescription} >
          <PopoverAnchor> 
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
                  <LocalZarr setShowLocal={setShowLocalInput} setOpenVariables={setOpenDescription} setInitStore={setInitStore} />
                </div>
              )}
            </div>
          </PopoverAnchor>
          <PopoverContent 
            className="flex flex-col items-start max-w-[300px] p-3 gap-3 w-auto mb-1"
            side={'left'}
          >
            <DescriptionContent setOpenVariables={setOpenVariables} />
          </PopoverContent>
        </Popover>
      </PopoverContent>
    </Popover>
  );
};

export default Dataset;
