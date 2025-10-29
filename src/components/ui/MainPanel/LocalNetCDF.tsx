"use client";
import React, {ChangeEvent} from 'react'
import { Input } from '../input'
import { NetCDF4 } from '../../../../node_modules/netcdf4-wasm'

const LocalNetCDF = () => {

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]
    if (file) { 
      const path = file.webkitRelativePath
      const nc = await new NetCDF4(path, "r");
      console.log(nc)

    }

    console.log(file)
  }

  return (
    <div>
        <Input type="file" id="filepicker"
          className='hover:drop-shadow-md hover:scale-[110%]'
          style={{width:'200px', cursor:'pointer'}}
          onChange={handleFileSelect}
        />
    </div>
  )
}

export default LocalNetCDF