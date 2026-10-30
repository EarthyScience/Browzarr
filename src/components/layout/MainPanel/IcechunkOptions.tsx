import React from 'react'
import { Button, Input } from '@/components/ui'
import type { IcechunkStoreOptions } from '@/types/Interfaces'
import { FetchOpts } from './FetchOptions';

type RefType = 'branch' | 'tag' | 'snapshot';

export type IcechunkOpts = {
  refType: RefType;
  refValue: string;
};

export const DEFAULT_ICECHUNK_OPTS: IcechunkOpts = {
  refType: 'branch',
  refValue: 'main',
};

const REF_TABS: { value: RefType; label: string }[] = [
  { value: 'branch',   label: 'Branch'   },
  { value: 'tag',      label: 'Tag'      },
  { value: 'snapshot', label: 'Snapshot' },
];

// Form state -> icechunk-specific store options (merge with buildFetchOptions)
export const buildIcechunkOptions = ({ refType, refValue }: IcechunkOpts): IcechunkStoreOptions => ({
  [refType]: refValue.trim() || (refType === 'branch' ? 'main' : undefined),
});

type Props = {
  value: FetchOpts;
  onChange: (v: FetchOpts) => void;
};

// Branch / Tag / Snapshot selector for Icechunk stores
export const IcechunkOptions = ({ value, onChange }: Props) => {
  const iceOpts = value.iceOpts ?? DEFAULT_ICECHUNK_OPTS;
  const { refType, refValue } = iceOpts;
  const setIce = (patch: Partial<IcechunkOpts>) =>
    onChange({ ...value, iceOpts: { ...iceOpts, ...patch } });
  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="grid grid-cols-3 gap-1">
        {REF_TABS.map(({ value: v, label }) => (
          <Button
            key={v}
            size="sm"
            variant={refType === v ? 'default' : 'outline'}
            onClick={() => setIce({ refType: v })}
          >
            {label}
          </Button>
        ))}
      </div>
      <Input
        className="w-full"
        placeholder={refType === 'branch' ? 'main' : refType}
        value={refValue}
        onChange={e => setIce({ refValue: e.target.value })}
      />
    </div>
  );
};
