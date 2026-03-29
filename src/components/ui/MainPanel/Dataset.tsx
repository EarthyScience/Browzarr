"use client";

import React, { useEffect, useState } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { Button } from '../button';
import { TbDatabasePlus } from "react-icons/tb";
import { BsBoxArrowLeft } from "react-icons/bs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatasetOption, DescriptionContent } from './Shared';
import RemoteZarr from './RemoteZarr';
import LocalContent from './LocalContent';
import DatasetsModal from './DataSetsModal';

const Dataset = () => {
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [showLocalInput, setShowLocalInput] = useState(false);
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
  const [activeOption, setActiveOption] = useState<string>('');
  const [showDescriptionDialog, setShowDescriptionDialog] = useState<boolean>(false);
  const [openDescriptionPopover, setOpenDescriptionPopover] = useState<boolean>(false);
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

  const onOpenDescription = () => {
    if (popoverSide === 'top') {
      setShowDescriptionDialog(true);
    } else {
      setOpenDescriptionPopover(true);
    }
  };

  return (
    <>
      <Popover>
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

            {/* ── Open Datasets button ── */}
            <Button
              variant="outline"
              className="cursor-pointer w-full justify-start gap-2 mb-1"
              onClick={() => setOpenDatasetsModal(true)}
            >
              <BsBoxArrowLeft className="size-4" />
              Open Datasets
            </Button>

            <div className="w-full h-px bg-border my-1" />

            {/* ── Remote Zarr ── */}
            <div className="w-full">
              <DatasetOption
                active={activeOption === 'remote'}
                onClick={() => {
                  setShowStoreInput(prev => !prev);
                  setShowLocalInput(false);
                  setActiveOption('remote');
                }}
              >
                Remote Zarr
              </DatasetOption>
              {showStoreInput && (
                <div className="mt-2">
                  <RemoteZarr
                    initStore={initStore}
                    setInitStore={setInitStore}
                    onOpenDescription={onOpenDescription}
                  />
                </div>
              )}
            </div>

            {/* ── Local ── */}
            <div className="w-full">
              <DatasetOption
                active={activeOption === 'local'}
                onClick={() => {
                  setShowLocalInput(prev => !prev);
                  setShowStoreInput(false);
                  setActiveOption('local');
                }}
              >
                Local
              </DatasetOption>
              {showLocalInput && (
                <LocalContent
                  setShowLocal={setShowLocalInput}
                  setInitStore={setInitStore}
                  onOpenDescription={onOpenDescription}
                  isSafari={isSafari}
                />
              )}
            </div>

          </div>
        </PopoverContent>
      </Popover>

      {/* ── Description popover (desktop) ── */}
      {popoverSide === 'left' && (
        <Popover open={openDescriptionPopover} onOpenChange={setOpenDescriptionPopover}>
          <PopoverTrigger asChild>
            <div
              className="absolute -top-8"
              style={{
                left: ['local', 'remote'].includes(activeOption) ? -215 : -130,
              }}
            />
          </PopoverTrigger>
          <PopoverContent
            data-meta-popover
            side="left"
            align="start"
            className="max-h-[80vh] overflow-y-auto w-[300px]"
          >
            <DescriptionContent
              setOpenVariables={setOpenVariables}
              onCloseDialog={() => setOpenDescriptionPopover(false)}
            />
          </PopoverContent>
        </Popover>
      )}

      {popoverSide === 'top' && (
        <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
          <DialogContent
            data-meta-popover
            className="max-w-[85%] md:max-w-md max-h-[80vh] overflow-y-auto"
          >
            <DialogTitle className='sr-only'>Dataset Description</DialogTitle>
            <DescriptionContent
              setOpenVariables={setOpenVariables}
              onCloseDialog={() => setShowDescriptionDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <DatasetsModal
        open={openDatasetsModal}
        onOpenChange={setOpenDatasetsModal}
        isSafari={isSafari}
      />
    </>
  );
};

export default Dataset;