"use client";
import React, { useState } from 'react';
import { useGlobalStore } from '@/stores/GlobalStore';
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
import StoreCatalog, { CatalogEntry, GradientPreset } from './StoreCatalog';
import { ZARR_CATALOG, ICECHUNK_CATALOG, NETCDF_CATALOG, GEOTIFF_CATALOG } from "@/data/catalogs";
import { RemoteDataset } from './RemoteDataset';
import { Format } from './FetchOptions';
import LocalContent from './LocalContent';

type RemoteTab = 'remote' | 'icechunk' | 'netcdf' | 'geotiff';
type Tab = RemoteTab | 'local';

const TABS: { value: Tab; label: string }[] = [
  { value: 'remote',   label: 'Zarr'     },
  { value: 'icechunk', label: 'Icechunk' },
  { value: 'netcdf',   label: 'NetCDF'   },
  { value: 'geotiff',  label: 'GeoTIFF'  },
  { value: 'local',    label: 'Local'    },
];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  remote: 'Browse and open remote Zarr stores via URL or from the catalog.',
  icechunk: 'Connect to versioned Icechunk stores for transactional data access.',
  netcdf: 'Browse remote NetCDF files. (Coming soon)',
  geotiff: 'Browse remote GeoTIFF / COG files. (Coming soon)',
  local: 'Open a Zarr dataset stored on your local filesystem.',
};

// format: null marks a placeholder catalog with no remote loader yet
const REMOTE_SOURCES: Record<RemoteTab, {
  catalog: CatalogEntry[];
  placeholder: string;
  gradient: GradientPreset;
  format: Format | null;
}> = {
  remote:   { catalog: ZARR_CATALOG,     placeholder: 'Search Zarr Stores...',     gradient: 'zarr',     format: 'zarr'     },
  icechunk: { catalog: ICECHUNK_CATALOG, placeholder: 'Search Icechunk Stores...', gradient: 'icechunk', format: 'icechunk' },
  netcdf:   { catalog: NETCDF_CATALOG,   placeholder: 'Search NetCDF Files...',    gradient: 'netcdf',   format: null       },
  geotiff:  { catalog: GEOTIFF_CATALOG,  placeholder: 'Search GeoTIFF Files...',   gradient: 'geotiff',  format: null       },
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isSafari: boolean;
};

const DatasetsModal = ({ open, onOpenChange, isSafari }: Props) => {
  const [activeOption, setActiveOption] = useState<string>('');
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('remote');
  const remoteSource = activeTab === 'local' ? null : REMOTE_SOURCES[activeTab];

  const { setInitStore, setOpenVariables, status } = useGlobalStore(useShallow(s => ({
    setInitStore: s.setInitStore, setOpenVariables: s.setOpenVariables, status: s.status
  })));

  const showDescription = hasFetched && status === null;
  const openDescription = () => setHasFetched(true);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setHasFetched(false);
    setSelectedUrl('');
    setActiveOption('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedUrl('');
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
          {remoteSource && (
            <>
              <StoreCatalog
                key={activeTab}
                catalog={remoteSource.catalog}
                placeholder={remoteSource.placeholder}
                gradient={remoteSource.gradient}
                activeOption={activeOption}
                setActiveOption={setActiveOption}
                setInitStore={setSelectedUrl}
              />
              {remoteSource.format && (
                <RemoteDataset
                  key={`${activeTab}-${selectedUrl}`}
                  format={remoteSource.format}
                  inlineOptions
                  setInitStore={setInitStore}
                  onOpenDescription={openDescription}
                  selectedUrl={selectedUrl}
                />
              )}
            </>
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