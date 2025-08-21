"use client";
import React, {useState, useEffect, ChangeEvent} from 'react'
import * as zarr from 'zarrita'
import { useZarrStore, useGlobalStore } from '@/utils/GlobalStates';
import { Input } from '../input';
import ZarrParser from '@/components/zarr/ZarrParser';

const LocalZarr = ({setShowLocal, setOpenVariables}:{setShowLocal: React.Dispatch<React.SetStateAction<boolean>>, setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>}) => {
  const setCurrentStore = useZarrStore(state => state.setCurrentStore)

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }
    // Create a Map to hold the Zarr store data
    const store = new Map<string, Promise<ArrayBuffer>>();

    // The base directory name will be the first part of the relative path
    const baseDir = files[0].webkitRelativePath.split('/')[0];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // We need to remove the base directory from the path for zarrita
      const relativePath = file.webkitRelativePath.substring(baseDir.length + 1);
      if (relativePath) {
        store.set('/' + relativePath, file.arrayBuffer()); // Zarrita looks for a leading slash before variables. Need to add it back
      }
    }

    // Create a custom zarrita store from the Map
    const customStore: zarr.AsyncReadable<any> = {
      async get(key: string) {
        const buffer = await store.get(key);
        return buffer ? new Uint8Array(buffer) : undefined;
      }
    };
    try {
      // Open the Zarr store using the custom store
      let store = await zarr.tryWithConsolidated(customStore);
      if (!('contents' in store)){
        // Metadata is missing. We will need to parse variables here. 
        store = await ZarrParser(files, customStore)
      }
      const gs = zarr.open(store, {kind: 'group'});
      gs.then(e=>{setCurrentStore(e)})
      setShowLocal(false)
      setOpenVariables(true)
    } catch (error) {
      if (error instanceof Error) {
        console.log(`Error opening Zarr store: ${error.message}`);
      } else {
        console.log('An unknown error occurred when opening the Zarr store.');
      }
    }
  };

  return (
    <div>
        <Input type="file" id="filepicker"
        className='hover:drop-shadow-md hover:scale-[110%]'
        style={{width:'200px', cursor:'pointer'}}
        // @ts-expect-error `webkitdirectory` is non-standard attribute. TS doesn't know about it. It's used for cross-browser compatibility.
        directory=''
        webkitdirectory='true'
        onChange={handleFileSelect}
        >
        </Input>
    </div>
  )
}

export default LocalZarr

