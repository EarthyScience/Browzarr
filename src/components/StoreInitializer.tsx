"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { usePlotStore } from "@/GlobalStates/PlotStore";
import { useShallow } from 'zustand/shallow';
import { isRemoteStore } from '@/utils/isRemoteStore';
import { loadNetCDF } from "@/utils/loadNetCDF";
import { loadFile } from "@/utils/IndexDB";
import { LoadLocalZarr } from "./ui/MainPanel/LocalZarr";

function StoreInitializerInner() {
  const searchParams = useSearchParams();
  const setInitStore = useGlobalStore(s => s.setInitStore);
  const setStoreFromURL = useGlobalStore(s => s.setStoreFromURL);
  const { setUseNC } = useZarrStore(useShallow(s => ({
    setUseNC: s.setUseNC,
  })));

  useEffect(() => {
    const store = searchParams.get("store");
    let data = searchParams.get("data")
    if (data){
		try{
			const fullObj = JSON.parse(data);
      console.log(fullObj)
			if (fullObj.zarrState && fullObj.zarrState.blobKey){ // If NC local must load file beforehand
				const blobKey = fullObj.zarrState.blobKey
				const isNC = fullObj.zarrState.useNC
				loadFile(blobKey).then(cache =>{
					if (!isNC){
						LoadLocalZarr(cache?.blob as File[])
					} else {
						//@ts-ignore cache is what we want
						const file = cache.blob as File
						loadNetCDF(file, file.name).then(() => {
							useZarrStore.setState(fullObj.zarrState);
							useGlobalStore.setState(fullObj.globalState);
							usePlotStore.setState(fullObj.plotState);
						})
					}
				})
			} else {
				useZarrStore.setState(fullObj.zarrState)
				useGlobalStore.setState(fullObj.globalState)
				usePlotStore.setState(fullObj.plotState)
        const isNC = searchParams.get("format") === "nc";
        setUseNC(isNC);
			}
		} catch {
			console.error('Something Failed :/')
		}
    }
  }, [searchParams]);

  return null;
}

export function StoreInitializer() {
  return (
    <Suspense fallback={null}>
      <StoreInitializerInner />
    </Suspense>
  );
}