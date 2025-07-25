"use client";

import React, {useRef, useEffect, useState} from 'react'
import './css/MainPanel.css'
import {PlotType, Variables, Colormaps, AdjustPlot, Dataset, PlayButton} from './index'
import { Card } from "@/components/ui/card"

const MainPanel = () => {

  const [currentOpen, setCurrentOpen] = useState<string>("Default") //This will be used to close option windows

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.localName == "canvas" ){
        setCurrentOpen("default)")
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <Card className="panel-container">
      <PlotType />
      <Variables />
      <Colormaps />
      <AdjustPlot  />
      <Dataset  />
      <PlayButton />
  </Card>
  )
}

export default MainPanel
