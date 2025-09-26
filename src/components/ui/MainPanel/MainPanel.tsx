"use client";
import React, { useState, useMemo, useCallback } from 'react'
import '../css/MainPanel.css'
import { PlotType, Variables, Colormaps, AdjustPlot, Dataset, PlayButton, AnalysisOptions } from '../index'
import { Card } from "@/components/ui/card"
import { useSliceUpdater } from '@/components/plots/SliceUpdater';
import { ZarrDataset } from '@/components/zarr/ZarrLoaderLRU';
import { useGlobalStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';

interface MainPanelProps {
  ZarrDS: ZarrDataset;
}

const MainPanel: React.FC<MainPanelProps> = ({ ZarrDS }) => {
  const [openVariables, setOpenVariables] = useState<boolean>(false);
  const [sliceLoading, setSliceLoading] = useState(false);
  
  // Get metadata and is4D from global state
  const { metadata, is4D } = useGlobalStore(useShallow(state => ({
    metadata: state.metadata,
    is4D: state.is4D
  })));
  
  // Extract total time length from metadata
  const totalTimeLength = useMemo(() => {
    if (!metadata?.shape) return null;
    
    // For 4D data, time is the second dimension (index 1)
    // For 3D data, time is the first dimension (index 0)
    if (is4D && metadata.shape.length >= 2) {
      return metadata.shape[1];
    } else if (!is4D && metadata.shape.length >= 1) {
      return metadata.shape[0];
    }
    
    return null;
  }, [metadata, is4D]);

  // Use your existing slice updater hook
  const { updateSlice, isUpdating } = useSliceUpdater({
    ZarrDS,
    onTextureUpdate: useCallback(() => {
      // Texture updates are handled by global state through setDataArray
      // This callback can be empty or used for additional logic if needed
    }, []),
    onLoadingChange: setSliceLoading
  });

  return (
    <Card className="panel-container">
      <Dataset setOpenVariables={setOpenVariables} />
      <Variables openVariables={openVariables} setOpenVariables={setOpenVariables} />
      <PlotType />
      <Colormaps />
      <AdjustPlot />
      <PlayButton
        onSliceUpdate={updateSlice}
        isUpdating={isUpdating() || sliceLoading}
        totalTimeLength={totalTimeLength}
      />
      <AnalysisOptions />
    </Card>
  );
}

export default MainPanel;