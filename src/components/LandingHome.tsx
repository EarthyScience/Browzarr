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
    initStore, timeSeries, variable,
    setZMeta, setVariables, setTitleDescription,
    shouldOpenVariablesAfterInit, setOpenVariables, setShouldOpenVariablesAfterInit,
  } = useGlobalStore(useShallow(state => ({
    initStore: state.initStore,
    timeSeries: state.timeSeries,
    variable: state.variable,
    setZMeta: state.setZMeta,
    setVariables: state.setVariables,
    setTitleDescription: state.setTitleDescription,
    shouldOpenVariablesAfterInit: state.shouldOpenVariablesAfterInit,
    setOpenVariables: state.setOpenVariables,
    setShouldOpenVariablesAfterInit: state.setShouldOpenVariablesAfterInit,
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
    setZSlice([0, null]);
    setYSlice([0, null]);
    setXSlice([0, null]);
    if (initStore.startsWith('local:')) {
      const path = initStore.replace('local:', '');
      if (!NETCDF_EXT_REGEX.test(path)) return; // TODO:  handled zarr
      const filename = path.split('/').pop() ?? 'file.nc';
      fetch(`/file?path=${encodeURIComponent(path)}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then(blob => {
          loadNetCDF(blob, filename);
          useGlobalStore.setState({openVariables: true})
          return
        })
        .catch(e => useGlobalStore.getState().setStatus(`Failed to load: ${e instanceof Error ? e.message : String(e)}`));
      return;
    }
    if (initStore.startsWith('local')) return; // local_ set by LocalNetCDF/LocalZarr after load
    setUseNC(false)
    const { icechunkOptions, fetchOptions } = useZarrStore.getState();
    const newStore = GetStore(
      initStore,
      fetchOptions   ?? undefined,
      icechunkOptions ?? undefined
    );
    setCurrentStore(newStore);
    // Clear after use
    useZarrStore.getState().setIcechunkOptions(null);
    useZarrStore.getState().setFetchOptions(null);
  }, [initStore, fetchKey, setCurrentStore, setUseNC, setZSlice, setYSlice, setXSlice])

  useEffect(() => {
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
        if (shouldOpenVariablesAfterInit) {
          setOpenVariables(true);
          setShouldOpenVariablesAfterInit(false);
        }
      }
    }).catch(() => {
      if (isMounted && currentStore === activeStore) {
        setShouldOpenVariablesAfterInit(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentStore, setZMeta, setVariables, setTitleDescription, shouldOpenVariablesAfterInit, setOpenVariables, setShouldOpenVariablesAfterInit]);

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