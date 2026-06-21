"use client";
import React, { useState } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button-enhanced";
import { DescriptionContent } from './DescriptionContent';
import StoreCatalog from './StoreCatalog';
import { ZARR_CATALOG, ICECHUNK_CATALOG } from "@/assets/index";
import RemoteZarr from './RemoteZarr';
import LocalContent from './LocalContent';
import RemoteIcechunk from './RemoteIcechunk';

type Tab = 'remote' | 'local' | 'icechunk';

const TABS: { value: Tab; label: string }[] = [
  { value: 'remote',   label: 'Remote Zarr' },
  { value: 'icechunk', label: 'Icechunk'    },
  { value: 'local',    label: 'Local'       },
];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  remote: 'Browse and open remote Zarr stores via URL or from the catalog.',
  icechunk: 'Connect to versioned Icechunk stores for transactional data access.',
  local: 'Open a Zarr dataset stored on your local filesystem.',
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isSafari: boolean;
};

const DatasetsModal = ({ open, onOpenChange, isSafari }: Props) => {
  const [activeOption, setActiveOption] = useState<string>('');
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [selectedIcechunkUrl, setSelectedIcechunkUrl] = useState<string>('');
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('remote');

  const { initStore, setInitStore, setOpenVariables, status } = useGlobalStore(
    useShallow(state => ({
      setInitStore: state.setInitStore,
      setOpenVariables: state.setOpenVariables,
      initStore: state.initStore,
      status: state.status,
    }))
  );

  const showDescription = hasFetched && status === null;
  const openDescription = () => setHasFetched(true);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setHasFetched(false);
    setSelectedUrl('');
    setSelectedIcechunkUrl('');
    setActiveOption('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedUrl('');
      setSelectedIcechunkUrl('');
      setActiveOption('');
      setHasFetched(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Open dataset</DialogTitle>
          <DialogDescription>{TAB_DESCRIPTIONS[activeTab]}</DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-4 pb-3 border-b border-border">
          {!showDescription && (
            <>
              <p className="text-xs font-medium mb-2 uppercase tracking-wide text-muted-foreground">
                Open dataset
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {TAB_DESCRIPTIONS[activeTab]}
              </p>
              </>
          )}
          <ButtonGroup className="justify-between border rounded-md">
            {TABS.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                className="cursor-pointer"
                variant={activeTab === value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange(value)}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        <div className="p-4 flex flex-col gap-1 -mt-4">
          {activeTab === 'remote' && (
            <>
              <StoreCatalog
                catalog={ZARR_CATALOG}
                placeholder="Search Zarr Stores..."
                gradient="zarr"
                activeOption={activeOption}
                setActiveOption={setActiveOption}
                setInitStore={setSelectedUrl}
              />
              <RemoteZarr
                key={selectedUrl}
                initStore={initStore}
                setInitStore={setInitStore}
                onOpenDescription={openDescription}
                selectedUrl={selectedUrl}
              />
            </>
          )}
          {activeTab === 'local' && (
            <LocalContent
              setInitStore={setInitStore}
              onOpenDescription={openDescription}
              isSafari={isSafari}
            />
          )}
          {activeTab === 'icechunk' && (
            <>
              <StoreCatalog
                catalog={ICECHUNK_CATALOG}
                placeholder="Search Icechunk Stores..."
                gradient="icechunk"
                activeOption={activeOption}
                setActiveOption={setActiveOption}
                setInitStore={setSelectedIcechunkUrl}
              />
              <RemoteIcechunk
                key={selectedIcechunkUrl}
                setInitStore={setInitStore}
                onOpenDescription={openDescription}
                selectedUrl={selectedIcechunkUrl}
              />
            </>
          )}
          {showDescription && (
            <DescriptionContent
              setOpenVariables={setOpenVariables}
              onCloseDialog={() => {
                setHasFetched(false);
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