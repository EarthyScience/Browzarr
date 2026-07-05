'use client';

import { HiInformationCircle } from "react-icons/hi";
import React from "react";
import './css/MetaData.css'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"


import { Button } from "@/components/ui/button-enhanced"
import { useIsMobile } from "@/hooks/use-mobile"

export const defaultAttributes = [
    "long_name",
    "description",
    "units",
    "_ARRAY_DIMENSIONS"
]

export function renderAttributes(
  data: Record<string, any> = {},
  defaultAttributes: string[] = []
): React.ReactNode {
  const keys = Object.keys(data);
  if (keys.length === 0) return [];
  // Order default attributes first
  const orderedKeys = [
    ...defaultAttributes.filter((key) => key in data),
    ...Object.keys(data).filter((key) => !defaultAttributes.includes(key)),
  ];

  return orderedKeys.map((key) => {
    const value = data[key];
    const isDefault = defaultAttributes.includes(key);
    return (
      <React.Fragment key={key}>
        <div
          className={`font-mono ${
            isDefault ? 'font-semibold' : 'text-[var(--muted-foreground)]'
          }`}
        >
          {key}:
        </div>
        <div className="font-mono whitespace-pre-wrap break-words md:col-start-2 md:row-start-auto pl-4 md:pl-2"
          style={{ overflowWrap: 'anywhere' }}
        >
          {typeof value === 'object'
            ? JSON.stringify(value, (_key, val) =>
              typeof val === 'bigint' ? parseInt(val.toString()) : val)
            : String(value)
            }
        </div>
      </React.Fragment>
    );
  });
}
const Metadata = ({ data, variable }: { data: Record<string, any>, variable: string }) => {
    const isMobile = useIsMobile();

    const trigger = (
      <Button
          variant={variable == "Attributes" ? "default" : "ghost"}
          size="icon"
          className="size-6 w-auto cursor-pointer px-2"
          tabIndex={0}
      >
          {variable}
      </Button>
    );

    const content = (
      <div className="max-h-[60vh] text-[12px] overflow-y-auto break-words p-0">
          <div className="grid grid-cols-1 md:grid-cols-[max-content_1fr] gap-x-1 gap-y-[6px]">
              {renderAttributes(data, defaultAttributes)}
          </div>
      </div>
    );

    if (isMobile) {
        return (
            <Dialog>
                <Tooltip delayDuration={500} >
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            {trigger}
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                        <span>Show Variable Attributes</span>
                    </TooltipContent>
                </Tooltip>
                <DialogContent className="metadata-dialog">
                    <DialogHeader>
                        <DialogTitle>Attributes</DialogTitle>
                        <DialogDescription className="sr-only">Metadata Information for variable</DialogDescription>
                    </DialogHeader>
                    {content}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Popover>
            <Tooltip delayDuration={500} >
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        {trigger}
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start">
                    <span>Show Variable Attributes</span>
                </TooltipContent>
            </Tooltip>
            <PopoverContent 
              className="w-[300px] max-h-[50vh] overflow-y-auto" 
              side="right" 
              align="start"
            >
                <h2 className="text-lg font-semibold mb-2">Attributes</h2>
                {content}
            </PopoverContent>
        </Popover>
    );
};

export default Metadata;