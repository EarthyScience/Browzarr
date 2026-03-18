"use client";

import React, {useState} from 'react'
import '../css/MainPanel.css'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import {PlotType, Variables, Colormaps, AdjustPlot, Dataset, PlayButton, AnalysisOptions} from '../index'
import { Card } from "@/components/ui/card"


const MainPanel = () => {
  const { openVariables, setOpenVariables } = useGlobalStore(useShallow(s => ({
    openVariables: s.openVariables,
    setOpenVariables: s.setOpenVariables,
  })));

  return (
    <Card className="panel-container">
      <Dataset  setOpenVariables={setOpenVariables} />
      <Variables openVariables={openVariables} setOpenVariables={setOpenVariables} />
      <PlotType />
      <Colormaps />
      <AdjustPlot  />
      <PlayButton />
      <AnalysisOptions />
    </Card>

  )
}

export default MainPanel
