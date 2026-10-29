"use client";
import React, { useState } from 'react'
import { Input, Button } from '@/components/ui'
import { useGlobalStore } from '@/stores/GlobalStore'
import { useZarrStore } from '@/stores/ZarrStore'
import { initializeStore } from '@/components/layout/StoreInitializer'
import { FetchOptions, IcechunkRef, Collapsible, FetchOpts, Format, DEFAULT_FETCH_OPTS, buildHeaders } from './FetchOptions'

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
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) return;
    const headers = buildHeaders(opts);
    const hasHeaders = Object.keys(headers).length > 0;
    if (hasHeaders && url.startsWith('http://')) {
      useGlobalStore.getState().setStatus('Error: Cannot send auth headers over plain HTTP — use HTTPS.');
      return;
    }
    const { maxRetries, retryDelay } = opts;

    useZarrStore.setState({
      fetchOptions: format === 'zarr' ? {
        maxRetries,
        retryDelay,
        ...(hasHeaders && {
          fetch: (request: Request) => {
            Object.entries(headers).forEach(([k, v]) => request.headers.set(k, v));
            return fetch(request);
          },
        }),
      } : null,
      icechunkOptions: format === 'icechunk' ? {
        [opts.refType]: opts.refValue,
        maxRetries,
        retryDelay,
        ...(hasHeaders && {
          fetchClient: {
            fetch: (input: string, init?: RequestInit) =>
              globalThis.fetch(input, { ...init, headers: { ...init?.headers, ...headers } }),
          },
        }),
      } : null,
      useNC: false,
      useGT: false,
    });
    useGlobalStore.getState().setStatus('Fetching...');
    setInitStore(url);
    initializeStore();
    onOpenDescription();
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 mt-2">
        <Input
          className="w-full"
          placeholder="Store URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <Button type="submit" variant="outline" className="cursor-pointer">
          Fetch
        </Button>
      </div>

      {fixedFormat === 'icechunk' ? (
        <IcechunkRef value={opts} onChange={setOpts} />
      ) : !fixedFormat && (
        // Expanding this section switches the fetch to Icechunk
        <Collapsible
          label={format === 'icechunk' ? `Icechunk · ${opts.refType}: ${opts.refValue || '—'}` : 'Icechunk store'}
          open={format === 'icechunk'}
          onToggle={open => setFormat(open ? 'icechunk' : 'zarr')}
        >
          <IcechunkRef value={opts} onChange={setOpts} />
        </Collapsible>
      )}

      <Collapsible label="Fetch options">
        <FetchOptions value={opts} onChange={setOpts} />
      </Collapsible>
    </form>
  )
}
