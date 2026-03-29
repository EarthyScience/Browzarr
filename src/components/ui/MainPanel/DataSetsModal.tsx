"use client";

import React, { useState } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { DescriptionContent } from './Shared';
import CuratedDatasets from './CuratedDatasets';
import RemoteZarr from './RemoteZarr';
import LocalContent from './LocalContent';

type Tab = 'curated' | 'remote' | 'local';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Open Dataset</DialogTitle>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <p className="text-xs font-medium mb-2 uppercase tracking-wide">
            Open dataset
          </p>
          {/* Tab strip */}
          <div className="flex gap-1">
            {(['curated', 'remote', 'local'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setShowDescription(false);
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-secondary font-medium'
                    : 'hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {tab === 'remote' ? 'Remote Zarr' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-1 mt-0">
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

          {/* Inline description panel */}
          {showDescription && (
            <div className="mt-3 pt-3 border-t border-border">
              <DescriptionContent
                setOpenVariables={setOpenVariables}
                onCloseDialog={() => {
                  setShowDescription(false);
                  onOpenChange(false);
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DatasetsModal;