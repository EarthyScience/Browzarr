"use client";
import React, { useState } from 'react';
import { Input } from '@/components/ui/';
import { Button } from '@/components/ui/button-enhanced';
import { ButtonGroup } from '@/components/ui/button-group';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';

type RefType   = 'branch' | 'tag' | 'snapshot';
type HeaderRow = { key: string; value: string };

const REF_TABS: { value: RefType; label: string }[] = [
  { value: 'branch',   label: 'Branch'   },
  { value: 'tag',      label: 'Tag'      },
  { value: 'snapshot', label: 'Snapshot' },
];

type Props = {
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
};

const RemoteIcechunk = ({ setInitStore, onOpenDescription }: Props) => {
  const [url, setUrl] = useState('');
  const [refType, setRefType] = useState<RefType>('branch');
  const [refValue, setRefValue] = useState('main');
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: '', value: '' }]);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxRetries, setMaxRetries] = useState(10);
  const [retryDelay, setRetryDelay] = useState(500);

  const addHeaderRow = () => setHeaders(h => [...h, { key: '', value: '' }]);
  const removeHeaderRow = (i: number) => setHeaders(h => h.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: 'key' | 'value', val: string) =>
    setHeaders(h => h.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleFetch = () => {
    if (!url) return;
    const builtHeaders = Object.fromEntries(
      headers.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value.trim()])
    );
    useGlobalStore.getState().setFetchOptions(null);  // clear fetch
    useGlobalStore.getState().setIcechunkOptions({
      [refType]: refValue,
      ...(Object.keys(builtHeaders).length > 0 && { headers: builtHeaders }),
      maxRetries,
      retryDelay,
    });
    useGlobalStore.getState().setStatus('Fetching...');
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
          variant="outline"
          className="cursor-pointer"
          onClick={handleFetch}
        >
          Fetch
        </Button>
      </div>

      {/* Branch / Tag / Snapshot */}
      <div className="flex items-center gap-2">
        <ButtonGroup className="border-1 rounded-md shrink-0">
          {REF_TABS.map(({ value, label }) => (
            <Button
              key={value}
              variant={refType === value ? 'secondary' : 'ghost'}
              size="sm"
              className="cursor-pointer"
              onClick={() => setRefType(value)}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
        <Input
          className="w-full"
          placeholder={refType === 'branch' ? 'main' : refType}
          value={refValue}
          onChange={e => setRefValue(e.target.value)}
        />
      </div>

      {/* Auth Headers */}
      <div>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowAuth(v => !v)}
        >
          {showAuth ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Auth headers
        </button>
        {showAuth && (
          <div className="flex flex-col gap-1 mt-2">
            {headers.map((row, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  className="w-1/2"
                  placeholder="Header name"
                  value={row.key}
                  onChange={e => updateHeader(i, 'key', e.target.value)}
                />
                <Input
                  className="w-1/2"
                  placeholder="Value"
                  value={row.value}
                  onChange={e => updateHeader(i, 'value', e.target.value)}
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => removeHeaderRow(i)}
                  disabled={headers.length === 1}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
              onClick={addHeaderRow}
            >
              <Plus size={12} /> Add header
            </button>
          </div>
        )}
      </div>

      {/* Advanced */}
      <div>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowAdvanced(v => !v)}
        >
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Advanced
        </button>
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