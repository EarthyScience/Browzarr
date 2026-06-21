"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ChevronsDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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

type HighlightedTextProps = { text: string; query: string; gradient: string };

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
  onOpenDescription?: () => void;
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
  // Keep search, pagination, and scroll-hint in one place so they reset atomically.
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isScrolled, setIsScrolled] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Resetting visibleCount and isScrolled here (in the event handler)
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
    setIsScrolled(false);
  };

  const filtered = catalog.filter(ds =>
    ds.label.toLowerCase().includes(search.toLowerCase()) ||
    ds.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const gradientValue = gradient ? GRADIENTS[gradient] : undefined;

  // Track scroll position to fade out the hint once the user starts scrolling.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { root: listRef.current, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);

  return (
    <Command shouldFilter={false} className="rounded-lg border">
      <CommandInput
        placeholder={placeholder}
        value={search}
        onValueChange={handleSearchChange}
      />
      <div className="relative">
        <CommandList
          ref={listRef}
          className="py-2 overflow-y-auto"
          style={{ maxHeight: '10rem' }}
        >
          <CommandEmpty>No datasets found.</CommandEmpty>
          <CommandGroup>
            {visible.map(ds => (
              <CommandItem
                key={ds.key}
                value={ds.key}
                onSelect={() => {
                  setActiveOption(ds.key);
                  setInitStore(ds.store);
                  onOpenDescription?.();
                }}
                className={`flex flex-col items-start gap-0.5 mb-2 cursor-pointer ${
                  activeOption === ds.key ? 'bg-accent' : ''
                }`}
              >
                <span className="font-medium text-sm">
                  {gradientValue && search
                    ? <HighlightedText text={ds.label} query={search} gradient={gradientValue} />
                    : ds.label}
                </span>
                <span className="text-xs text-muted-foreground leading-snug">
                  {gradientValue && search
                    ? <HighlightedText text={ds.subtitle} query={search} gradient={gradientValue} />
                    : ds.subtitle}
                </span>
              </CommandItem>
            ))}

            {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
          </CommandGroup>
        </CommandList>

        {hasMore && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-1 bg-gradient-to-t from-popover via-popover/80 to-transparent h-14 transition-opacity duration-200"
            style={{
              opacity: isScrolled ? 0 : 1,
            }}
          >
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ChevronsDown className="size-3 animate-bounce" />
              scroll for more
            </span>
          </div>
        )}
      </div>
    </Command>
  );
};

export default StoreCatalog;