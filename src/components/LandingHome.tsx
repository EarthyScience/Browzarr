'use client';
import * as THREE from 'three'
THREE.Cache.enabled = true;
import { GetZarrMetadata, GetTitleDescription } from '@/components/zarr/ZarrLoaderLRU';
import { GetVariableNames } from './zarr/utils';
import { useEffect, useRef } from 'react';
import { PlotArea, Plot, LandingShapes } from '@/components/plots';
import { MainPanel } from '@/components/ui';
import { Loading, Error as ErrorComponent } from '@/components/ui';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useShallow } from 'zustand/shallow';

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
  const {timeSeries, variable, setZMeta, setVariables, setTitleDescription, 
    setOpenVariables, setStoreFromURL} = useGlobalStore(useShallow(s => ({
      timeSeries: s.timeSeries, variable: s.variable, setZMeta: s.setZMeta, setVariables: s.setVariables,
      setTitleDescription: s.setTitleDescription, setOpenVariables: s.setOpenVariables, setStoreFromURL: s.setStoreFromURL
    })))
  const { currentStore, useNC} = useZarrStore(useShallow(s => ({
    currentStore: s.currentStore, useNC: s.useNC
  })))

  useEffect(() => {
    // LocalNetCDF --> loadNetCDF grabs metadata during loading. Maybe move this logic to GetStore. 
    if (useNC) return;
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
        const { storeFromURL } = useGlobalStore.getState();
        if (storeFromURL) {
          setOpenVariables(true);
          setStoreFromURL(false);
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
    {!variable && <LandingShapes />}
    <ErrorComponent />
    <Loading />
    {variable && <Plot />}
    {Object.keys(timeSeries).length >= 1 && <PlotArea />}
    </>
  );
}

export default LandingHome;