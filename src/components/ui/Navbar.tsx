"use client";
import React from "react";
import { PlotLineButton, ExportImageSettings  } from "@/components/ui";
import ThemeSwitch  from "@/components/ui/ThemeSwitch";
import './css/Navbar.css'
import { useShallow } from "zustand/shallow";
import { useGlobalStore, useImageExportStore, usePlotStore } from "@/utils/GlobalStates";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MdFlipCameraIos } from "react-icons/md";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"


// Custom rotating five-dots icon
const FiveDotsIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Grey, Red, Green, Gold, Pink arranged on a pentagon */}
      <circle cx="50" cy="20" r="12" fill="#9CA3AF" />
      <circle cx="78.53" cy="40.73" r="12" fill="#EF4444" />
      <circle cx="67.63" cy="74.27" r="12" fill="#10B981" />
      <circle cx="32.37" cy="74.27" r="12" fill="#F59E0B" />
      <circle cx="21.47" cy="40.73" r="12" fill="#EC4899" />
    </svg>
  );
};

const Navbar = React.memo(function Navbar(){
  const { isFlat, plotOn} = useGlobalStore(
    useShallow(state=>({
      isFlat: state.isFlat,
      plotOn: state.plotOn,
    })))

    const {resetCamera,setResetCamera} = usePlotStore(useShallow(state=> ({
    resetCamera: state.resetCamera,
    setResetCamera: state.setResetCamera
  })))

  const [isOpen, setIsOpen] = useState<boolean>(true)
  const navRef = useRef<HTMLElement | null>(null)

  
  return (
    <nav className="navbar" ref={navRef}>
      <Tooltip delayDuration={500} >
        <TooltipTrigger asChild>
           <Button
            variant="ghost"
            size="icon"
            className="navbar-trigger size-10"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <FiveDotsIcon className="navbar-trigger-icon rotating size-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" align="start">
          {isOpen ? 'Close navigation' : 'Open navigation'}
        </TooltipContent>
      </Tooltip>

      <div className={cn("navbar-content", isOpen ? "open" : "closed")}>        
        <div className="navbar-left">
          {plotOn && (
            <Tooltip delayDuration={500} >
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 cursor-pointer"
                  tabIndex={0}
                  onClick={() => setResetCamera(!resetCamera)}
                >
                  <MdFlipCameraIos className="size-8" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="start">
                <span>Reset camera view</span>
              </TooltipContent>
            </Tooltip>

          )}
          {plotOn && !isFlat && <PlotLineButton />}
          {plotOn && 
          <ExportImageSettings />
          }
          <ThemeSwitch />
        </div>
      </div>
    </nav>
  );
});

export default Navbar;