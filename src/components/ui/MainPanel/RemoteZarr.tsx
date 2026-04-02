"use client";
import React, { useState } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { Input } from '@/components/ui/';
import { Button } from '@/components/ui/button-enhanced';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

type HeaderRow  = { key: string; value: string };
type AuthPreset = 'none' | 'bearer' | 'basic' | 'apikey';

const PRESETS: { value: AuthPreset; label: string }[] = [
  { value: 'none',   label: 'None'       },
  { value: 'bearer', label: 'Bearer'     },
  { value: 'basic',  label: 'Basic'      },
  { value: 'apikey', label: 'API Key'    },
];

const PRESET_KEYS: Record<Exclude<AuthPreset, 'none'>, string> = {
  bearer: 'Authorization',
  basic:  'Authorization',
  apikey: 'X-Api-Key',
};

const PRESET_PREFIXES: Record<Exclude<AuthPreset, 'none'>, string> = {
  bearer: 'Bearer ',
  basic:  'Basic ',
  apikey: '',
};

type Props = {
  initStore: string;
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
};

const RemoteZarr = ({ initStore, setInitStore, onOpenDescription }: Props) => {
  const [showOverrides, setShowOverrides] = useState(false);
  const [preset, setPreset] = useState<AuthPreset>('none');
  const [presetValue, setPresetValue] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: '', value: '' }]);
  const [showCustom, setShowCustom] = useState(false);

  const addHeaderRow = () => setHeaders(h => [...h, { key: '', value: '' }]);
  const removeHeaderRow = (i: number) => setHeaders(h => h.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: 'key' | 'value', val: string) =>
    setHeaders(h => h.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const buildOverrides = (): RequestInit | undefined => {
    const builtHeaders: Record<string, string> = {};

    // Preset auth header
    if (preset !== 'none' && presetValue.trim()) {
      builtHeaders[PRESET_KEYS[preset]] = `${PRESET_PREFIXES[preset]}${presetValue.trim()}`;
    }

    // Custom headers
    headers
      .filter(r => r.key.trim())
      .forEach(r => { builtHeaders[r.key.trim()] = r.value.trim(); });

    return Object.keys(builtHeaders).length > 0
      ? { headers: builtHeaders }
      : undefined;
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const input = e.currentTarget.elements[0] as HTMLInputElement;
        const url = input.value;
        if (!url) return;

        const overrides = buildOverrides();
        if (overrides && url.startsWith('http://')) {
          useGlobalStore.getState().setStatus('Error: Cannot send auth headers over plain HTTP — use HTTPS.');
          return;
        }
        const fetchOptions = {
          ...(overrides && { overrides }),
        };

        useGlobalStore.getState().setIcechunkOptions(null);
        useGlobalStore.getState().setFetchOptions(
          Object.keys(fetchOptions).length > 0 ? fetchOptions : null
        );
        useGlobalStore.getState().setStatus('Fetching...');

        if (initStore !== url) {
          setInitStore(url);
          onOpenDescription();
        }
        else useGlobalStore.getState().setStatus(null);
      }}
    >
      {/* URL + Fetch */}
      <div className="flex items-center gap-2">
        <Input className="w-full" placeholder="Store URL" />
        <Button type="submit" variant="outline" className="cursor-pointer">
          Fetch
        </Button>
      </div>

      {/* Overrides */}
      <div>
        <Button
          type="button"
          variant="ghost"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => setShowOverrides(v => !v)}
        >
          {showOverrides ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Overrides
        </Button>

        {showOverrides && (
          <div className="flex flex-col gap-3 mt-2">

            {/* Auth preset selector */}
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-wrap gap-1">
                {PRESETS.map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={preset === value ? 'secondary' : 'ghost'}
                    className='cursor-pointer'
                    size="sm"
                    onClick={() => { setPreset(value); setPresetValue(''); }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {preset !== 'none' && (
                <Input
                  type="password"
                  className="w-full"
                  placeholder={
                    preset === 'bearer' ? 'eyJhbGc...' :
                    preset === 'basic'  ? 'dXNlcjpwYXNz' :
                    'api-key-here'
                  }
                  value={presetValue}
                  onChange={e => setPresetValue(e.target.value)}
                />
              )}
            </div>

            {/* Custom headers */}
            <div>
              <Button
                type="button"
                variant={'ghost'}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={() => setShowCustom(v => !v)}
              >
                {showCustom ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Custom headers
              </Button>
              {showCustom && (
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
                        type="password"
                        value={row.value}
                        onChange={e => updateHeader(i, 'value', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        onClick={() => removeHeaderRow(i)}
                        disabled={headers.length === 1}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 cursor-pointer"
                    onClick={addHeaderRow}
                  >
                    <Plus size={12} /> Add header
                  </Button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </form>
  );
};

export default RemoteZarr;