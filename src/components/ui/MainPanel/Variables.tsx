"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { TbVariable } from "react-icons/tb";
import { Loader2 } from "lucide-react";
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from "zustand/shallow";
import { Separator } from "@/components/ui/separator";
import MetaDimSelector from "./MetaDimSelector";
import { GetDimInfo } from "@/utils/HelperFuncs";
import { GetAttributes } from "@/components/zarr/ZarrLoaderLRU";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button-enhanced";
import { Input } from "../input";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


const Variables = () => {
  const isMobile = useIsMobile();
  const popoverSide = isMobile ? "top" : "left";
  const [openMetaPopover, setOpenMetaPopover] = useState(false);

  const [showMeta, setShowMeta] = useState(false);
  const { variables, zMeta, metadata, initStore, openVariables, setMetadata, setOpenVariables } = useGlobalStore(
    useShallow((state) => ({
      variables: state.variables,
      zMeta: state.zMeta,
      metadata: state.metadata,
      initStore: state.initStore,
      openVariables: state.openVariables,
      setMetadata: state.setMetadata,
      setOpenVariables: state.setOpenVariables
    }))
  );



  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [isLoadingVar, setIsLoadingVar] = useState<string | null>(null);
  const activeRequest = useRef<string | null>(null);
  const isInteractingWithMeta = useRef(false);
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

  const handleOpenChange = (open: boolean) => {
    if (!open && isInteractingWithMeta.current) {
      return; // Do not close if interacting with Meta popovers/portals
    }
    setOpenVariables(open);
  };

  // Handle variable selection
  const handleVariableSelect = (val: string, idx: number) => {
    if (selectedVar === val && meta?.name === val && metadata) {
      if (popoverSide === "left") {
        setOpenMetaPopover(true);
      } else {
        setShowMeta(true);
      }
      return;
    }

    setIsLoadingVar(val);
    setSelectedVar(val);
    setMeta(null);
    setMetadata(null);
    activeRequest.current = val;

    Promise.all([GetDimInfo(val), GetAttributes(val)]).then(([dimInfo, attr]) => {
      if (activeRequest.current !== val) return;

      const relevant = zMeta?.find((e: any) => e.name === val);
      if (relevant) {
        setMeta({
          ...relevant,
          dimInfo: {
            dimArrays: dimInfo.dimArrays,
            dimNames: dimInfo.dimNames,
            dimUnits: dimInfo.dimUnits,
          },
        });
      }
      setMetadata(attr);
      setIsLoadingVar(null);

      if (popoverSide === "left") {
        setOpenMetaPopover(true);
      } else {
        setShowMeta(true);
      }
    }).catch((err) => {
      if (activeRequest.current === val) {
        setIsLoadingVar(null);
      }
      console.error("Failed to fetch dimension info or attributes:", err);
    });
  };

  useEffect(() => {
    setSelectedVar(null);
    setMeta(null);
    setMetadata(null);
  }, [initStore, setMetadata]);

  // Variable item renderer (keeps separator between variables in same group)
  const VariableItem = ({ val, idx, arrayLength }: { val: string; idx: number; arrayLength: number }) => {
    const variableName = val.split('/').pop() || val;
    const isLastItem = idx === arrayLength - 1;

    return (
      <React.Fragment key={val}>
        <div
          className={`cursor-pointer pl-2 py-1 text-sm rounded flex items-center justify-between transition-colors ${
            selectedVar === val 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-muted"
          }`}
          onClick={() => handleVariableSelect(val, idx)}
        >
          <span>{variableName}</span>
          {isLoadingVar === val && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
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
      <Popover open={openVariables} onOpenChange={handleOpenChange}>
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
            // Prevent the main variable list from closing when interacting with Meta popups/portals.
            // We set a flag instead of calling e.preventDefault() so that native text selection still works!
            if (
              target.closest('[data-meta-popover]') ||
              target.closest('.metadata-dialog') ||
              target.closest('[data-slot="combobox-content"]') ||
              target.closest('[role="dialog"]') ||
              target.closest('[role="listbox"]') ||
              target.closest('[data-radix-popper-content-wrapper]')
            ) {
              isInteractingWithMeta.current = true;
              setTimeout(() => {
                isInteractingWithMeta.current = false;
              }, 0);
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
            className="max-h-[80vh] overflow-y-auto w-[400px]"
          >
            {metadata && meta && (
              <MetaDimSelector
                key={selectedVar || "none"}
                meta={meta}
                metadata={metadata}
                onApply={(sels, axes) => {
                  // close UI after applying selections
                  setOpenMetaPopover(false);
                  setOpenVariables(false);
                  // future: persist sels/axes to store
                  console.log('Applied slices', sels, axes);
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      )}
      {popoverSide === "top" && (
        <Dialog open={showMeta} onOpenChange={setShowMeta} modal={false}>
          <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[85vw] md:max-w-2xl max-h-[80vh] overflow-y-auto px-4 sm:px-6">
            <DialogTitle>{ }</DialogTitle>
            <DialogDescription className="sr-only">Variables configuration dialog</DialogDescription>
            <div className="-mt-4">
              {meta && metadata && (
                <MetaDimSelector
                  key={selectedVar || "none"}
                  meta={meta}
                  metadata={metadata}
                  onApply={(sels, axes) => {
                    setShowMeta(false);
                    setOpenVariables(false);
                    console.log('Applied slices', sels, axes);
                  }}
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