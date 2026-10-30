'use client';
import { LandingShapes, Plot, PlotArea } from '@/components/plots';
import { Error as ErrorComponent, Loading, MainPanel } from '@/components/ui';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/shallow';
THREE.Cache.enabled = true;

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
  const {timeSeries, variable} = useGlobalStore(useShallow(s => ({
      timeSeries: s.timeSeries, variable: s.variable })))

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