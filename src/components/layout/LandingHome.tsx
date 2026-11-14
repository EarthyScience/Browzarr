'use client';
import { Error as ErrorComponent, Loading, MainPanel } from '@/components/ui';
import { useGlobalStore } from '@/stores/GlobalStore';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import WelcomeSplash from './WelcomeSplash';

// Heavy WebGPU/three components are split into their own chunks so the
// welcome splash can paint before they finish downloading and initializing.
const LandingShapes = dynamic(
    () => import('@/components/plots/MorphingPoints').then(m => m.LandingShapes),
    { ssr: false }
);
const Plot = dynamic(
    () => import('@/components/plots/Plot').then(m => m.Plot),
    { ssr: false }
);
const PlotArea = dynamic(
    () => import('@/components/plots/plotarea/LinePlot').then(m => m.PlotArea),
    { ssr: false }
);
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
    {!variable && <WelcomeSplash />}
    {!variable && <LandingShapes />}
    <ErrorComponent />
    <Loading />
    {variable && <Plot />}
    {Object.keys(timeSeries).length >= 1 && <PlotArea />}
    </>
  );
}

export default LandingHome;