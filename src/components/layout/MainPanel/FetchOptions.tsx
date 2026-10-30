import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { useIsMobile } from '@/hooks'
import type { FetchStoreOptions } from '@/types/Interfaces'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { IcechunkOptions, IcechunkOpts } from './IcechunkOptions'
export type Format     = 'zarr' | 'icechunk';
type HeaderRow  = { key: string; value: string };
type AuthPreset = 'none' | 'bearer' | 'basic' | 'apikey';

export type FetchOpts = {
  preset: AuthPreset;
  presetValue: string;
  headers: HeaderRow[];
  withCredentials: boolean;
  iceOpts: IcechunkOpts | null
};

export const DEFAULT_FETCH_OPTS: FetchOpts = {
  preset: 'none',
  presetValue: '',
  headers: [{ key: '', value: '' }],
  withCredentials: false,
  iceOpts: null
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

const sectionLabelClass = "text-xs font-medium text-muted-foreground";

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
  inline?: boolean; // expand in place instead of opening a popover
};

export const FetchOptions = ({ value, onChange, inline = false }: Props) => {
	const [showOptions, setShowOptions] = useState(false)
	const isMobile = useIsMobile();
	const popoverSide = isMobile ? "top" : "left";
	const content = <FetchOptionsBody value={value} onChange={onChange} />;

	if (inline) {
		return (
			<div className='flex flex-col mb-2'>
				<Button
					type="button"
					variant='secondary'
					className="flex items-center justify-center gap-2 p-1 h-auto border-solid border-gray border-[1px]"
					onClick={() => setShowOptions(!showOptions)}
				>
					{showOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					Fetch Options
				</Button>
				{showOptions && (
					<div className="flex flex-col gap-4 mt-2 p-3 rounded-md border">
						{content}
					</div>
				)}
			</div>
		)
	}
  	return (
		<Popover open={showOptions} onOpenChange={setShowOptions}>
			<PopoverTrigger asChild>
				<div className='flex items-center justify-between mb-2'>
				<ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${
					showOptions ? '' : 'rotate-180'} z-5`} />
				<Button
					variant='secondary'
					className="flex items-center flex-grow justify-center gap-2 p-1 h-auto border-solid border-gray border-[1px]"
				>
					Fetch Options
				</Button>
				</div>
			</PopoverTrigger>
			<PopoverContent className="flex flex-col gap-4 mt-2" side={popoverSide}>
				{content}
			</PopoverContent>
		</Popover>
  )
}

const FetchOptionsBody = ({ value, onChange }: Props) => {
	const set = (patch: Partial<FetchOpts>) => onChange({ ...value, ...patch });
	const [showCookieHelp, setShowCookieHelp] = useState(false)
	const { preset, presetValue, headers, withCredentials } = value;
	const setHeaders = (h: HeaderRow[]) => set({ headers: h });
	const updateHeader = (i: number, field: 'key' | 'value', val: string) =>
		setHeaders(headers.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
	return (
		<>
				{/* Authentication */}
				<div className="flex flex-col gap-1">
					<span className={sectionLabelClass}>Authentication</span>
					<div className="grid grid-cols-4 gap-1">
						{PRESETS.map(({ value: v, label }) => (
							<Button
								key={v}
								type="button"
								size="sm"
								variant={preset === v ? 'default' : 'outline'}
								onClick={() => set({ preset: v, presetValue: '' })}
							>
								{label}
							</Button>
						))}
					</div>
					{preset !== 'none' && (
						<Input
							type="password"
							className="w-full mt-1"
							placeholder={PRESETS.find(p => p.value === preset)!.placeholder}
							value={presetValue}
							onChange={e => set({ presetValue: e.target.value })}
						/>
					)}
				</div>

				{/* Cookies */}
				<div className="flex flex-col gap-1">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={withCredentials}
							onChange={e => set({ withCredentials: e.target.checked })}
						/>
						<span className="text-sm">Use browser login session</span>
					</label>
					<div className="ml-5">
						<Button type="button" variant="ghost" className={toggleClass} onClick={() => setShowCookieHelp(!showCookieHelp)}>
							<ChevronRight size={12} className={`transition-transform ${showCookieHelp ? 'rotate-90' : ''}`} />
							What's this?
						</Button>
						{showCookieHelp && (
							<p className="text-xs text-muted-foreground mt-1">
								Sends your cookies with each request. Enable if the data is behind a login you're already signed into in this browser.
							</p>
						)}
					</div>
				</div>
				<Collapsible label='Icechunk Options'>
					<IcechunkOptions value={value} onChange={onChange} />
				</Collapsible>
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
		</>
	)
}