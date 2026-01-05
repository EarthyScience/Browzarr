"use client";
import React, {ChangeEvent} from 'react'
import { Input } from '../input'
import { useGlobalStore } from '@/utils/GlobalStates';
import { Dataset, NetCDF4 } from '@/components/netcdf-wasm';

interface LocalNCType {
  setShowLocal: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>;
}

const LocalNetCDF = ({setShowLocal, setOpenVariables}:LocalNCType) => {

    const {setStatus} = useGlobalStore.getState()

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
        setStatus(null)
        return;
        }
        const file = files[0]
        const data = await NetCDF4.fromBlob(file, 'r')
        const variables = data.getVariables()
        const dims = data.getDims()
        const varInfo = data.getVariableInfo(0)
        // const varArray = data.getVariableArray(4)
        console.log(variables)
        console.log(dims)
        console.log(varInfo)
    };

  return (
    <div className='w-[100%]'>
        Under construction
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
