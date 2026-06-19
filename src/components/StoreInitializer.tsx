"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { usePlotStore } from "@/GlobalStates/PlotStore";
import { useShallow } from 'zustand/shallow';
import { isRemoteStore } from '@/utils/isRemoteStore';
import { loadNetCDF } from "@/utils/loadNetCDF";
import { openDB } from "./ui/MainPanel/LocalNetCDF";

async function LoadNCBlob(blobKey:string){
	const db = await openDB();
	return new Promise((res, rej) => {
    const tx = db.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').get(blobKey);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror = () => rej(req.error);
  });
}

function StoreInitializerInner() {
  const searchParams = useSearchParams();
  const setInitStore = useGlobalStore(s => s.setInitStore);
  const setStoreFromURL = useGlobalStore(s => s.setStoreFromURL);
  const { setUseNC, setFetchNC } = useZarrStore(useShallow(s => ({
    setUseNC: s.setUseNC,
    setFetchNC: s.setFetchNC,
  })));

  useEffect(() => {
    const store = searchParams.get("store");
    let data = searchParams.get("data")
    if (data){
      const fullObj = JSON.parse(data);
      console.log(fullObj.zarrState)
      if (fullObj.zarrState.useNC){
		const blobKey = fullObj.zarrState.ncBlobKey
        LoadNCBlob(blobKey).then(cache =>{
			//@ts-ignore cache is what we want
			const file = cache.file
			loadNetCDF(file, file.name).then(() => {
				useZarrStore.setState(fullObj.zarrState);
				useGlobalStore.setState(fullObj.globalState);
				usePlotStore.setState(fullObj.plotState);
			})
	  })
      } else {
		useZarrStore.setState(fullObj.zarrState)
		useGlobalStore.setState(fullObj.globalState)
		usePlotStore.setState(fullObj.plotState)
	  }
    }
    if (!store) {
      setStoreFromURL(false);
      return;
    }
    
    const isNC = searchParams.get("format") === "nc";
    setUseNC(isNC);
    setFetchNC(isNC);
    const initValue = isRemoteStore(store) ? store : `local:${store}`;
    setInitStore(initValue);
    // mark that a store was provided in the URL; LandingHome will open variables once
    // the custom store is actually loaded.
    setStoreFromURL(true);
  }, [searchParams, setUseNC, setFetchNC, setInitStore, setStoreFromURL]);

  return null;
}

export function StoreInitializer() {
  return (
    <Suspense fallback={null}>
      <StoreInitializerInner />
    </Suspense>
  );
}