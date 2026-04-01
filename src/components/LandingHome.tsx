'use client';
import * as THREE from 'three'
THREE.Cache.enabled = true;
import { GetZarrMetadata, GetVariableNames, GetTitleDescription } from '@/components/zarr/GetMetadata';
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
    initStore, timeSeries, variable, plotOn,
    setZMeta, setVariables, setPlotOn, setTitleDescription,
  } = useGlobalStore(useShallow(state => ({
    initStore: state.initStore,
    timeSeries: state.timeSeries,
    variable: state.variable,
    plotOn: state.plotOn,
    setZMeta: state.setZMeta,
    setVariables: state.setVariables,
    setPlotOn: state.setPlotOn,
    setTitleDescription: state.setTitleDescription,
  })))

  const { currentStore, setCurrentStore, setZSlice, setYSlice, setXSlice, setUseNC } = useZarrStore(useShallow(state => ({
    currentStore: state.currentStore,
    setCurrentStore: state.setCurrentStore,
    setZSlice: state.setZSlice,
    setYSlice: state.setYSlice,
    setXSlice: state.setXSlice,
    setUseNC: state.setUseNC
  })))

  function resetSlices() {
    setZSlice([0, null])
    setYSlice([0, null])
    setXSlice([0, null])
  }

  useEffect(() => {
    resetSlices();
    if (initStore.startsWith('local:')) {
      const path = initStore.replace('local:npm', '');
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
    const newStore = GetStore(initStore)
    setCurrentStore(newStore)
  }, [initStore, setCurrentStore])

  useEffect(() => {
    let isMounted = true;

    GetTitleDescription(currentStore).then((result) => {
      if (isMounted) setTitleDescription(result);
    });

    const fullmetadata = GetZarrMetadata(currentStore);
    const variables = GetVariableNames(fullmetadata);

    fullmetadata.then(e => setZMeta(e))
    variables.then(e => setVariables(e))

    return () => { isMounted = false; };
  }, [currentStore, setZMeta, setVariables, setTitleDescription])

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