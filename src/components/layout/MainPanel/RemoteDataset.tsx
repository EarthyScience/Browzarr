"use client";
import React, { useState } from 'react'
import { Input, Button } from '@/components/ui'
import { useGlobalStore } from '@/stores/GlobalStore'
import { useZarrStore } from '@/stores/ZarrStore'
import { initializeStore } from '@/components/layout/StoreInitializer'
import { FetchOptions, Collapsible, FetchOpts, Format, DEFAULT_FETCH_OPTS, buildFetchOptions } from './FetchOptions'
import { IcechunkOptions, IcechunkOpts, DEFAULT_ICECHUNK_OPTS, buildIcechunkOptions } from './IcechunkOptions'

type Props = {
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
  selectedUrl?: string;
  format?: Format; // fixed format hides the format switch
};


const test_url = "https://s3.amazonaws.com/noaa-goes16/ABI-L1b-RadC/2017/242/00/OR_ABI-L1b-RadC-M3C01_G16_s20172420002168_e20172420004540_c20172420004583.nc"
export const RemoteDataset = ({ setInitStore, onOpenDescription, selectedUrl = '', format: fixedFormat }: Props) => {
  const [url, setUrl] = useState(selectedUrl)
  const [format, setFormat] = useState<Format>(fixedFormat ?? 'zarr')
  const [opts, setOpts] = useState<FetchOpts>(DEFAULT_FETCH_OPTS)
  const [icOpts, setIcOpts] = useState<IcechunkOpts>(DEFAULT_ICECHUNK_OPTS)
  const handleSubmit = () => {
    if (!url) return;
    const fetchOptions = buildFetchOptions(opts);
    if (Object.keys(fetchOptions.headers ?? {}).length > 0 && url.startsWith('http://')) {
      useGlobalStore.getState().setStatus('Error: Cannot send auth headers over plain HTTP — use HTTPS.');
      return;
    }
    useZarrStore.setState({
      fetchOptions: format === 'zarr' ? fetchOptions : null,
      icechunkOptions: format === 'icechunk' ? { ...fetchOptions, ...buildIcechunkOptions(icOpts) } : null,
      useNC: false,
      useGT: false,
    });
    useGlobalStore.getState().setStatus('Fetching...');
    setInitStore(url);
    initializeStore();
    onOpenDescription();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mt-2">
        <Input
          className="w-full"
          placeholder="Store URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <Button onClick={handleSubmit} variant="outline" className="cursor-pointer">
          Fetch
        </Button>
      </div>

      {fixedFormat === 'icechunk' ? (
        <IcechunkOptions value={icOpts} onChange={setIcOpts} />
      ) : !fixedFormat && (
        // Expanding this section switches the fetch to Icechunk
        <Collapsible
          label={format === 'icechunk' ? `Icechunk · ${icOpts.refType}: ${icOpts.refValue || '—'}` : 'Icechunk store'}
          open={format === 'icechunk'}
          onToggle={open => setFormat(open ? 'icechunk' : 'zarr')}
        >
          <IcechunkOptions value={icOpts} onChange={setIcOpts} />
        </Collapsible>
      )}

      <Collapsible label="Fetch options">
        <FetchOptions value={opts} onChange={setOpts} />
      </Collapsible>
    </div>
  )
}
