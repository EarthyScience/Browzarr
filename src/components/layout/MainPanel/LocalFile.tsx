"use client";
import React, {ChangeEvent, useState} from 'react'
import { Input } from '@/components/ui/input'
import { useGlobalStore } from '@/stores/GlobalStore';
import { loadNetCDF, NETCDF_EXT_REGEX } from '@/data/loaders/loadNetCDF';
import { saveFile } from '@/lib/IndexDB';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { isMobile } from '../MobileUIHider';
import { useZarrStore } from '@/stores/ZarrStore';
import { loadGeoTiff } from '@/data/loaders/loadGeoTiff';

interface LocalNCType {
  setOpenVariables: (open: boolean) => void;
}

const TIF_EXTENSIONS = ['.tif','.tiff','.geotiff','.gtif']

const LocalFile = ({ setOpenVariables}:LocalNCType) => {
    const {setStatus } = useGlobalStore.getState()
    // const {ncModule} = useZarrStore.getState()
    const [ncError, setError] = useState<string | null>(null);

	const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
		setError(null);
		const files = event.target.files;
		if (!files || files.length === 0) { setStatus(null); return; }
		const file = files[0];
    const isGeoTiff = TIF_EXTENSIONS.some(e => file.name.toLowerCase().includes(e))
    if (isGeoTiff){
      try{
        await loadGeoTiff(file);
        setOpenVariables(true)
      } catch (e) {
        setError("Failed to load file:")
      }
    } else{
      try {
        await loadNetCDF(file);
        const blobKey = `local_${file.name}`
        await saveFile(file, blobKey)
        useZarrStore.setState({blobKey})
        setOpenVariables(true)
      } catch (e) {
        setError(`Failed to load file: ${e instanceof Error ? e.message : String(e)}`);
      }
      };
    }
  return (
    <div className="w-full">
      <Input
        type="file"
        id="filepicker"
        className="w-full hover:drop-shadow-md hover:scale-[102%] cursor-pointer transition-all duration-100 ease-out"
        accept={isMobile() ? '' : '.nc,.netcdf,.nc3,.nc4,.tif,.tiff,.geotiff,.gtif'}
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

export default LocalFile
