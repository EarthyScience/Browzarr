'use client';
import * as THREE from 'three'
THREE.Cache.enabled = true;
import { GetZarrMetadata, GetTitleDescription } from '@/data/zarr/ZarrLoaderLRU';
import { GetVariableNames } from '@/data/zarr/utils';
import { useEffect, useRef } from 'react';
import { PlotArea, Plot, LandingShapes } from '@/components/plots';
import { MainPanel } from '@/components/ui';
import { Loading, Error as ErrorComponent } from '@/components/ui';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useZarrStore } from '@/stores/ZarrStore';
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