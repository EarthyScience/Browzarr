"use client";
import React from 'react'
import '../css/MainPanel.css'
import {PlotType, Variables, Colormaps, AdjustPlot, Dataset, PlayButton, AnalysisOptions} from '../index'
import { Card } from "@/components/ui/card"

const MainPanel = () => {

  return (
    <Card className="panel-container">
      <Dataset  />
      <Variables />
      <PlotType />
      <Colormaps />
      <AdjustPlot  />
      <PlayButton />
      <AnalysisOptions />
    </Card>

  )
}

export default MainPanel
