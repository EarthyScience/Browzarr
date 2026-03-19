"use client";
import React, {ChangeEvent, useState} from 'react'
import { Input } from '../input'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { NetCDF4 } from '@earthyscience/netcdf4-wasm';
import { loadNetCDF, NETCDF_EXT_REGEX } from '@/utils/loadNetCDF';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { isMobile } from '../MobileUIHider';

interface LocalNCType {
  setShowLocal: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenVariables: (open: boolean) => void;
}

// const NETCDF_EXT_REGEX = /\.(nc|netcdf|nc3|nc4)$/i;

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
    await loadNetCDF(file, file.name, setOpenVariables);
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
