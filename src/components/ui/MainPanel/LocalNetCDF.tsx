"use client";
import React, {ChangeEvent} from 'react'
import { Input } from '../input'
import { useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { NetCDF4 } from '@/components/netcdf-wasm';

interface LocalNCType {
  setShowLocal: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>;
}

const LocalNetCDF = ({setShowLocal, setOpenVariables}:LocalNCType) => {

    const {setStatus, setVariables, setZMeta, setInitStore} = useGlobalStore.getState()
    const {ncModule} = useZarrStore.getState()

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
        setStatus(null)
        return;
        }
        const file = files[0]
        if (ncModule) ncModule.close();
        setStatus("Loading...")
        const data = await NetCDF4.fromBlobLazy(file)
        const [variables, attrs, metadata] = await Promise.all([
          data.getVariables(),
          data.getGlobalAttributes(),
          data.getFullMetadata()
        ])
        console.log(variables, metadata, attrs)
        useGlobalStore.setState({variables: Object.keys(variables), zMeta: metadata, initStore:`local_${file.name}`})
        useZarrStore.setState({useNC: true, ncModule: data})
        const titleDescription = {
          title: attrs.title?? file.name,
          description: attrs.history?? ''
        }
        useGlobalStore.setState({titleDescription})
        
        setOpenVariables(true)
        setShowLocal(false)
        setStatus(null)
    };

  return (
    <div className='w-[100%]'>
        <Input type="file" id="filepicker"
          className='hover:drop-shadow-md hover:scale-[110%]'
          style={{width:'200px', cursor:'pointer'}}
          accept='.nc, .netcdf, .nc3, .nc4'
          onChange={handleFileSelect}
        />
    </div>
  )
}

export default LocalNetCDF
