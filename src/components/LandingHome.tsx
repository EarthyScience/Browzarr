'use client';
import * as THREE from 'three'
THREE.Cache.enabled = true;
import { GetZarrMetadata, GetVariableNames } from '@/components/zarr/GetMetadata';
import { ZarrDataset, GetStore } from '@/components/zarr/ZarrLoaderLRU';
import { useRef, useState } from 'react';
import VariableScroller from './ui/VariableScroller';
import { useEffect, useMemo } from 'react';
import { PlotArea, Plot } from '@/components/plots';
import { MainPanel } from '@/components/ui';
import { Metadata, Loading, Navbar, Error } from '@/components/ui';
import { useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow, shallow } from 'zustand/shallow';
import { GetTitleDescription } from '@/components/zarr/GetMetadata';
import ScrollableLinksTable from './ui/VariablesTable';


export function LandingHome() {

  const {initStore, setZMeta} = useGlobalStore(useShallow(state=>({initStore: state.initStore, setZMeta: state.setZMeta})))
  const {currentStore, setCurrentStore} = useZarrStore(useShallow(state=> ({
    currentStore: state.currentStore,
    setCurrentStore: state.setCurrentStore
  })))
  
  useEffect(()=>{ //Update store if URL changes
    const newStore = GetStore(initStore)
    setCurrentStore(newStore)
  },[initStore])

  const ZarrDS = useMemo(() => new ZarrDataset(currentStore), [currentStore]) //Update Dataset if store changes
  const [titleDescription, setTitleDescription] = useState<{ title?: string; description?: string }>({});
  
  useEffect(() => {
    let isMounted = true;
    GetTitleDescription(currentStore).then((result) => {
      if (isMounted) setTitleDescription(result);
    });
    const store = currentStore;
    const fullmetadata = GetZarrMetadata(store);
    const variables = GetVariableNames(fullmetadata);
    fullmetadata.then(e=>setZMeta(e))
    variables.then(e=> {setVariables(e)})
    return () => { isMounted = false; };
  }, [currentStore]);


  const {   setVariables, setPlotOn, timeSeries, variable, metadata, plotOn  } = useGlobalStore(
    useShallow(state => ({
      setVariables: state.setVariables,
      setPlotOn: state.setPlotOn,
      timeSeries: state.timeSeries,
      variable: state.variable,
      metadata: state.metadata,
      plotOn: state.plotOn
    }))
  );

  useEffect(()=>{
    if (variable === "Default"){
      setPlotOn(false)
    }
  },[variable])
  
  return (
    <>
    <MainPanel/> 

    <Error />
    {!plotOn && <Navbar />}
    <Loading />
    {variable === "Default" && <ScrollableLinksTable />}
    {variable != "Default" && <Plot ZarrDS={ZarrDS} />}
    {metadata && <Metadata data={metadata} /> }
    {Object.keys(timeSeries).length >= 1 && <PlotArea />}
    </>
  );
}

export default LandingHome;