"use client";

import React, {useEffect, useState, useMemo} from 'react'
import { GetColorMapTexture, colormaps, availableColorMapNames, getColormapGradientCss } from '@/components/textures';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { MdOutlineSwapVert } from "react-icons/md";
import { ButtonGroup } from "@/components/ui/button-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button-enhanced";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

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

  const displayColormapName = (colormapName || '').length > 5
    ? `${(colormapName || '').slice(0, 5)}…`
    : (colormapName || '');

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
        <style>{`\n.colormaps .rendered-cmap, .colormaps .cmap-trigger, .colormaps .search-input {\n  border: 1px solid rgba(0,0,0,0.08);\n}\n@media (prefers-color-scheme: dark) {\n  .colormaps .rendered-cmap, .colormaps .cmap-trigger, .colormaps .search-input {\n    border: 1px solid rgba(255,255,255,0.12);\n  }\n}\n`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ButtonGroup className="justify-start gap-0.25">
              <Button
                type="button"
                onClick={() => setFlipColormap(!flipColormap)}
                size="sm"
                variant="secondary"
                className="cursor-pointer"
              >
                {flipColormap ? 'Unflip' : 'Flip'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setColormapName(prevColormapName);
                  setFlipColormap(false);
                  setHoveredCmap(null);
                }}
                size="sm"
                variant="secondary"
                className="cursor-pointer"
              >
                Revert
              </Button>
            </ButtonGroup>

            <div style={{ marginLeft: 'auto' }}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" style={{ cursor: 'default' }}>
                    {displayColormapName}
                  </Button>
                </TooltipTrigger>
                {colormapName && colormapName.length > 5 && (
                  <TooltipContent side="top" align="center">
                    <span>{colormapName}</span>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
          <Separator/>
          <InputGroup className="max-w-xs">
            <InputGroupInput 
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search..."
             />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        <Separator/>
        </div>
        {searchQuery.trim() && (
          <div className="search-results-summary" style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--ui-text-muted)' }}>
            Showing <strong>{visibleMatches.length}</strong> of <strong>{filteredColormaps.length}</strong> matches for{' "'}{searchQuery}{'"'}
            {hasMoreResults && ' — first 64 shown'}
          </div>
        )}

        <div className="colormap-list-container" style={{ marginTop: '0.5rem' }}>
          <div style={{ maxHeight: '40vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
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
                backgroundImage: getColormapGradientCss(val),
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: '100% 100%',
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
        </div>
        {filteredColormaps.length === 0 && (
          <div style={{ padding: '1rem 0', color: 'var(--ui-text-muted)' }}>
            No colormaps found. Try a different search term.
          </div>
        )}
        </div>
      </PopoverContent>
      
      </Popover>
    </div>
  );
};

export default Colormaps
