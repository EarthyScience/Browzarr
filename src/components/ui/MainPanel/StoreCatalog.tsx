"use client";
import React, { useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown } from 'lucide-react';

const PAGE_SIZE = 3;

export type CatalogEntry = {
  key: string;
  label: string;
  subtitle: string;
  store: string;
};

type GradientPreset = 'zarr' | 'icechunk';

const GRADIENTS: Record<GradientPreset, string> = {
  zarr:     'linear-gradient(90deg, #EC4899, #facc15)',
  icechunk: 'linear-gradient(90deg, #3b82f6, #a5f3fc)',
};

const gradientTextStyle = (gradient: string): React.CSSProperties => ({
  background: gradient,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

/** Splits `text` into segments, marking which chars match `query`. */
const getMatchSegments = (text: string, query: string) => {
  if (!query.trim()) return [{ text, match: false }];

  const segments: { text: string; match: boolean }[] = [];
  const lower = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let cursor = 0;

  while (cursor < text.length) {
    const idx = lower.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      segments.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (idx > cursor) segments.push({ text: text.slice(cursor, idx), match: false });
    segments.push({ text: text.slice(idx, idx + query.length), match: true });
    cursor = idx + query.length;
  }

  return segments;
};

type HighlightedTextProps = {
  text: string;
  query: string;
  gradient: string;
};

const HighlightedText = ({ text, query, gradient }: HighlightedTextProps) => {
  const segments = getMatchSegments(text, query);
  return (
    <>
      {segments.map((seg, i) =>
        seg.match
          ? <span key={i} style={gradientTextStyle(gradient)}>{seg.text}</span>
          : <span key={i}>{seg.text}</span>
      )}
    </>
  );
};

type Props = {
  catalog: CatalogEntry[];
  activeOption: string;
  setActiveOption: (key: string) => void;
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
  placeholder?: string;
  gradient?: GradientPreset;
};

const StoreCatalog = ({
  catalog,
  activeOption,
  setActiveOption,
  setInitStore,
  onOpenDescription,
  placeholder = 'Search datasets...',
  gradient,
}: Props) => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = catalog.filter(ds =>
    ds.label.toLowerCase().includes(search.toLowerCase()) ||
    ds.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hiddenCount = filtered.length - PAGE_SIZE;
  const hasMore = hiddenCount > 0;

  const gradientValue = gradient ? GRADIENTS[gradient] : undefined;

  return (
    <Command shouldFilter={false} className="rounded-lg border">
      <CommandInput
        placeholder={placeholder}
        value={search}
        onValueChange={(v) => {
          setSearch(v);
          setShowAll(false);
        }}
      />
      <CommandList className='py-2'>
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
              className={`flex flex-col items-start gap-0.5 mb-2 cursor-pointer ${
                activeOption === ds.key ? 'bg-accent' : ''
              }`}
            >
              <span className="font-medium text-sm">
                {gradientValue && search
                  ? <HighlightedText text={ds.label} query={search} gradient={gradientValue} />
                  : ds.label
                }
              </span>
              <span className="text-xs text-muted-foreground leading-snug">
                {gradientValue && search
                  ? <HighlightedText text={ds.subtitle} query={search} gradient={gradientValue} />
                  : ds.subtitle
                }
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

export default StoreCatalog;