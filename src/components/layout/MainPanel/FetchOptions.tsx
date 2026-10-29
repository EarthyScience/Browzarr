import React, { useState } from 'react'
import { Input, Button } from '@/components/ui'
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react'
import type { FetchStoreOptions } from '@/types/Interfaces'

export type Format     = 'zarr' | 'icechunk';
type HeaderRow  = { key: string; value: string };
type AuthPreset = 'none' | 'bearer' | 'basic' | 'apikey';

export type FetchOpts = {
  preset: AuthPreset;
  presetValue: string;
  headers: HeaderRow[];
  withCredentials: boolean;
};

export const DEFAULT_FETCH_OPTS: FetchOpts = {
  preset: 'none',
  presetValue: '',
  headers: [{ key: '', value: '' }],
  withCredentials: false,
};

const PRESETS: { value: AuthPreset; label: string; key: string; prefix: string; placeholder: string }[] = [
  { value: 'none',   label: 'None',    key: '',              prefix: '',        placeholder: ''             },
  { value: 'bearer', label: 'Bearer',  key: 'Authorization', prefix: 'Bearer ', placeholder: 'eyJhbGc...'   },
  { value: 'basic',  label: 'Basic',   key: 'Authorization', prefix: 'Basic ',  placeholder: 'dXNlcjpwYXNz' },
  { value: 'apikey', label: 'API Key', key: 'X-Api-Key',     prefix: '',        placeholder: 'api-key-here' },
];

export const buildHeaders = (opts: FetchOpts): Record<string, string> => {
  const built: Record<string, string> = {};
  const preset = PRESETS.find(p => p.value === opts.preset)!;
  if (preset.key && opts.presetValue.trim()) {
    built[preset.key] = `${preset.prefix}${opts.presetValue.trim()}`;
  }
  opts.headers
    .filter(r => r.key.trim())
    .forEach(r => { built[r.key.trim()] = r.value.trim(); });
  return built;
};

// Form state -> options shared by every remote loader
export const buildFetchOptions = (opts: FetchOpts): FetchStoreOptions => ({
  headers: buildHeaders(opts),
  withCredentials: opts.withCredentials,
});

export const toggleClass = "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer h-auto p-0";

export const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm cursor-pointer";

export const Collapsible = ({ label, open: controlled, onToggle, children }: {
  label: React.ReactNode;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const [internal, setInternal] = useState(false);
  const open = controlled ?? internal;
  const toggle = () => { setInternal(!open); onToggle?.(!open); };
  return (
    <div>
      <Button type="button" variant="ghost" className={toggleClass} onClick={toggle}>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {label}
      </Button>
      {open && children}
    </div>
  );
};

type Props = {
  value: FetchOpts;
  onChange: (v: FetchOpts) => void;
};

export const FetchOptions = ({ value, onChange }: Props) => {
  const set = (patch: Partial<FetchOpts>) => onChange({ ...value, ...patch });
  const { preset, presetValue, headers, withCredentials } = value;
  const setHeaders = (h: HeaderRow[]) => set({ headers: h });
  const updateHeader = (i: number, field: 'key' | 'value', val: string) =>
    setHeaders(headers.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  return (
    <div className="flex flex-col gap-3 mt-2">

      {/* Auth preset selector */}
      <div className="flex items-center gap-1">
        <select
          className={selectClass}
          value={preset}
          onChange={e => set({ preset: e.target.value as AuthPreset, presetValue: '' })}
        >
          {PRESETS.map(({ value: v, label }) => (
            <option key={v} value={v}>{v === 'none' ? 'No auth' : label}</option>
          ))}
        </select>
        {preset !== 'none' && (
          <Input
            type="password"
            className="w-full"
            placeholder={PRESETS.find(p => p.value === preset)!.placeholder}
            value={presetValue}
            onChange={e => set({ presetValue: e.target.value })}
          />
        )}
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={withCredentials}
          onChange={e => set({ withCredentials: e.target.checked })}
        />
        Send cookies (credentials)
      </label>

      <Collapsible label="Custom headers">
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
                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer h-auto p-1"
                onClick={() => setHeaders(headers.filter((_, idx) => idx !== i))}
                disabled={headers.length === 1}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className={`${toggleClass} mt-1`}
            onClick={() => setHeaders([...headers, { key: '', value: '' }])}
          >
            <Plus size={12} /> Add header
          </Button>
        </div>
      </Collapsible>

    </div>
  )
}
