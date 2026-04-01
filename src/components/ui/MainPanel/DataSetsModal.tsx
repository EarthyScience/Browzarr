"use client";
import React, { useState } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ButtonGroup,
} from "@/components/ui/button-group";
import { Button } from "@/components/ui/button-enhanced";
import { DescriptionContent } from './DescriptionContent';
import CuratedDatasets from './CuratedDatasets';
import RemoteZarr from './RemoteZarr';
import LocalContent from './LocalContent';

type Tab = 'curated' | 'remote' | 'local';

const TABS: { value: Tab; label: string }[] = [
  { value: 'curated', label: 'Curated' },
  { value: 'remote',  label: 'Remote Zarr' },
  { value: 'local',   label: 'Local' },
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isSafari: boolean;
};

const DatasetsModal = ({ open, onOpenChange, isSafari }: Props) => {
  const [activeOption, setActiveOption] = useState<string>('');
  const [showDescription, setShowDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('curated');

  const { initStore, setInitStore, setOpenVariables } = useGlobalStore(
    useShallow(state => ({
      setInitStore: state.setInitStore,
      setOpenVariables: state.setOpenVariables,
      initStore: state.initStore,
    }))
  );

  const openDescription = () => setShowDescription(true);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setShowDescription(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Open Dataset</DialogTitle>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <p className="text-xs font-medium mb-2 uppercase tracking-wide">
            Open dataset
          </p>
          <ButtonGroup className="justify-between border-1 rounded-md">
            {TABS.map(({ value, label }) => (
              <Button
                key={value}
                className='cursor-pointer'
                variant={activeTab === value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange(value)}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        <div className="p-4 flex flex-col gap-1 -mt-3">
          {activeTab === 'curated' && (
            <CuratedDatasets
              activeOption={activeOption}
              setActiveOption={setActiveOption}
              setInitStore={setInitStore}
              onOpenDescription={openDescription}
            />
          )}
          {activeTab === 'remote' && (
            <RemoteZarr
              initStore={initStore}
              setInitStore={setInitStore}
              onOpenDescription={openDescription}
            />
          )}
          {activeTab === 'local' && (
            <LocalContent
              setInitStore={setInitStore}
              onOpenDescription={openDescription}
              isSafari={isSafari}
            />
          )}
          {showDescription && (
            <DescriptionContent
              setOpenVariables={setOpenVariables}
              onCloseDialog={() => {
                setShowDescription(false);
                onOpenChange(false);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DatasetsModal;