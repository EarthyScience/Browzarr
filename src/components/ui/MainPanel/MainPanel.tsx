"use client";

import React from 'react'
import '../css/MainPanel.css'
import {PlotType, Variables, Colormaps, AdjustPlot, Dataset, PlayButton, AnalysisOptions} from '../index'
import { Card } from "@/components/ui/card"
import { useGlobalStore } from '@/GlobalStates/GlobalStore';


const MainPanel = () => {
  const bivariate = useGlobalStore( s=> s.bivariate);
  return (
    <Card className="panel-container">
      <Dataset />
      <Variables />
      <PlotType />
      <Colormaps />
      <AdjustPlot  />
      <PlayButton />
      {!bivariate && <AnalysisOptions />}
    </Card>

  )
}

export default MainPanel
