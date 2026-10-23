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
import { useColormapStore } from "@/GlobalStates/ColormapStore";

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
}

const safeJsonParse = (val: string | null): unknown => {
  if (val === null) return undefined;
  try {
    return JSON.parse(val);
  } catch {
    return val; // Fallback to raw string if JSON.parse fails
  }
};

function StoreInitializerInner() {
	const searchParams = useSearchParams();
	const setInitStore = useGlobalStore(s => s.setInitStore);
	useEffect(() => {
		if (searchParams.size === 0) {initializeStore(); return;}
		
		const urlStates = Array.from(searchParams.keys());
		const [globalKeys, plotKeys, zarrKeys, colormapKeys, exportkeys] = // Get keys for each store
			[useGlobalStore, usePlotStore, useZarrStore, useColormapStore, useImageExportStore].map(store => (
				urlStates.filter(val => Object.keys(store.getState()).includes(val))))
		const [globalStates, plotStates, zarrStates, colormapStates, exportStates] = // Get states for each store
			[globalKeys, plotKeys, zarrKeys, colormapKeys, exportkeys].map(keys => (
				Object.fromEntries(keys.map(key => [key, safeJsonParse(searchParams.get(key))]))))		

		const setAllStates = () => {
			useZarrStore.setState(zarrStates);
			useGlobalStore.setState(globalStates);
			usePlotStore.setState(plotStates);
			useColormapStore.setState(colormapStates);
			useImageExportStore.setState(exportStates);
		}
		const keyFramesPath = searchParams.get("keyFramesPath");
		const exportPlot = searchParams.get("export")
		const reproject = searchParams.get("reproject")
		// ---- Handle States ---- //
		const zarrParam = searchParams.get('zarrState')
		if (zarrParam){
			const zarrState = JSON.parse(zarrParam)
			if (zarrState.blobKey){
				const blobKey = zarrState.blobKey
				const isNC = zarrState.useNC
				loadFile(blobKey).then(cache =>{
					if (!isNC){
						console.log(cache?.blob)
						LoadLocalZarr(cache?.blob as File[])
					} else {
						//@ts-ignore cache is what we want
						const file = cache.blob as File
						loadNetCDF(file, file.name).then(() => {
							setAllStates()
						})
					}
				})
			}
		} else setAllStates();
		// ---- Handle KeyFrames ---- //
		if (keyFramesPath){
			// Fetch JSON 
			const encodedPath = encodeURIComponent(keyFramesPath);
			const jsonPath = `file?path=${encodedPath}`;
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
		// ---- Establish local marker ---- //
		const store = searchParams.get("initStore") || searchParams.get("dataset"); // dataset is julia convention. 
		if (store){
			const isRemoteZarr = isRemoteStore(store);
			setInitStore(isRemoteZarr ? store : "local:" + store)
		}
		// --- CONDITIONALS ---- //
		// ---- Handle Export ---- //
		if (exportPlot === 'true') useImageExportStore.setState({exportOnLoad:true})
		// ---- Reproject data ---- //
		if (reproject === 'true') usePlotStore.setState({preProject:true})
		// ---- Julia fallback ---- //
			/* Remove this if Julia package does not stay maintained */
			if (searchParams.get("format") === "nc") useZarrStore.setState({useNC:true});
		useColormapStore.getState().initializeColormap()
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