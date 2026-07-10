"use client";

import React, {useEffect, useState} from 'react'
import { GetColorMapTexture } from '@/components/textures';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { colormaps } from '@/components/textures';
import { useShallow } from 'zustand/shallow';
import { MdOutlineSwapVert } from "react-icons/md";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button-enhanced";
import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const Colormaps = () => {

  const [hoveredCmap, setHoveredCmap] = useState<string | null>(null);
  const { colormap, setColormap, colormapName, flipColormap, setColormapName, setFlipColormap } = useGlobalStore(
    useShallow((state) => ({
      setColormap: state.setColormap,
      colormap: state.colormap,
      colormapName: state.colormapName,
      flipColormap: state.flipColormap,
      setColormapName: state.setColormapName,
      setFlipColormap: state.setFlipColormap,
    }))
  );
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");

  useEffect(() => {
    setColormap(
      GetColorMapTexture(colormap, (hoveredCmap || colormapName) === "Default" ? "Spectral" : (hoveredCmap || colormapName), 1, "#000000", 0, flipColormap)
    );
  }, [colormapName, flipColormap, hoveredCmap]);

  useEffect(() => {
      const handleResize = () => {
        setPopoverSide(window.innerWidth < 768 ? "top" : "left");
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

  return (
    <div className="relative">
      <Popover>
      <PopoverTrigger asChild>
        <div>
        <Tooltip delayDuration={500} >
          <TooltipTrigger asChild>
            <div>
              <Button
                size="icon"
                className='cursor-pointer hover:scale-90 transition-transform duration-100 ease-out rounded-full'
                style={{
                  backgroundImage: `url(./colormap_icons/${colormapName}.webp)` ,
                  backgroundSize: "100%",
                  transform: flipColormap ? "scaleX(-1)" : "",
                  width: "32px",
                  height: "32px",
                }} /> 
            </div>
          </TooltipTrigger>
          {popoverSide === "left" ? (
            <TooltipContent side="left" align="start">
              <span>Change Colormap</span>
            </TooltipContent>
          ) : (
            <TooltipContent side="top" align="center">
              <span>Change Colormap</span>
            </TooltipContent>
          )}
        </Tooltip>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        className="colormaps"
      >
            {colormaps.map((val) => (
              <Image
                key={val}
                className={`cmap ${flipColormap ? "flipped" : ""}`}
                src={`./colormap_icons/${val}.webp`}
                alt={val}
                height={100}
                width={256}
                onMouseEnter={() => setHoveredCmap(val)}
                onMouseLeave={() => setHoveredCmap(null)}
                onClick={() => {
                  setColormapName(val);
                  setHoveredCmap(null);
                }}
              />
            ))}
        <MdOutlineSwapVert
            className="flipper"
            style={{
              position: "absolute",
              top:"-2rem",
              right: "80%",
              bottom: "90%",
              height: "50px",
              width: "50px",
              cursor: "pointer",
              transform: `${flipColormap ? "rotate(270deg)" : "rotate(90deg)"}`,
              transition: ".25s",
            }}
            onClick={() => setFlipColormap(!flipColormap)}
        />
      </PopoverContent>
      
      </Popover>
    </div>
  );
};

export default Colormaps
