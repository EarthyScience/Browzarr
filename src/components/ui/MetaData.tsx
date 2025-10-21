'use client';

import { HiInformationCircle } from "react-icons/hi";
import React from "react";
import './css/MetaData.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"


import { Button } from "@/components/ui/button"

const defaultAttributes = [
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
        <div className="font-mono whitespace-pre-wrap break-words md:col-start-2 md:row-start-auto pl-4 md:pl-0"
          style={{ overflowWrap: 'anywhere' }}
        >
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </div>
      </React.Fragment>
    );
  });
}
const Metadata = ({ data }: { data: Record<string, any> }) => {
    return (
        <div className="metadata-container">
            <Dialog>
                <Tooltip delayDuration={500} >
                    <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 cursor-pointer"
                            tabIndex={0}
                            >
                            <HiInformationCircle className="size-6" />
                        </Button>
                        </div>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                        <span>Show Variable Attributes</span>
                    </TooltipContent>
                </Tooltip>
                <DialogContent aria-describedby="Metadata Information for variable" className="metadata-dialog">
                    <DialogHeader>
                        <DialogTitle>Attributes</DialogTitle>
                    </DialogHeader>
                        <div className="max-h-[60vh] text-[12px] overflow-y-auto break-words p-0">
                            <div className="grid grid-cols-1 md:grid-cols-[max-content_1fr] gap-x-3 gap-y-[6px]">
                                {renderAttributes(data, defaultAttributes)}
                            </div>
                        </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Metadata;