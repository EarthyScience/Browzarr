"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TbVariable } from "react-icons/tb";
import { useGlobalStore, useZarrStore } from "@/utils/GlobalStates";
import { useShallow } from "zustand/shallow";
import { Separator } from "@/components/ui/separator";
import MetaDataInfo from "./MetaDataInfo";
import { GetDimInfo } from "@/utils/HelperFuncs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "../input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZarrDataset } from "@/components/zarr/ZarrLoaderLRU";

const Variables = ({
  openVariables,
  setOpenVariables,
}: {
  openVariables: boolean;
  setOpenVariables: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [popoverSide, setPopoverSide] = useState<"left" | "top">("left");
  const [openMetaPopover, setOpenMetaPopover] = useState(false);

  const [showMeta, setShowMeta] = useState(false);
  const { variables, zMeta, metadata, setMetadata, initStore } = useGlobalStore(
    useShallow((state) => ({
      variables: state.variables,
      zMeta: state.zMeta,
      metadata: state.metadata,
      setMetadata: state.setMetadata,
      initStore: state.initStore
    }))
  );
  const { currentStore } = useZarrStore(useShallow(state => ({
    currentStore: state.currentStore,
  })))
  const ZarrDS = useMemo(() => new ZarrDataset(currentStore), [currentStore])

  const [dimArrays, setDimArrays] = useState([[0],[0],[0]])
  const [dimUnits, setDimUnits] = useState([null,null,null])
  const [dimNames, setDimNames] = useState<string[]> (["Default"])

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return variables;
    return variables.filter((variable) =>
      variable.toLowerCase().includes(q)
    );
  }, [query, variables]);

  useEffect(() => {
    if (variables && zMeta && selectedVar) {
      const relevant = zMeta.find((e: any) => e.name === selectedVar);
      if (relevant){
        setMeta({...relevant, dimInfo : {dimArrays, dimNames, dimUnits}});
        ZarrDS.GetAttributes(selectedVar).then(e=>setMetadata(e))
      }
    }
  }, [selectedVar, variables, zMeta, dimArrays, dimNames, dimUnits]);

  useEffect(()=>{
    setSelectedIndex(null)
    setSelectedVar(null)
    setMeta(null)
    setMetadata(null)
  },[initStore])

  useEffect(() => {
    const handleResize = () => {
      setPopoverSide(window.innerWidth < 768 ? "top" : "left");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const VariableList = (
    <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden">
      {filtered.length > 0 ? (
        filtered.map((val, idx) => (
          <React.Fragment key={idx}>
            <div
              className="cursor-pointer pl-2 py-1 text-sm hover:bg-muted rounded"
              style={{
                background:
                  idx === selectedIndex ? "var(--muted-foreground)" : "",
              }}
              onClick={() => {
                setSelectedIndex(idx);
                setSelectedVar(val);
                GetDimInfo(val).then(e=>{setDimNames(e.dimNames); setDimArrays(e.dimArrays); setDimUnits(e.dimUnits)})
                if (popoverSide === "left") {
                  setOpenMetaPopover(true);
                } else {
                  setShowMeta(true);
                }
              }}
            >
              {val}
            </div>
            {idx !== filtered.length - 1 && <Separator className="my-1" />}
          </React.Fragment>
        ))
      ) : (
        <div className="text-center text-muted-foreground py-2">
          {query
            ? "No variables found matching your search."
            : "No variables available."}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Popover open={openVariables} onOpenChange={setOpenVariables}>
        <PopoverTrigger asChild>
          <div>
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
                    tabIndex={0}
                    aria-label="Select variable"
                  >
                    <TbVariable className="size-8" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side={popoverSide === "left" ? "left" : "top"}
                align={popoverSide === "left" ? "start" : "center"}
              >
                <span>Select Variable</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </PopoverTrigger>

        <PopoverContent
          side={popoverSide}
          className="max-h-[50vh] overflow-hidden flex flex-col"
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            // If the click is inside the MetaData popover, do not close
            if (target.closest('[data-meta-popover]')) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex items-center gap-2 mb-4 justify-center max-w-[240px] md:max-w-sm mx-auto flex-shrink-0">
            <Input
              placeholder="Search variable..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" onClick={() => setQuery("")}>
              Clear
            </Button>
          </div>

          {VariableList}
        </PopoverContent>
      </Popover>

      {popoverSide === "left" && (
        <Popover open={openMetaPopover} onOpenChange={setOpenMetaPopover}>
          <PopoverTrigger asChild>
            <div
          className="absolute -top-8" // adjust top position as needed
          style={{
            left: `-${280}px`, // move left
            }}
        />
          </PopoverTrigger>
          <PopoverContent
            data-meta-popover
            side="left"
            align="start"
            className="max-h-[80vh] overflow-y-auto w-[300px]"
          >
            {meta && (
                <MetaDataInfo 
                  meta={meta}
                  metadata={metadata??{}}
                  setShowMeta={setOpenMetaPopover} 
                  setOpenVariables={setOpenVariables}
                  popoverSide={"left"}
                />
            )}
          </PopoverContent>
        </Popover>
      )}
      {popoverSide === "top" && (
        <Dialog open={showMeta} onOpenChange={setShowMeta}>
          <DialogContent className="max-w-[85%] md:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogTitle>{}</DialogTitle>
            <div className="-mt-4">
              {meta && (
                <MetaDataInfo
                  meta={meta}
                  metadata={metadata??{}}
                  setShowMeta={setShowMeta}
                  setOpenVariables={setOpenVariables}
                  popoverSide={"top"}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Variables;