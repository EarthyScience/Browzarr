"use client";
import React, { useState } from 'react'
import { Input, Button } from '@/components/ui'
import { useGlobalStore } from '@/stores/GlobalStore'
import { useZarrStore } from '@/stores/ZarrStore'
import { initializeStore } from '@/components/layout/StoreInitializer'
import { FetchOptions, FetchOpts, Format, DEFAULT_FETCH_OPTS, buildFetchOptions } from './FetchOptions'
import { buildIcechunkOptions, DEFAULT_ICECHUNK_OPTS } from './IcechunkOptions'

type Props = {
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
  selectedUrl?: string;
  format?: Format; // fixed format hides the format switch
  inlineOptions?: boolean; // render fetch options inline instead of in a popover
};

export const RemoteDataset = ({ setInitStore, onOpenDescription, selectedUrl = '', format: fixedFormat, inlineOptions = false }: Props) => {
	const [url, setUrl] = useState(selectedUrl)
	const [opts, setOpts] = useState<FetchOpts>(DEFAULT_FETCH_OPTS)
	const handleSubmit = () => {
		if (!url) return;
		const fetchOptions = buildFetchOptions(opts);
		if (Object.keys(fetchOptions.headers ?? {}).length > 0 && url.startsWith('http://')) {
			useGlobalStore.getState().setStatus('Error: Cannot send auth headers over plain HTTP — use HTTPS.');
			return;
		}
		useZarrStore.setState({
		fetchOptions,
		icechunkOptions: opts.iceOpts 
			? { ...fetchOptions, ...buildIcechunkOptions(opts.iceOpts) } 
			: fixedFormat === "icechunk"
				? { ...fetchOptions, ...buildIcechunkOptions(DEFAULT_ICECHUNK_OPTS) } 
				:null,
		useNC: false,
		useGT: false,
		});
		useGlobalStore.getState().setStatus('Fetching...');
		setInitStore(url);
		initializeStore();
		onOpenDescription();
  	};

  return (
    <div className="flex flex-col gap-1 pt-2">
      <Input
        className="w-full"
        placeholder="Store URL"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
      <Button onClick={handleSubmit} variant="outline" className="cursor-pointer h-6">
        Fetch
      </Button>
      <FetchOptions value={opts} onChange={setOpts} inline={inlineOptions} />
    </div>
  )
}
