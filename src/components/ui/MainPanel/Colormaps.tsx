"use client";

import React, {useEffect, useState, useMemo} from 'react'
import { GetColorMapTexture, colormaps, availableColorMapNames, getColormapGradientCss } from '@/components/textures';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { MdOutlineSwapVert } from "react-icons/md";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button-enhanced";
// Render gradients directly instead of using pre-generated icon images
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const Colormaps = () => {

  const [searchQuery, setSearchQuery] = useState<string>('');
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

  const [prevColormapName, setPrevColormapName] = useState<string>(colormapName || '');

  const filteredColormaps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return colormaps;
    return availableColorMapNames.filter((name) => name.toLowerCase().includes(query));
  }, [searchQuery]);

  const visibleMatches = useMemo(() => filteredColormaps.slice(0, 64), [filteredColormaps]);
  const hasMoreResults = filteredColormaps.length > visibleMatches.length;

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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
          <button
            type="button"
            onClick={() => setFlipColormap(!flipColormap)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--ui-border)', background: 'var(--ui-bg-accented)', cursor: 'pointer' }}
          >
            {flipColormap ? 'Unflip' : 'Flip'}
          </button>
          <button
            type="button"
            onClick={() => {
              setColormapName(prevColormapName);
              setFlipColormap(false);
              setHoveredCmap(null);
            }}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--ui-border)', background: 'transparent', cursor: 'pointer' }}
          >
            Revert
          </button>
          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--ui-text-muted)' }}>
            {colormapName}{flipColormap ? ' (flipped)' : ''}
          </div>
        </div>
        <div className="colormap-search-bar" style={{ marginBottom: '0.9rem' }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search colormap names"
            className="search-input"
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--ui-border)',
              background: 'var(--ui-bg-code)',
              color: 'var(--ui-text-highlighted)',
            }}
          />
        </div>
        {searchQuery.trim() && (
          <div className="search-results-summary" style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--ui-text-muted)' }}>
            Showing <strong>{visibleMatches.length}</strong> of <strong>{filteredColormaps.length}</strong> matches for{' "'}{searchQuery}{'"'}
            {hasMoreResults && ' — first 64 shown'}
          </div>
        )}
        <div className="colormaps-grid" style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
          {visibleMatches.map((val) => (
            <button
              key={val}
              className={`cmap rendered-cmap ${flipColormap ? "flipped" : ""}`}
              type="button"
              onClick={() => {
                setPrevColormapName(colormapName);
                setColormapName(val);
                setHoveredCmap(null);
              }}
              onMouseEnter={() => setHoveredCmap(val)}
              onMouseLeave={() => setHoveredCmap(null)}
              style={{
                width: '100%',
                height: '34px',
                borderRadius: '0.5rem',
                border: '1px solid var(--ui-border)',
                background: getColormapGradientCss(val),
                color: 'var(--ui-text-highlighted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 0.75rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                textShadow: '0 1px 3px rgba(0,0,0,0.45)',
                overflow: 'hidden',
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
            </button>
          ))}
        </div>
        {filteredColormaps.length === 0 && (
          <div style={{ padding: '1rem 0', color: 'var(--ui-text-muted)' }}>
            No colormaps found. Try a different search term.
          </div>
        )}
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
