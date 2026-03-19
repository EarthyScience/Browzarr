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

interface LocalNCType {
  setOpenVariables: (open: boolean) => void;
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
      setOpenVariables(true)

    } catch (e) {
      setError(`Failed to load file: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className='w-[100%]'>
        <Input type="file" id="filepicker"
          className='hover:drop-shadow-md hover:scale-[102%]'
          style={{width:'200px', cursor:'pointer'}}
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
