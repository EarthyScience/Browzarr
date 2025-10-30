"use client";

import React, {ChangeEvent, useState, useEffect} from 'react'
import { Input } from '../input'
import { Dataset } from 'netcdf4-wasm';

const LocalNetCDF = () => {

  useEffect(() => {
  const loadNetCDFModule = async () => {
    try {
      const module = await import('netcdf4-wasm');
      console.log('netcdf4-wasm import:', module);

      // Try to find the factory function
      const factory = module.default || module.NetCDF4Module || module.Module || module;
      if (typeof factory === 'function') {
        // If it's a class, use new
        try {
          const instance = new factory({ wasmPath: '/netcdf4.wasm' });
          window.NetCDF4Module = instance;
          console.log('NetCDF4Module initialized:', instance);
        } catch (err) {
          console.error('Failed to instantiate NetCDF4Module:', err);
          window.NetCDF4Module = factory; // fallback
        }
      } else {
        window.NetCDF4Module = factory;
        console.log('NetCDF4Module assigned:', factory);
      }
    } catch (error) {
      console.error('Failed to load NetCDF module:', error);
    }
  };

  loadNetCDFModule();
}, []);

  const options = {
    wasmPath: '/netcdf4.wasm', // or full path
  };
    async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
      if (typeof window !== "undefined" && !window.NetCDF4Module) {
        console.log("No window.netcdf4module")
      }
      const file = e.target.files?.[0];
      if (file) {
        const path = file.webkitRelativePath
        const nc = await Dataset(file, "r");
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


export default LocalNetCDF