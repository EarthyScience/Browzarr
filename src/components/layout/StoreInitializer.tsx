"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/stores/GlobalStore";
import { useZarrStore } from '@/stores/ZarrStore';
import { usePlotStore } from "@/stores/PlotStore";
import { loadNetCDF, NETCDF_EXT_REGEX } from "@/data/loaders/loadNetCDF";
import { loadFile } from "@/lib/IndexDB";
import { LoadLocalZarr } from "./MainPanel/LocalZarr";
import { isRemoteStore, toHttps } from "@/data/geo/isRemoteStore";
import { GetStore } from "@/data/zarr/ZarrLoaderLRU";
import { useImageExportStore } from "@/stores/ImageExportStore";
import { useColormapStore } from "@/stores/ColormapStore";
import { GetZarrMetadata, GetTitleDescription } from '@/data/zarr/ZarrLoaderLRU';
import { GetVariableNames } from '@/data/zarr/utils';
import { loadGeoTiff, GEOTIFF_EXT_REGEX } from "@/data/loaders/loadGeoTiff";

// Bumped on every setupZarr call so a slower, older store can't overwrite a newer one
let loadToken = 0;

export async function setupZarr(activeStore: Promise<any> ): Promise<boolean> {
	const token = ++loadToken;
	const isCurrent = () => token === loadToken;
	const {setTitleDescription, setVariables, setZMeta, setStoreFromURL, setOpenVariables} = useGlobalStore.getState()
	GetTitleDescription(activeStore).then((result) => { if (isCurrent()) setTitleDescription(result) }).catch(() => {});
	const fullmetadata = GetZarrMetadata(activeStore);
	const variables = GetVariableNames(fullmetadata);
	fullmetadata.then((e) => { if (isCurrent()) setZMeta(e) }).catch(() => {});
	try {
		const vars = await variables;
		if (!isCurrent()) return false;
		setVariables(vars);
		const { storeFromURL } = useGlobalStore.getState();
		if (storeFromURL) {
			setOpenVariables(true);
			setStoreFromURL(false);
		}
		return true;
	} catch {
		return false;
	}
}

function urlPath(url: string): string {
	try { return new URL(url).pathname; } catch { return url; }
}

// Resolves true once the store's variables are available, false if loading failed
export async function initializeStore(): Promise<boolean> {
	const {initStore} = useGlobalStore.getState()
	const {useNC, ReFetch, setCurrentStore} = useZarrStore.getState()
	// ---- Handle Code Inputs ---- //
	if (initStore.startsWith("local:")) {
		const path = initStore.replace('local:', '');  
		if (useNC){
			// ---- Local NC ----//
			const filename = path.split('/').pop() || 'file.nc';
			return fetch(`file?path=${encodeURIComponent(path)}`)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.blob();
			})
			.then(blob => loadNetCDF(new File([blob], filename)))
			.then(ok => { if (ok) ReFetch(); return ok; })
			.catch(e => {
				useGlobalStore.getState().setStatus(`Failed to load: ${e instanceof Error ? e.message : String(e)}`);
				return false;
			});
		} else {
			// ---- Local Zarr ---- //
			const encodedPath = encodeURIComponent(path);
			const zarrPath = `${window.location.origin}/zarr/${encodedPath}`;
			const newStore = GetStore(zarrPath);
			setCurrentStore(newStore);
			return setupZarr(newStore).then(ok => { if (ok) ReFetch(); return ok; });
		}
	} else {
		if (!isRemoteStore(initStore)) return false; // Localzarr and LocalNetCDF create & set custom stores that bypasses this step
		const url = toHttps(initStore);
		if (url !== initStore) useGlobalStore.getState().setInitStore(url);
		// ---- Take credentials out of shared state before anything else ---- //
		const { icechunkOptions, fetchOptions } = useZarrStore.getState();
		useZarrStore.setState({icechunkOptions: null, fetchOptions: null});
		const path = urlPath(url);

		if (NETCDF_EXT_REGEX.test(path)){
			return loadNetCDF(url, fetchOptions);
		} else if (GEOTIFF_EXT_REGEX.test(path)){
			return loadGeoTiff(url, fetchOptions);
		} else {
			// ---- Remote Zarr ---- //
			const newStore = GetStore(
				url,
				fetchOptions   ?? undefined,
				icechunkOptions ?? undefined
			);
			setCurrentStore(newStore);
			const {remapTexture} = useGlobalStore.getState();
			if (remapTexture) remapTexture.dispose();
			return setupZarr(newStore);
		}
	}
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
						loadNetCDF(file).then(() => {
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
			setInitStore(isRemoteZarr ? toHttps(store) : "local:" + store)
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

