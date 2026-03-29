"use client";

import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { Button } from '@/components/ui/button-enhanced';
import { TbDatabasePlus } from "react-icons/tb";
import { BsBoxArrowLeft } from "react-icons/bs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DatasetOption, DescriptionContent } from './DescriptionContent';
import RemoteZarr from './RemoteZarr';
import LocalContent from './LocalContent';
import DatasetsModal from './DataSetsModal';

const Dataset = () => {
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [showLocalInput, setShowLocalInput] = useState(false);
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
  const [activeOption, setActiveOption] = useState<string>('');
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [openDatasetsModal, setOpenDatasetsModal] = useState<boolean>(false);

  const { initStore, setInitStore, setOpenVariables } = useGlobalStore(
    useShallow(state => ({
      setInitStore: state.setInitStore,
      setOpenVariables: state.setOpenVariables,
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
      // biome-ignore lint/suspicious/noExplicitAny: <any> to access vendor property
      const vendor = (navigator as any).vendor || '';
      const isSafariDetected =
        /safari/i.test(ua) &&
        !/chrome|crios|android|fxios|edg/i.test(ua) &&
        /apple/i.test(vendor);
      setTimeout(() => setIsSafari(isSafariDetected), 0);
    }
  }, []);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div>
            <Tooltip delayDuration={500}>
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

        <PopoverContent
          side={popoverSide}
          className="w-auto p-0"
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-meta-popover]')) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex flex-col items-start max-w-[220px] p-3 gap-1 w-auto">
            <Button
              variant="outline"
              className="cursor-pointer w-full justify-start gap-2 mb-1"
              onClick={() => setOpenDatasetsModal(true)}
            >
              <BsBoxArrowLeft className="size-4" />
              Explore Datasets
            </Button>

            <div className="w-full h-px bg-border my-1" />

            <div className="w-full">
              <DatasetOption
                active={activeOption === 'remote'}
                onClick={() => {
                  setShowStoreInput(prev => !prev);
                  setShowLocalInput(false);
                  setActiveOption('remote');
                  setShowDescription(false);
                }}
              >
                Remote Zarr
              </DatasetOption>
              {showStoreInput && (
                <div className="mt-2">
                  <RemoteZarr
                    initStore={initStore}
                    setInitStore={setInitStore}
                    onOpenDescription={() => setShowDescription(true)}
                  />
                </div>
              )}
            </div>

            <div className="w-full">
              <DatasetOption
                active={activeOption === 'local'}
                onClick={() => {
                  setShowLocalInput(prev => !prev);
                  setShowStoreInput(false);
                  setActiveOption('local');
                  setShowDescription(false);
                }}
              >
                Local
              </DatasetOption>
              {showLocalInput && (
                <LocalContent
                  setShowLocal={setShowLocalInput}
                  setInitStore={setInitStore}
                  onOpenDescription={() => setShowDescription(true)}
                  isSafari={isSafari}
                />
              )}
            </div>

            {showDescription && (
              <div className="mt-3 pt-3 border-t border-border w-full">
                <DescriptionContent
                  setOpenVariables={setOpenVariables}
                  onCloseDialog={() => {
                    setShowDescription(false);
                    setPopoverOpen(false);
                  }}
                  stack={true}
                />
              </div>
            )}

          </div>
        </PopoverContent>
      </Popover>

      <DatasetsModal
        open={openDatasetsModal}
        onOpenChange={setOpenDatasetsModal}
        isSafari={isSafari}
      />
    </>
  );
};

export default Dataset;