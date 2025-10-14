"use client";

import React, { SetStateAction, useEffect, useState, ReactNode } from 'react';
import { useGlobalStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Input } from '../input';
import { Button } from '../button';
import { TbDatabasePlus } from "react-icons/tb";
import LocalZarr from './LocalZarr';
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
  const [openDescription, setOpenDescription] = useState<boolean>(false)
  
  const { setInitStore } = useGlobalStore(
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
              setOpenDescription(true);
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
              setOpenDescription(true);
            }}
          >
            Seasfire
          </DatasetOption>

          <div className="w-full h-px bg-gray-300 my-2" />
          <p className="px-2 text-sm text-muted-foreground">Personal</p>
          <div className="w-full">
            <DatasetOption
              active={activeOption === 'remote'}
              onClick={() => {
                setShowStoreInput((prev) => !prev);
                setActiveOption('remote');
              }}
            >
              Remote
            </DatasetOption>
            {showStoreInput && (
              <form
                className="mt-2 flex items-center gap-2"
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements[0] as HTMLInputElement;
                  setInitStore(input.value);
                  if (input.value) {
                    setOpenDescription(true);
                  }
                }}
              >
                <Input className="w-full" placeholder="Store URL" />
                <Button type="submit" variant="outline" className='cursor-pointer'>
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
            {showLocalInput && (
              <div className="mt-2">
                <LocalZarr setShowLocal={setShowLocalInput} setOpenVariables={setOpenDescription} setInitStore={setInitStore} />
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
      <Dialog open={openDescription} onOpenChange={setOpenDescription}>
        <DialogTitle>{}</DialogTitle>
        <DialogContent data-meta-popover className="max-w-[85%] md:max-w-md max-h-[80vh] overflow-y-auto">
          <DescriptionContent setOpenVariables={setOpenVariables} />
        </DialogContent>
      </Dialog>
    </Popover>
  );
};

export default Dataset;
