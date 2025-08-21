"use client";
import 'rc-slider/assets/index.css'
import React, {useState} from 'react'
import '../css/MainPanel.css'
import {PlotType, Variables, Colormaps, AdjustPlot, Dataset, PlayButton, AnalysisOptions} from '../index'
import { PiFileMagnifyingGlass } from "react-icons/pi";
import { Card } from "@/components/ui/card"
import { useAnalysisStore } from '@/utils/GlobalStates';
import { useShallow } from 'zustand/shallow';

const MainPanel = () => {
  const [openVariables, setOpenVariables] = useState<boolean>(false)
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
