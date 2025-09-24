'use client';
import * as THREE from 'three'
THREE.Cache.enabled = true;
import { GetZarrMetadata, GetVariableNames, GetTitleDescription } from '@/components/zarr/GetMetadata';
import { ZarrDataset, GetStore } from '@/components/zarr/ZarrLoaderLRU';
import { useEffect, useMemo } from 'react';
import { PlotArea, Plot, LandingShapes } from '@/components/plots';
import { MainPanel } from '@/components/ui';
import { Metadata, Loading, Navbar, Error } from '@/components/ui';
import { useAnalysisStore, useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';

export function LandingHome() {
  const {
    initStore, timeSeries, variable, metadata, plotOn,
    setZMeta, setVariables, setPlotOn, setTitleDescription, 
  } = useGlobalStore(useShallow(state => ({
    initStore: state.initStore, 
    timeSeries: state.timeSeries,
    variable: state.variable,
    metadata: state.metadata,
    plotOn: state.plotOn,
    setZMeta: state.setZMeta,
    setVariables: state.setVariables,
    setPlotOn: state.setPlotOn,
    setTitleDescription: state.setTitleDescription,
  })))

  const {setHasF16} = useAnalysisStore.getState()

  const { currentStore, setCurrentStore } = useZarrStore(useShallow(state => ({
    currentStore: state.currentStore,
    setCurrentStore: state.setCurrentStore
  })))

  useEffect(() => { // Update store if URL changes
    if (initStore.startsWith('local')){ // Don't fetch store if local 
      return
    }
    const newStore = GetStore(initStore)
    setCurrentStore(newStore)
  }, [initStore, setCurrentStore])

  const ZarrDS = useMemo(() => new ZarrDataset(currentStore), [currentStore])

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
    async function CheckF16(){
      const adapter = await navigator.gpu?.requestAdapter();
      const maxSize = adapter?.limits.maxBufferSize;
      const maxStorage = adapter?.limits.maxStorageBufferBindingSize;
      const hasF16 = adapter ? adapter.features.has("shader-f16") : false
      return hasF16;
    }
    CheckF16().then(e=> setHasF16(e) )
  },[])

  return (
    <>
    <MainPanel/> 
    {variable == 'Default' && <LandingShapes />}
    <Error />
    {!plotOn && <Navbar />}
    <Loading />
    
    {/* {variable === "Default" && <ScrollableLinksTable />} */}
    {variable != "Default" && <Plot ZarrDS={ZarrDS} />}
    {metadata && <Metadata data={metadata} /> }
    {Object.keys(timeSeries).length >= 1 && <PlotArea />}
    </>
  );
}

export default LandingHome;