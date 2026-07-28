"use client";

import React, { useState } from 'react';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useShallow } from 'zustand/shallow';
import LocalZarr from './LocalZarr';
import LocalNetCDF from './LocalNetCDF';
import { Switcher } from '../Widgets/Switcher';

type Props = {
  setShowLocal?: React.Dispatch<React.SetStateAction<boolean>>;
  setInitStore: (v: string) => void;
  onOpenDescription: () => void;
  isSafari: boolean;
};

const LocalContent = ({
  setShowLocal,
  setInitStore,
  onOpenDescription,
  isSafari,
}: Props) => {
  const [useNC, setUseNC] = useState(false);

  return (
    <div className="mt-2">
      <Switcher
        leftText='Zarr'
        rightText='NetCDF'
        state={!useNC}
        onClick={() => setUseNC(x => !x)}
      />
      {useNC ? (
        <LocalNetCDF setOpenVariables={onOpenDescription} />
      ) : isSafari ? (
        <div className="p-3 rounded-md border border-yellow-600 text-tiny">
          <strong>Local folder upload is not supported in Safari.</strong> Please use Chrome, Firefox, or Edge instead.
        </div>
      ) : (
        <LocalZarr
          setShowLocal={setShowLocal ?? (() => {})}
          setOpenVariables={onOpenDescription}
        />
      )}
    </div>
  );
};

export default LocalContent;