"use client";
import React, { useState } from 'react';
import { Input } from '@/components/ui/';
import { Button } from '@/components/ui/button-enhanced';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';

type RefType     = 'branch' | 'tag' | 'snapshot';
type HeaderRow   = { key: string; value: string };
type Credentials = 'omit' | 'same-origin' | 'include';
type Cache       = 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache';

const REF_TABS: { value: RefType; label: string }[] = [
  { value: 'branch',   label: 'Branch'   },
  { value: 'tag',      label: 'Tag'      },
  { value: 'snapshot', label: 'Snapshot' },
];

const CREDENTIALS_OPTIONS: { value: Credentials; label: string }[] = [
  { value: 'omit',        label: 'Omit'        },
  { value: 'same-origin', label: 'Same origin' },
  { value: 'include',     label: 'Include'     },
];

const CACHE_OPTIONS: { value: Cache; label: string }[] = [
  { value: 'default',     label: 'Default'     },
  { value: 'no-store',    label: 'No store'    },
  { value: 'reload',      label: 'Reload'      },
  { value: 'no-cache',    label: 'No cache'    },
  { value: 'force-cache', label: 'Force cache' },
];

type HeaderRowsProps = {
  rows: HeaderRow[];
  set: React.Dispatch<React.SetStateAction<HeaderRow[]>>;
};

const HeaderRows = ({ rows, set }: HeaderRowsProps) => {
  const addRow    = () => set(h => [...h, { key: '', value: '' }]);
  const removeRow = (i: number) => set(h => h.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: 'key' | 'value', val: string) =>
    set(h => h.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  return (
    <div className="flex flex-col gap-1 mt-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input
            className="w-1/2"
            placeholder="Header name"
            value={row.key}
            onChange={e => updateRow(i, 'key', e.target.value)}
          />
          <Input
            className="w-1/2"
            placeholder="Value"
            type="password"
            value={row.value}
            onChange={e => updateRow(i, 'value', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer h-auto p-1"
            onClick={() => removeRow(i)}
            disabled={rows.length === 1}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer h-auto p-0 mt-1"
        onClick={addRow}
      >
        <Plus size={12} /> Add header
      </Button>
    </div>
  );
};

type Props = {
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
};

const RemoteIcechunk = ({ setInitStore, onOpenDescription }: Props) => {
  const [url, setUrl] = useState('');
  const [refType, setRefType] = useState<RefType>('branch');
  const [refValue, setRefValue] = useState('main');

  // Storage options
  const [showStorage, setShowStorage] = useState(false);
  const [storageHeaders, setStorageHeaders] = useState<HeaderRow[]>([{ key: '', value: '' }]);
  const [credentials, setCredentials] = useState<Credentials | ''>('');
  const [cache, setCache] = useState<Cache | ''>('');

  // fetchClient headers (virtual chunks)
  const [showFetchClientHeaders, setShowFetchClientHeaders] = useState(false);
  const [fetchClientHeaders, setFetchClientHeaders] = useState<HeaderRow[]>([{ key: '', value: '' }]);

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxRetries, setMaxRetries] = useState(10);
  const [retryDelay, setRetryDelay] = useState(500);

  const buildHeaders = (rows: HeaderRow[]) =>
    Object.fromEntries(rows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value.trim()]));

  const handleFetch = () => {
    if (!url) return;

    const builtStorageHeaders     = buildHeaders(storageHeaders);
    const builtFetchClientHeaders = buildHeaders(fetchClientHeaders);

    useGlobalStore.getState().setFetchOptions(null);
    useGlobalStore.getState().setIcechunkOptions({
      [refType]: refValue,
      ...(Object.keys(builtStorageHeaders).length > 0     && { headers: builtStorageHeaders }),
      ...(credentials                                     && { credentials }),
      ...(cache                                           && { cache }),
      ...(Object.keys(builtFetchClientHeaders).length > 0 && {
        fetchClient: {
          // Not tested! we need a real endpoint that requires custom fetchClient headers to verify this works as expected
          async fetch(url: string, init?: RequestInit) {
            // const signedUrl = await presign(url); // TODO: If you have a function to get a signed URL, use it here. Otherwise, just use the original URL.
            return globalThis.fetch(url, {
              ...init,
              headers: { ...init?.headers, ...builtFetchClientHeaders },
            });
          },
        },
      }),
      maxRetries,
      retryDelay,
    });
    useGlobalStore.getState().setStatus('Fetching...');
    useGlobalStore.getState().bumpFetchKey();
    setInitStore(url);
    onOpenDescription();
  };

  return (
    <div className="flex flex-col gap-3">

      {/* URL + Fetch */}
      <div className="flex items-center gap-2">
        <Input
          className="w-full"
          placeholder="Store URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={handleFetch}
        >
          Fetch
        </Button>
      </div>

      {/* Branch / Tag / Snapshot */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 gap-1">
          {REF_TABS.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              variant={refType === value ? 'secondary' : 'ghost'}
              size="sm"
              className={`cursor-pointer flex-1 ${refType !== value ? 'text-muted-foreground' : ''}`}
              onClick={() => setRefType(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Input
          className="w-full"
          placeholder={refType === 'branch' ? 'main' : refType}
          value={refValue}
          onChange={e => setRefValue(e.target.value)}
        />
      </div>

      {/* Storage options */}
      <div>
        <Button
          type="button"
          variant="ghost"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer h-auto p-0"
          onClick={() => setShowStorage(v => !v)}
        >
          {showStorage ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Storage options
        </Button>
        {showStorage && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2">

              {/* Credentials Select */}
              <div className="flex flex-col gap-1 flex-1 text-xs">
                <span className="text-muted-foreground">Credentials</span>
                <Select
                  value={credentials || '__default__'}
                  onValueChange={v => setCredentials(v === '__default__' ? '' : v as Credentials)}
                >
                  <SelectTrigger className="w-full text-xs h-8">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__default__">Default</SelectItem>
                      {CREDENTIALS_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Cache Select */}
              <div className="flex flex-col gap-1 flex-1 text-xs">
                <span className="text-muted-foreground">Cache</span>
                <Select
                  value={cache || '__default__'}
                  onValueChange={v => setCache(v === '__default__' ? '' : v as Cache)}
                >
                  <SelectTrigger className="w-full text-xs h-8">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CACHE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

            </div>
            <HeaderRows rows={storageHeaders} set={setStorageHeaders} />
          </div>
        )}
      </div>

      {/* fetchClient headers */}
      <div>
        <Button
          type="button"
          variant="ghost"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer h-auto p-0"
          onClick={() => setShowFetchClientHeaders(v => !v)}
        >
          {showFetchClientHeaders ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          fetchClient headers
        </Button>
        {showFetchClientHeaders && (
          <HeaderRows rows={fetchClientHeaders} set={setFetchClientHeaders} />
        )}
      </div>

      {/* Advanced */}
      <div>
        <Button
          type="button"
          variant="ghost"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer h-auto p-0"
          onClick={() => setShowAdvanced(v => !v)}
        >
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Advanced
        </Button>
        {showAdvanced && (
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2 text-xs">
              <label className="text-muted-foreground whitespace-nowrap">Max retries</label>
              <Input
                type="number"
                className="w-16"
                value={maxRetries}
                onChange={e => setMaxRetries(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-muted-foreground whitespace-nowrap">Retry delay (ms)</label>
              <Input
                type="number"
                className="w-20"
                value={retryDelay}
                onChange={e => setRetryDelay(Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default RemoteIcechunk;