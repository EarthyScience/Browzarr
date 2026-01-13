"use client";
import React, {ChangeEvent, useState} from 'react'
import { Input } from '../input'
import { useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { NetCDF4 } from '@earthyscience/netcdf4-wasm';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { isMobile } from '../MobileUIHider';

interface LocalNCType {
  setShowLocal: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>;
}

const NETCDF_EXT_REGEX = /\.(nc|netcdf|nc3|nc4)$/i;

const LocalNetCDF = ({ setOpenVariables}:LocalNCType) => {
    const {setStatus } = useGlobalStore.getState()
    const {ncModule} = useZarrStore.getState()
    const [ncError, setError] = useState<string | null>(null);

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = event.target.files;
        if (!files || files.length === 0) {
        setStatus(null)
        return;
        }
        const file = files[0]
        // Manual validation (iOS-safe)
        if (!NETCDF_EXT_REGEX.test(file.name)) {
          setError('Please select a valid NetCDF (.nc, .netcdf, .nc3, .nc4) file.');
          return;
        }

        if (ncModule) ncModule.close();
        setStatus("Loading...")
        const data = await NetCDF4.fromBlobLazy(file)
        const [variables, attrs, metadata] = await Promise.all([
          data.getVariables(),
          data.getGlobalAttributes(),
          data.getFullMetadata()
        ])
        useGlobalStore.setState({variables: Object.keys(variables), zMeta: metadata, initStore:`local_${file.name}`})
        useZarrStore.setState({useNC: true, ncModule: data})
        const titleDescription = {
          title: attrs.title?? file.name,
          description: attrs.history?? ''
        }
        useGlobalStore.setState({titleDescription})
        
        setOpenVariables(true)
        // setShowLocal(false)
        setStatus(null)
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
