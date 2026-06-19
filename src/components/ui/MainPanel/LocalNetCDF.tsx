"use client";
import React, {ChangeEvent, useState} from 'react'
import { Input } from '../input'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { loadNetCDF, NETCDF_EXT_REGEX } from '@/utils/loadNetCDF';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { isMobile } from '../MobileUIHider';
import { useZarrStore } from '@/GlobalStates/ZarrStore';

interface LocalNCType {
  setOpenVariables: (open: boolean) => void;
}

const DB_NAME = 'browzarr-files';
const STORE = 'blobs';

export function openDB(): Promise<IDBDatabase> { // This will store File Blobs on disk for re-opening NetCDFs from searchParams.  
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

const LocalNetCDF = ({ setOpenVariables}:LocalNCType) => {
    const {setStatus } = useGlobalStore.getState()
    // const {ncModule} = useZarrStore.getState()
    const [ncError, setError] = useState<string | null>(null);

	const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
		setError(null);
		const files = event.target.files;
		if (!files || files.length === 0) { setStatus(null); return; }
		const file = files[0];
		if (!NETCDF_EXT_REGEX.test(file.name)) {
			setError('Please select a valid NetCDF (.nc, .netcdf, .nc3, .nc4) file.');
			return;
		}
		try {
			await loadNetCDF(file, file.name);
			const db = await openDB();
			const key = `local_${file.name}`
			new Promise((res, rej) => {
				const tx = db.transaction(STORE, 'readwrite');
				tx.objectStore(STORE).put({ file, key }, key);
				tx.oncomplete = () => {
					res(key);
					useZarrStore.setState({ncBlobKey:key})
				};
				tx.onerror = () => rej(tx.error);
			});
			setOpenVariables(true)
		} catch (e) {
			setError(`Failed to load file: ${e instanceof Error ? e.message : String(e)}`);
		}
  	};

  return (
    <div className="w-full">
      <Input
        type="file"
        id="filepicker"
        className="w-full hover:drop-shadow-md hover:scale-[102%] cursor-pointer transition-all duration-100 ease-out"
        accept={isMobile() ? '' : '.nc,.netcdf,.nc3,.nc4'}
        onChange={handleFileSelect}
      />
        {ncError && (
        <Alert variant="destructive" className='border-0 mt-1'>
          <AlertTitle>Hey!</AlertTitle>
          <AlertDescription>
            {ncError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default LocalNetCDF
