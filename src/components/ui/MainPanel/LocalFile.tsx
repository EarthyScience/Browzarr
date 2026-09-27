"use client";
import React, {ChangeEvent, useState} from 'react'
import { Input } from '../input'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { loadNetCDF, NETCDF_EXT_REGEX } from '@/utils/loadNetCDF';
import { saveFile } from '@/utils/IndexDB';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { isMobile } from '../MobileUIHider';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import {fromArrayBuffer} from 'geotiff'

interface LocalNCType {
  setOpenVariables: (open: boolean) => void;
}



const LocalFile = ({ setOpenVariables}:LocalNCType) => {
    const {setStatus } = useGlobalStore.getState()
    // const {ncModule} = useZarrStore.getState()
    const [ncError, setError] = useState<string | null>(null);

	const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
		setError(null);
		const files = event.target.files;
		if (!files || files.length === 0) { setStatus(null); return; }
		const file = files[0];
    const arrBuff = await file.arrayBuffer()
    const geotiff = await fromArrayBuffer(arrBuff)
    const image = await geotiff.getImage()
    console.log(image.fileDirectory.toObject())
		if (!NETCDF_EXT_REGEX.test(file.name)) {
			setError('Please select a valid NetCDF (.nc, .netcdf, .nc3, .nc4) file.');
			return;
		}

		try {
			await loadNetCDF(file, file.name);
			const blobKey = `local_${file.name}`
			await saveFile(file, blobKey)
			useZarrStore.setState({blobKey})
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
