'use client';
import * as THREE from 'three'
THREE.Cache.enabled = true;
import { GetZarrMetadata, GetTitleDescription } from '@/components/zarr/ZarrLoaderLRU';
import { GetVariableNames } from './zarr/utils';
import { GetStore } from '@/components/zarr/ZarrLoaderLRU';
import { useEffect } from 'react';
import { PlotArea, Plot, LandingShapes } from '@/components/plots';
import { MainPanel } from '@/components/ui';
import { Loading, Error as ErrorComponent } from '@/components/ui';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useShallow } from 'zustand/shallow';
import { loadNetCDF, NETCDF_EXT_REGEX } from '@/utils/loadNetCDF';
import { usePlotStore } from '@/GlobalStates/PlotStore';

async function sendPing() {
  const url = "https://www.bgc-jena.mpg.de/~jpoehls/browzarr/visitor_logger.php";
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  } catch (error) {
    console.error("Request failed:", error);
  }
}

export function LandingHome() {
  const {
    initStore, timeSeries, variable, storeFromURL,
    setZMeta, setVariables, setTitleDescription, setOpenVariables, setStoreFromURL,
  } = useGlobalStore(useShallow(state => ({
    initStore: state.initStore,
    timeSeries: state.timeSeries,
    variable: state.variable,
    storeFromURL: state.storeFromURL,
    setZMeta: state.setZMeta,
    setVariables: state.setVariables,
    setTitleDescription: state.setTitleDescription,
    setOpenVariables: state.setOpenVariables,
    setStoreFromURL: state.setStoreFromURL,
  })))

  const { currentStore, fetchKey,
    setCurrentStore, setZSlice, setYSlice, setXSlice, setUseNC 
  } = useZarrStore(useShallow(state => ({
    currentStore: state.currentStore,
    fetchKey: state.fetchKey,
    setCurrentStore: state.setCurrentStore,
    setZSlice: state.setZSlice,
    setYSlice: state.setYSlice,
    setXSlice: state.setXSlice,
    setUseNC: state.setUseNC
  })))

  useEffect(() => {
    void fetchKey;
    const { storeFromURL } = useGlobalStore.getState();
    if (!storeFromURL) {
      setZSlice([0, null]);
      setYSlice([0, null]);
      setXSlice([0, null]);
    }
    if (initStore.startsWith('local:')) {
      const path = initStore.replace('local:', '');
      if (!NETCDF_EXT_REGEX.test(path)) return;
      const filename = path.split('/').pop() ?? 'file.nc';
      fetch(`/file?path=${encodeURIComponent(path)}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then(async blob => {
          await loadNetCDF(blob, filename);
          if (storeFromURL) {
            const { variable } = useGlobalStore.getState();
            if (variable === "Default") {
              setOpenVariables(true);
              setStoreFromURL(false);
            }
          }
          return;
        })
        .catch(e => useGlobalStore.getState().setStatus(`Failed to load: ${e instanceof Error ? e.message : String(e)}`));
      return;
    }
    if (initStore.startsWith('local')) return; // local_ set by LocalNetCDF/LocalZarr after load
    setUseNC(false)
    const { storeFromURL: currentStoreFromURL } = useGlobalStore.getState();
    if (!currentStoreFromURL) {
      useGlobalStore.setState({ variables: [], variable: "Default" });
    }
    const { icechunkOptions, fetchOptions } = useZarrStore.getState();
    const newStore = GetStore(
      initStore,
      fetchOptions   ?? undefined,
      icechunkOptions ?? undefined
    );
    setCurrentStore(newStore);
    // Clear after use
    const {remapTexture} = useGlobalStore.getState();
    if (remapTexture) remapTexture.dispose();
    useZarrStore.setState({icechunkOptions: null, fetchOptions:null, loadedStorePath: initStore});
    useGlobalStore.setState({remapTexture: undefined });
    usePlotStore.setState({nativeCRS:undefined, destCRS:undefined});
  }, [initStore, fetchKey, setCurrentStore, setUseNC, setZSlice, setYSlice, setXSlice, setOpenVariables, setStoreFromURL]);

  useEffect(() => {
    const { initStore } = useGlobalStore.getState();
    if (initStore.startsWith('local:')) return;

    let isMounted = true;
    const activeStore = currentStore;

    GetTitleDescription(activeStore).then((result) => {
      if (isMounted && currentStore === activeStore) setTitleDescription(result);
    });

    const fullmetadata = GetZarrMetadata(activeStore);
    const variables = GetVariableNames(fullmetadata);

    fullmetadata.then((e) => {
      if (isMounted && currentStore === activeStore) setZMeta(e);
    });
    variables.then((e) => {
      if (isMounted && currentStore === activeStore) {
        setVariables(e);
        const { storeFromURL, variable } = useGlobalStore.getState();
        if (storeFromURL) {
          if (variable === "Default") {
            setOpenVariables(true);
            setStoreFromURL(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentStore, setZMeta, setVariables, setTitleDescription, setOpenVariables, setStoreFromURL]);

  useEffect(()=>{
    if (process.env.NODE_ENV !== "development") {
      sendPing()
    }
  },[])

  return (
    <>
    <MainPanel/> 
    {variable == 'Default' && <LandingShapes />}
    <ErrorComponent />
    <Loading />
    {/* {variable === "Default" && <ScrollableLinksTable />} */}
    {variable != "Default" && <Plot />}
    {Object.keys(timeSeries).length >= 1 && <PlotArea />}
    </>
  );
}

export default LandingHome;