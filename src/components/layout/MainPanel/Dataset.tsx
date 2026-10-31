"use client";

import { Button } from '@/components/ui/button-enhanced';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from '@/components/ui/separator';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useEffect, useState } from 'react';
import { BsBoxArrowLeft, BsBoxArrowRight } from 'react-icons/bs';
import { TbDatabasePlus } from "react-icons/tb";
import { useShallow } from 'zustand/shallow';
import DatasetsModal from './DataSetsModal';
import { DatasetOption, DescriptionContent } from './DescriptionContent';
import LocalContent from './LocalContent';
import { PanelButton, usePanelSide } from './PanelButton';
import { RemoteDataset } from './RemoteDataset';

const Dataset = () => {
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [showLocalInput, setShowLocalInput] = useState(false);
  const popoverSide = usePanelSide();
  const [activeOption, setActiveOption] = useState<string>('');
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [openDatasetsModal, setOpenDatasetsModal] = useState<boolean>(false);

  const {setInitStore, setOpenVariables } = useGlobalStore(useShallow(s => ({
    setInitStore: s.setInitStore, setOpenVariables: s.setOpenVariables})));

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
          <PanelButton icon={<TbDatabasePlus className="size-8" />} tooltip="Select dataset" />
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
              className="cursor-pointer w-full justify-between gap-2 mb-1"
              onClick={() => setOpenDatasetsModal(true)}
            >
              {popoverSide !== 'top' && <BsBoxArrowLeft className="size-4" />}
              Explore Datasets
              {popoverSide === 'top' && <BsBoxArrowRight className="size-4" />}
            </Button>

            <div className="w-full">
              <DatasetOption
                active={activeOption === 'remote'}
                onClick={() => {
                  const opening = !showStoreInput || activeOption !== 'remote';
                  setShowStoreInput(opening);
                  setShowLocalInput(false);
                  setActiveOption('remote');
                  setShowDescription(false);
                }}
              >
                Remote
              </DatasetOption>
              {showStoreInput && (
                <RemoteDataset setInitStore={setInitStore} onOpenDescription={() => setShowDescription(true)} />
              )}
            </div>
            <Separator className='mt-2' />

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