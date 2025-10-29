"use client";
import React, {ChangeEvent} from 'react'
import { Input } from '../input'
import dynamic from 'next/dynamic';


const LocalNetCDF = dynamic(async () => {
  const { Dataset, setNetCDF4WasmPath } = await import('netcdf4-wasm');

  // Define a React component that uses Dataset
  function Component() {
    async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (file) {
        const path = file.webkitRelativePath
        const nc = Dataset(path, "r");
        console.log(nc)
      }
    }

    return (
      <div>
        <Input
          type="file"
          id="filepicker"
          className="hover:drop-shadow-md hover:scale-[110%]"
          style={{ width: '200px', cursor: 'pointer' }}
          onChange={handleFileSelect}
        />
      </div>
    );
  }
  // Return the component type, not JSX
  return Component;
}, { ssr: false });


export default LocalNetCDF