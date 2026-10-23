"use client";

import React from 'react'
import '../css/MainPanel.css'
import {PlotType, Variables, Colormaps, AdjustPlot, Dataset, PlayButton, AnalysisOptions} from '../index'
import { Card } from "@/components/ui/card"
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';


const MainPanel = () => {
  const {bivariate, isFlat} = useGlobalStore(useShallow(s=> ({
    bivariate: s.bivariate, isFlat: s.isFlat
  })));
  return (
    <Card className="panel-container">
      <Dataset />
      <Variables />
      <PlotType />
      <Colormaps />
      <AdjustPlot  />
      {!isFlat && <PlayButton />}
      {!bivariate && <AnalysisOptions />}
    </Card>
  )
}

export default MainPanel
