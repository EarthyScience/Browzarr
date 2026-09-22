"use client";

import React, { useEffect, useState, } from 'react'
import { getColormapGradientCss } from '@/components/textures';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button-enhanced";
import { QuickTip } from '../Widgets/QuickTip';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useColormapStore } from '@/GlobalStates/ColormapStore';
import { useShallow } from 'zustand/shallow';
import UnivariateColor from '../Elements/UnivariateColor';
import BivariateColormap from '../Elements/BivariateColor';

const Colormaps = () => {
  const {colormapName, flipColormap} = useColormapStore(useShallow(s => ({
    colormapName: s.colormapName, flipColormap:s.flipColormap})))
  const bivariate = useGlobalStore(s => s.bivariate)
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");

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
        <QuickTip message='Change Colormap' side={popoverSide}>
          <div>
              <Button
                size="icon"
                className='cursor-pointer hover:scale-90 transition-transform duration-100 ease-out rounded-full cmap-trigger'
                style={{
                  backgroundImage: getColormapGradientCss((colormapName === 'Default' ? 'Spectral' : colormapName) || 'Spectral'),
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  backgroundSize: '100% 100%',
                  transform: flipColormap ? "scaleX(-1)" : "",
                  width: "32px",
                  height: "32px",
                }} /> 
            </div>
        </QuickTip>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={popoverSide}
        className="colormaps"
        style={{
          width: bivariate ? '360px' : '280px',
          maxWidth: 'calc(100vw - 1.5rem)',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          padding: 0,
          boxSizing: 'border-box',
          maxHeight: popoverSide === 'top' ? '80vh' : undefined,
        }}
      >
        {bivariate 
          ? <BivariateColormap size={360 - 20}/>
          : <UnivariateColor /> 
        }
      </PopoverContent>
      </Popover>
    </div>
  );
};

export default Colormaps
