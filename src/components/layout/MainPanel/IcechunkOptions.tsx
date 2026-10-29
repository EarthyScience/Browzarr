import React from 'react'
import { Input } from '@/components/ui'
import type { IcechunkStoreOptions } from '@/types/Interfaces'
import { selectClass } from './FetchOptions'

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
  value: IcechunkOpts;
  onChange: (v: IcechunkOpts) => void;
};

// Branch / Tag / Snapshot selector for Icechunk stores
export const IcechunkOptions = ({ value, onChange }: Props) => {
  const { refType, refValue } = value;
  return (
    <div className="flex items-center gap-1 mt-2">
      <select
        className={selectClass}
        value={refType}
        onChange={e => onChange({ ...value, refType: e.target.value as RefType })}
      >
        {REF_TABS.map(({ value: v, label }) => <option key={v} value={v}>{label}</option>)}
      </select>
      <Input
        className="w-full"
        placeholder={refType === 'branch' ? 'main' : refType}
        value={refValue}
        onChange={e => onChange({ ...value, refValue: e.target.value })}
      />
    </div>
  );
};
