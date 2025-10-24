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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let filteredVars = variables;
    
    if (q) {
      filteredVars = variables.filter((variable) =>
        variable.toLowerCase().includes(q)
      );
    }
    
    // Group variables by their groupPath
    const grouped: { [key: string]: string[] } = {};
    const rootVars: string[] = [];
    
    filteredVars.forEach((variable) => {
      const metadata = zMeta?.find((meta: any) => meta.name === variable);
      if (metadata && 'groupPath' in metadata && metadata.groupPath) {
        if (!grouped[metadata.groupPath as string]) {
          grouped[metadata.groupPath as string] = [];
        }
        grouped[metadata.groupPath as string].push(variable);
      } else {
        rootVars.push(variable);
      }
    });
    
    return { grouped, rootVars };
  }, [query, variables, zMeta]);

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

  // Auto-open accordion items when searching
  useEffect(() => {
    if (query.trim()) {
      const itemsToOpen: string[] = [];
      
      // Add root if it has matches
      if (filtered.rootVars.length > 0) {
        itemsToOpen.push("root");
      }
      
      // Add groups that have matches
      Object.keys(filtered.grouped).forEach(groupPath => {
        if (filtered.grouped[groupPath].length > 0) {
          itemsToOpen.push(groupPath);
        }
      });
      
      setOpenAccordionItems(itemsToOpen);
    } else {
      // When no search, close all accordion items and keep it open if it is root
      const hasRootOnly = filtered.rootVars.length > 0 && Object.keys(filtered.grouped).length === 0;
      if (hasRootOnly) {
        setOpenAccordionItems(["root"]);
      } else {
        setOpenAccordionItems([]);
      }
    }
  }, [query, filtered]);

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
      {filtered.rootVars.length > 0 || Object.keys(filtered.grouped).length > 0 ? (
        <Accordion 
          type="multiple" 
          className="w-full"
          value={openAccordionItems}
          onValueChange={setOpenAccordionItems}
        >
          {/* Root level variables */}
          {filtered.rootVars.length > 0 && (
            <AccordionItem value="root">
              <AccordionTrigger>Root Variables</AccordionTrigger>
              <AccordionContent className="flex flex-col">
                {filtered.rootVars.map((val, idx) => {
                  // Extract just the variable name from the full path
                  const variableName = val.split('/').pop() || val;
                  return (
                    <React.Fragment key={`root-${idx}`}>
                      <div
                        className="cursor-pointer pl-2 py-1 text-sm hover:bg-muted rounded"
                        style={{
                          background:
                            selectedVar === val ? "var(--muted-foreground)" : "",
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
                        {variableName}
                      </div>
                      {idx !== filtered.rootVars.length - 1 && <Separator className="my-1" />}
                    </React.Fragment>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          )}
          
          {/* Grouped variables */}
          {Object.entries(filtered.grouped).map(([groupPath, groupVars]) => (
            <AccordionItem key={groupPath} value={groupPath}>
              <AccordionTrigger>{groupPath}</AccordionTrigger>
              <AccordionContent className="flex flex-col">
                {groupVars.map((val, idx) => {
                  // Extract just the variable name from the full path
                  const variableName = val.split('/').pop() || val;
                  return (
                    <React.Fragment key={`${groupPath}-${idx}`}>
                      <div
                        className="cursor-pointer pl-2 py-1 text-sm hover:bg-muted rounded"
                        style={{
                          background:
                            selectedVar === val ? "var(--muted-foreground)" : "",
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
                        {variableName}
                      </div>
                      {idx !== groupVars.length - 1 && <Separator className="my-1" />}
                    </React.Fragment>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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