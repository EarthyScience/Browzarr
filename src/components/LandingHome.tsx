'use client';
import * as THREE from 'three'
THREE.Cache.enabled = true;
import { GetZarrMetadata, GetVariableNames, GetTitleDescription } from '@/components/zarr/GetMetadata';
import { ZarrDataset, GetStore } from '@/components/zarr/ZarrLoaderLRU';
import { useEffect, useMemo, useState } from 'react';
import { PlotArea, Plot, LandingShapes } from '@/components/plots';
import { PlotWithSliceControl } from '@/components/plots';
import { MainPanel } from '@/components/ui';
import { Metadata, Loading, Navbar, Error } from '@/components/ui';
import { useGlobalStore, useZarrStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';
import { Button } from '@/components/ui/button';
import { ToggleLeft, ToggleRight } from 'lucide-react';

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

  

  const { currentStore, setCurrentStore } = useZarrStore(useShallow(state => ({
    currentStore: state.currentStore,
    setCurrentStore: state.setCurrentStore
  })))

  // New state for workflow selection
  const [useSliceControl, setUseSliceControl] = useState<boolean>(false);

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

  useEffect(()=>{ // Maybe we change remove this. Do we want to go back to home screen?
    if (variable === "Default"){
      setPlotOn(false)
    }
  }, [variable, setPlotOn])

  // Workflow toggle component
  const WorkflowToggle = () => (
    <div className="fixed top-4 left-16 z-50 bg-background/80 backdrop-blur-sm rounded-lg p-2 border">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Mode:</span>
        <Button
          variant={useSliceControl ? "outline" : "default"}
          size="sm"
          onClick={() => setUseSliceControl(false)}
          className="text-xs"
        >
          Standard
        </Button>
        <Button
          variant={useSliceControl ? "default" : "outline"}
          size="sm"
          onClick={() => setUseSliceControl(true)}
          className="text-xs"
        >
          <ToggleRight className="w-3 h-3 mr-1" />
          Slice Control
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <MainPanel/> 
    {variable == 'Default' && <LandingShapes />}
      <Error />
      {!plotOn && <Navbar />}
      <Loading />
  
      {/* Show workflow toggle when a variable is selected */}
      {variable !== "Default" && <WorkflowToggle />}
    
      {/* {variable === "Default" && <ScrollableLinksTable />} */}
      
      {/* Conditional rendering based on workflow selection */}
      {variable !== "Default" && !useSliceControl && <Plot ZarrDS={ZarrDS} />}
      {variable !== "Default" && useSliceControl && <PlotWithSliceControl ZarrDS={ZarrDS} />}
      
      {metadata && <Metadata data={metadata} /> }
      {Object.keys(timeSeries).length >= 1 && <PlotArea />}
    </>
  );
}

export default LandingHome;