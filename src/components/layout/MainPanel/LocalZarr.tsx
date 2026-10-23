"use client";
import React, {useState, useEffect, ChangeEvent} from 'react'
import * as zarr from 'zarrita'
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { Input } from '../input';
import ZarrParser from '@/components/zarr/ZarrParser';
import { saveFile } from '@/utils/IndexDB';

interface LocalZarrType {
  setShowLocal: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenVariables: (open: boolean) => void;
}

export async function LoadLocalZarr(files:File[]){
  // Create a Map to hold the Zarr store data
    const fileMap = new Map<string, File>();
    // The base directory name will be the first part of the relative path
    const baseDir = files[0].webkitRelativePath.split('/')[0];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // We need to remove the base directory from the path for zarrita
      const relativePath = file.webkitRelativePath.substring(baseDir.length + 1);
      if (relativePath) {
        fileMap.set('/' + relativePath, file); // Zarrita looks for a leading slash before variables. Need to add it back
      }
    }
    // Create a custom zarrita store from the Map
    const customStore: zarr.AsyncReadable = {
      async get(key: string): Promise<Uint8Array | undefined> {
        const file = fileMap.get(key)
        const buffer = await file?.arrayBuffer();
        return buffer ? new Uint8Array(buffer) : undefined;
      }
    };
    try {
      // Open the Zarr store using the custom store
      let store = await zarr.withMaybeConsolidatedMetadata(customStore);
      if (!('contents' in store)){
        console.log("Trying to parse?")
        // Metadata is missing. We will need to parse variables here. 
        store = await ZarrParser(files, customStore)
      }
      const gs = await zarr.open(store, {kind: 'group'});
      const blobKey = `local_${baseDir}`
      useGlobalStore.setState({initStore:blobKey})
      useZarrStore.setState({ useNC: false, blobKey, currentStore:gs})
    } catch (error) {
      
      if (error instanceof Error) {
        console.log(`Error opening Zarr store: ${error.message}`);
      } else {
        console.log('An unknown error occurred when opening the Zarr store.');
      }
    }
}

const LocalZarr = ({setShowLocal, setOpenVariables}:LocalZarrType) => {
	const {setStatus} = useGlobalStore.getState()
	const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0) {
			setStatus(null)
			return;
		}
		const baseDir = files[0].webkitRelativePath.split('/')[0];
		LoadLocalZarr(Array.from(files)).then(()=>{
      saveFile(Array.from(files), `local_${baseDir}`)
      setShowLocal(false);
      setOpenVariables(true);
      setStatus(null)
		})
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
			/>
		</div>
	)
}

export default LocalZarr

