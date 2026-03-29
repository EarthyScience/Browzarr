"use client";

import React from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { Input } from '@/components/ui/';
import { Button } from '@/components/ui/button-enhanced';

type Props = {
  initStore: string;
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
};

const RemoteZarr = ({ initStore, setInitStore, onOpenDescription }: Props) => (
  <form
    className="flex items-center gap-2"
    onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const input = e.currentTarget.elements[0] as HTMLInputElement;
      if (initStore !== input.value) {
        setInitStore(input.value);
      } else {
        useGlobalStore.getState().setStatus(null);
      }
      if (input.value) onOpenDescription();
    }}
  >
    <Input className="w-full" placeholder="Store URL" />
    <Button
      type="submit"
      variant="outline"
      className='cursor-pointer'
      onClick={() => useGlobalStore.getState().setStatus("Fetching...")}
    >
      Fetch
    </Button>
  </form>
);

export default RemoteZarr;