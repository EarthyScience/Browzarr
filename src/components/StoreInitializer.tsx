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
import * as THREE from 'three';
import { useImageExportStore } from "@/GlobalStates/ImageExportStore";
import { LoadLocalZarr } from "./ui/MainPanel/LocalZarr";

function restoreImageExportState(serializedState: any) {
  if (!serializedState) return;
  const { keyFrames, ...rest } = serializedState;
  let restoredKeyFrames: Map<number, any> | undefined = undefined;

  if (Array.isArray(keyFrames)) {
    restoredKeyFrames = new Map(
      keyFrames.map(([frame, state]: [number, any]) => {
        const restoredState = { ...state };
        if (state.camera) {
          const pos = state.camera.position;
          const rot = state.camera.rotation;
          restoredState.camera = {
            position: pos ? new THREE.Vector3(pos.x ?? pos._x ?? 0, pos.y ?? pos._y ?? 0, pos.z ?? pos._z ?? 0) : undefined,
            rotation: rot ? new THREE.Euler(rot.x ?? rot._x ?? 0, rot.y ?? rot._y ?? 0, rot.z ?? rot._z ?? 0, rot.order ?? rot._order ?? 'XYZ') : undefined,
          };
        }
        return [frame, restoredState];
      })
    );
  }

  useImageExportStore.setState({
    ...rest,
    keyFrames: restoredKeyFrames,
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
    let data = searchParams.get("data");
    let hasStore = !!store;

    if (data){
		try{
			const fullObj = JSON.parse(data);
			if (fullObj.zarrState.blobKey){ // If NC local must load file beforehand
				const blobKey = fullObj.zarrState.blobKey
				const isNC = fullObj.zarrState.useNC
				loadFile(blobKey).then(cache =>{
					if (!isNC){
						LoadLocalZarr(cache?.blob as File[]).then(() => {
							useZarrStore.setState(fullObj.zarrState);
							useGlobalStore.setState(fullObj.globalState);
							usePlotStore.setState(fullObj.plotState);
							restoreImageExportState(fullObj.imageExportState);
						})
					} else {
						//@ts-ignore cache is what we want
						const file = cache.blob as File
						loadNetCDF(file, file.name).then(() => {
							useZarrStore.setState(fullObj.zarrState);
							useGlobalStore.setState(fullObj.globalState);
							usePlotStore.setState(fullObj.plotState);
							restoreImageExportState(fullObj.imageExportState);
						})
					}
				})
			} else {
				useZarrStore.setState(fullObj.zarrState)
				useGlobalStore.setState(fullObj.globalState)
				usePlotStore.setState(fullObj.plotState)
				restoreImageExportState(fullObj.imageExportState);
			}
			hasStore = true;
		} catch {
			console.error('Something Failed :/')
		}
    }
    if (!hasStore) {
      setStoreFromURL(false);
      return;
    }
    
    if (store) {
      const isNC = searchParams.get("format") === "nc";
      setUseNC(isNC);
      setFetchNC(isNC);
      const initValue = isRemoteStore(store) ? store : `local:${store}`;
      setInitStore(initValue);
    }
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