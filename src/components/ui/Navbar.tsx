"use client";
import React, { useMemo } from "react";
import { LuChevronsUpDown } from "react-icons/lu";
import { IoIosCheckmark } from "react-icons/io";
import Image from "next/image";
import { PlotLineButton } from "@/components/ui";
import ThemeSwitch  from "@/components/ui/ThemeSwitch";
import logo from "@/app/logo.png"
import './css/Navbar.css'
import { useShallow } from "zustand/shallow";
import { useGlobalStore, usePlotStore } from "@/utils/GlobalStates";
import { colormaps } from '@/components/textures';
import { useEffect, useState, useRef } from "react";
import { GetColorMapTexture } from "@/components/textures";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MdFlipCameraIos } from "react-icons/md";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import AboutInfo from "@/components/ui/AboutInfo";
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

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const ColorMaps = ({cmap, setCmap} : {cmap : string, setCmap : React.Dispatch<React.SetStateAction<string>>}) => {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>    
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[100%] justify-between"
        >
          {cmap === "Default" ?  "Select Colormap..." : cmap }
          <LuChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[100%] p-0">
        <Command>
          <CommandInput placeholder="Search framework..." />
          <CommandList>
            <CommandEmpty>No Colormap found.</CommandEmpty>
            <CommandGroup>
              {colormaps.map((value) => (
                <CommandItem
                  key={value}
                  value={value}
                  onSelect={(currentValue) => {
                    setCmap(currentValue)
                    setOpen(false);
                  }}
                >
                  <IoIosCheckmark
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === cmap ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {value}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )

}

const Navbar = React.memo(function Navbar(){
  const {setInitStore, setVariable, setColormap, setTimeSeries, setDimCoords, isFlat, plotOn, variables, variable} = useGlobalStore(
    useShallow(state=>({
      setInitStore : state.setInitStore, 
      setVariable : state.setVariable,
      setColormap : state.setColormap,
      setTimeSeries: state.setTimeSeries,
      setDimCoords: state.setDimCoords,
      isFlat: state.isFlat,
      plotOn: state.plotOn,
      variables: state.variables,
      variable: state.variable
    })))


  const {setPlotType, plotType, resetCamera, setAnimate, setResetCamera} = usePlotStore(useShallow(state=> ({
    setPlotType: state.setPlotType,
    plotType: state.plotType,
    resetCamera: state.resetCamera,
    setAnimate: state.setAnimate,
    setResetCamera: state.setResetCamera
  })))

  const [showStoreInput, setShowStoreInput] = useState<boolean>(false)
  const [showLocalInput, setShowLocalInput] = useState<boolean>(false)
  const [cmap, setCmap] = useState<string>("Default")
  const [flipCmap, setFlipCmap] = useState<boolean>(false)
  const colormap = useGlobalStore(useShallow(state=>state.colormap))
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const navRef = useRef<HTMLElement | null>(null)

  useEffect(()=>{
    setColormap(GetColorMapTexture(colormap, cmap === "Default" ? "Spectral" : cmap, 1, "#000000", 0, flipCmap));
  },[cmap, flipCmap])

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleDocumentPointer(event: MouseEvent | TouchEvent) {
      if (!isOpen) return;
      const target = event.target as Node | null;
      if (navRef.current && target && !navRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleDocumentPointer);
    document.addEventListener("touchstart", handleDocumentPointer, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentPointer);
      document.removeEventListener("touchstart", handleDocumentPointer);
      document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);
  
  return (
    <nav className="navbar" ref={navRef}>
      <button
        type="button"
        className="navbar-trigger"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        title={isOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <FiveDotsIcon className="navbar-trigger-icon rotating" />
      </button>

      <div className={cn("navbar-content", isOpen ? "open" : "closed")}>        
        <div className="navbar-left">
          <Drawer>
            <DrawerTrigger asChild>
              <div role="button " className="cursor-pointer" tabIndex={0} aria-label="About Browzarr" title="About Browzarr">
                <Image src={logo} alt="browzarr" />
              </div>
            </DrawerTrigger>
            <DrawerContent className="max-w-md mx-auto">
              <DrawerHeader>
                <DrawerTitle>About</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <AboutInfo />
              </div>
            </DrawerContent>
          </Drawer>
          
          {plotOn && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Reset camera view"
              title="Reset camera view"
              onClick={() => setResetCamera(!resetCamera)}
              className="w-[32px] h-[32px] cursor-pointer flex items-center justify-center transition-transform hover:shadow-white/40 transition-shadow hover:scale-90 hover:shadow-lg"
            >
              <MdFlipCameraIos className="w-full h-full" />
            </div>
          )}
          {/* {!isFlat && plotOn && <PlotTweaker/>} */}
          {plotOn && !isFlat && <PlotLineButton />}
        </div>

        <ThemeSwitch />
      </div>
    </nav>
  );
});

export default Navbar;