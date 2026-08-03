"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { usePlotStore } from "@/GlobalStates/PlotStore";
import { loadNetCDF } from "@/utils/loadNetCDF";
import { loadFile } from "@/utils/IndexDB";
import { LoadLocalZarr } from "./ui/MainPanel/LocalZarr";
import { isRemoteStore } from "@/utils/isRemoteStore";
import { GetStore } from "./zarr/ZarrLoaderLRU";
import { useImageExportStore } from "@/GlobalStates/ImageExportStore";


export function initializeStore(){
	const {initStore} = useGlobalStore.getState()
	const {useNC, ReFetch, setCurrentStore} = useZarrStore.getState()
	// ---- Handle Code Inputs ---- //
	if (initStore.startsWith("local:")) {
		const path = initStore.replace('local:', '');  
		if (useNC){
			// ---- Local NC ----//
			const filename = path.split('/').pop() ?? 'file.nc';
			fetch(`file?path=${encodeURIComponent(path)}`)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.blob();
			})
			.then(async blob => {
				await loadNetCDF(blob, filename);
				ReFetch();
				return;
			})
			.catch(e => useGlobalStore.getState().setStatus(`Failed to load: ${e instanceof Error ? e.message : String(e)}`));
		} else {
			// ---- Local Zarr ---- //
			const encodedPath = encodeURIComponent(path);
			const zarrPath = `${window.location.origin}/zarr/${encodedPath}`;
			const newStore = GetStore(zarrPath);
			newStore.then(()=>ReFetch())
			setCurrentStore(newStore);
			return;
		}
	} else {
		if (!isRemoteStore(initStore)) return; // Localzarr and LocalNetCDF create & set custom stores that bypasses this step
		// ---- Remote Zarr ---- //
		const { icechunkOptions, fetchOptions } = useZarrStore.getState();
		const newStore = GetStore(
			initStore,
			fetchOptions   ?? undefined,
			icechunkOptions ?? undefined
		);
		setCurrentStore(newStore);
	}
	// ---- Clear after use ---- //
	const {remapTexture} = useGlobalStore.getState();
	if (remapTexture) remapTexture.dispose();
	useZarrStore.setState({icechunkOptions: null, fetchOptions:null});
	useGlobalStore.setState({remapTexture: undefined });
	/* This comment out is temporary. For now only way to keep CRS passed from params */
	// usePlotStore.setState({nativeCRS:undefined, destCRS:undefined});
}

function StoreInitializerInner() {
  const searchParams = useSearchParams();
  const setInitStore = useGlobalStore(s => s.setInitStore);

  useEffect(() => {
	const store = searchParams.get("store");
	const data = searchParams.get("data");
	const keyFramesPath = searchParams.get("keyFramesPath");
	const exportPlot = searchParams.get("export")
	// ---- Handle States ---- //
	if (data){
		try{
		const fullObj = JSON.parse(data);
		console.log(fullObj)
		if (fullObj.zarrState?.blobKey){ // If NC local must load file beforehand
			const blobKey = fullObj.zarrState.blobKey
			const isNC = fullObj.zarrState.useNC
			loadFile(blobKey).then(cache =>{
			if (!isNC){
				console.log(cache?.blob)
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
		}
		} catch {
		console.error('Something Failed :/')
		}
	}
	// ---- Handle KeyFrames ---- //
	if (keyFramesPath){
		// Fetch JSON 
		const encodedPath = encodeURIComponent(keyFramesPath);
		const jsonPath = `${window.location.origin}/file?path=${encodedPath}`;
		fetch(jsonPath)
		.then(response => {
			if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			const keyFrames = new Map<number, any>(
			Object.entries(data).map(([key, value]) => [Number(key), value])
			);
			useImageExportStore.setState({keyFrames});
		})
		.catch(error => {
			console.error('Error fetching keyFrames JSON:', error);
		});
  	}
	// ---- Handle Export ---- //
	if (exportPlot)useImageExportStore.setState({exportOnLoad:true})
	// ---- Julia fallback ---- //
	/* Remove this if Julia package does not stay maintained */
	if (searchParams.get("format") === "nc") useZarrStore.setState({useNC:true});
  // ---- Establish local marker ---- //
  if (store){
    const isRemoteZarr = isRemoteStore(store);
    setInitStore(isRemoteZarr ? store : "local:" + store)
  }
	usePlotStore.setState({overRideCamera:true})
	initializeStore();
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