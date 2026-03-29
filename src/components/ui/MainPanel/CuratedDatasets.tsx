"use client";

import React, { useState } from 'react';
import { CURATED_DATASETS } from './Constants';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown } from 'lucide-react';

const PAGE_SIZE = 5;

type Props = {
  activeOption: string;
  setActiveOption: (key: string) => void;
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
};

const CuratedDatasets = ({
  activeOption,
  setActiveOption,
  setInitStore,
  onOpenDescription,
}: Props) => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = CURATED_DATASETS.filter(ds =>
    ds.label.toLowerCase().includes(search.toLowerCase()) ||
    ds.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hiddenCount = filtered.length - PAGE_SIZE;
  const hasMore = hiddenCount > 0;

  return (
    <Command shouldFilter={false} className="rounded-lg border">
      <CommandInput
        placeholder="Search datasets..."
        value={search}
        onValueChange={(v) => {
          setSearch(v);
          setShowAll(false);
        }}
      />
      <CommandList>
        <CommandEmpty>No datasets found.</CommandEmpty>
        <CommandGroup>
          {visible.map(ds => (
            <CommandItem
              key={ds.key}
              value={ds.key}
              onSelect={() => {
                setActiveOption(ds.key);
                setInitStore(ds.store);
                onOpenDescription();
              }}
              className={`flex flex-col items-start gap-0.5 cursor-pointer ${
                activeOption === ds.key ? 'bg-accent' : ''
              }`}
            >
              <span className="font-medium text-sm">{ds.label}</span>
              <span className="text-xs text-muted-foreground leading-snug">
                {ds.subtitle}
              </span>
            </CommandItem>
          ))}

          {!showAll && hasMore && (
            <CommandItem
              value="__show_more__"
              onSelect={() => setShowAll(true)}
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground cursor-pointer py-2 border-t border-dashed border-border mt-1 hover:text-foreground"
            >
              <ChevronDown className="size-3.5" />
              {hiddenCount} more dataset{hiddenCount > 1 ? 's' : ''} available
            </CommandItem>
          )}

          {showAll && hasMore && (
            <CommandItem
              value="__show_less__"
              onSelect={() => setShowAll(false)}
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground cursor-pointer py-2 border-t border-dashed border-border mt-1 hover:text-foreground"
            >
              <ChevronDown className="size-3.5 rotate-180" />
              Show less
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};

export default CuratedDatasets;