"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TbVariable } from "react-icons/tb";
import { useGlobalStore, useZarrStore } from "@/utils/GlobalStates";
import { useShallow } from "zustand/shallow";
import { Separator } from "@/components/ui/separator";
import MetaDataInfo from "./MetaDataInfo";
import { GetDimInfo } from "@/utils/HelperFuncs";
import { GetAttributes } from "@/components/zarr/ZarrLoaderLRU";
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
      dimNames:state.dimNames,
      setMetadata: state.setMetadata,
      setDimNames:state.setDimNames,
      initStore: state.initStore
    }))
  );

  const [dimArrays, setDimArrays] = useState([[0],[0],[0]]);
  const [dimUnits, setDimUnits] = useState([null,null,null]);
  const [dimNames, setDimNames] = useState<string[]>(["Default"]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [query, setQuery] = useState("");
  // root *open by default* (collapsible but starts open)
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(["root"]);

  // Build nested variable tree
  const tree = useMemo(() => {
    const q = query.toLowerCase().trim();
    let filteredVars = variables ?? [];

    if (q) {
      filteredVars = filteredVars.filter((variable) =>
        variable.toLowerCase().includes(q)
      );
    }

    const buildTree = (vars: string[]) => {
      const t: any = {};
      vars.forEach((v) => {
        const parts = v.split("/");
        let current = t;
        parts.forEach((p, i) => {
          if (!current[p]) current[p] = i === parts.length - 1 ? null : {};
          current = current[p];
        });
      });
      return t;
    };

    return buildTree(filteredVars);
  }, [query, variables]);

  // Get all group paths (for auto-open when searching)
  const getGroupPaths = (subtree: any, basePath = ""): string[] => {
    let paths: string[] = [];
    Object.entries(subtree).forEach(([key, value]) => {
      const currentPath = basePath ? `${basePath}/${key}` : key;
      if (value && typeof value === "object") {
        paths.push(currentPath);
        paths = paths.concat(getGroupPaths(value, currentPath));
      }
    });
    return paths;
  };

  // Auto-open accordions that contain matches
  useEffect(() => {
    if (query.trim()) {
      const openPaths = getGroupPaths(tree);
      setOpenAccordionItems(["root", ...openPaths]);
    } else {
      // when not searching keep root open by default
      setOpenAccordionItems(["root"]);
    }
  }, [query, tree]);

  // Handle variable selection
  const handleVariableSelect = (val: string, idx: number) => {
    setSelectedIndex(idx);
    setSelectedVar(val);
    GetDimInfo(val).then(e => {
      setDimNames(e.dimNames);
      setDimArrays(e.dimArrays);
      setDimUnits(e.dimUnits);
    });

    if (popoverSide === "left") {
      setOpenMetaPopover(true);
    } else {
      setShowMeta(true);
    }
  };

  useEffect(() => {
    if (variables && zMeta && selectedVar) {
      const relevant = zMeta.find((e: any) => e.name === selectedVar);
      if (relevant){
        setMeta({...relevant, dimInfo : {dimArrays, dimNames, dimUnits}});
        GetAttributes(selectedVar).then(e=>setMetadata(e));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVar, variables, zMeta, dimArrays, dimNames, dimUnits]);

  useEffect(()=>{
    setSelectedIndex(null);
    setSelectedVar(null);
    setMeta(null);
    setMetadata(null);
  },[initStore, setMetadata]);

  useEffect(() => {
    const handleResize = () => {
      setPopoverSide(window.innerWidth < 768 ? "top" : "left");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Variable item renderer (keeps separator between variables in same group)
  const VariableItem = ({ val, idx, arrayLength }: { val: string; idx: number; arrayLength: number }) => {
    const variableName = val.split('/').pop() || val;
    const isLastItem = idx === arrayLength - 1;

    return (
      <React.Fragment key={val}>
        <div
          className="cursor-pointer pl-2 py-1 text-sm hover:bg-muted rounded"
          style={{
            background: selectedVar === val ? "var(--muted-foreground)" : "",
          }}
          onClick={() => handleVariableSelect(val, idx)}
        >
          {variableName}
        </div>
        {!isLastItem && <Separator className="my-1" />}
      </React.Fragment>
    );
  };

  // render a subtree inside an Accordion (ensures AccordionItem children are direct children of an Accordion)
  const renderSubtreeAccordion = (subtree: any, basePath = "") => {
    // Determine entries (keep variables first then groups for clarity)
    const entries = Object.entries(subtree);
    const variableEntries = entries.filter(([_, v]) => v === null);
    const groupEntries = entries.filter(([_, v]) => v && typeof v === "object");

    return (
      <Accordion
        key={basePath || "__root_inner__"}
        type="multiple"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
        className="w-full"
      >
        {/* variables at this level */}
        {variableEntries.length > 0 && (
          <div className="px-1">
            {variableEntries.map(([name], idx) => {
              const varPath = basePath ? `${basePath}/${name}` : name;
              return (
                <VariableItem
                  key={varPath}
                  val={varPath}
                  idx={idx}
                  arrayLength={variableEntries.length}
                />
              );
            })}
          </div>
        )}

        {/* groups at this level */}
        {groupEntries.map(([name, subtreeValue]) => {
          const currentPath = basePath ? `${basePath}/${name}` : name;
          return (
            <AccordionItem key={currentPath} value={currentPath}>
              <AccordionTrigger className="cursor-pointer pl-2">
                {name}
              </AccordionTrigger>
              <AccordionContent className="flex flex-col pl-2">
                {/* recursively render children inside their own Accordion */}
                {renderSubtreeAccordion(subtreeValue, currentPath)}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  // render full Variable list under "root" accordion item
  const VariableList = (
    <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden">
      {Object.keys(tree).length > 0 ? (
        <Accordion
          type="multiple"
          className="w-full"
          value={openAccordionItems}
          onValueChange={setOpenAccordionItems}
        >
          <AccordionItem key="root" value="root">
            <AccordionTrigger className="cursor-pointer">/</AccordionTrigger>
            <AccordionContent className="flex flex-col">
              {/* render the top-level subtree inside its own Accordion so nested AccordionItems are legal */}
              {renderSubtreeAccordion(tree, "")}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <div className="text-center text-muted-foreground py-2">
          {query ? "No variables found matching your search." : "No variables available."}
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
                left: `-${280}px`, // move to left of variable popover
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
                metadata={metadata ?? {}}
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
                  metadata={metadata ?? {}}
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