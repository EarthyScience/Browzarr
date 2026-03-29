"use client";

import React, { ReactNode } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { Button } from '../button';
import { TbVariable } from "react-icons/tb";

export const DatasetOption = ({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) => (
  <Button
    variant={active ? "default" : "ghost"}
    className='cursor-pointer w-full justify-start'
    onClick={onClick}
  >
    {children}
  </Button>
);

export const DescriptionContent = ({
  setOpenVariables,
  onCloseDialog,
}: {
  setOpenVariables: (open: boolean) => void;
  onCloseDialog: () => void;
}) => {
  const { titleDescription } = useGlobalStore(useShallow(state => ({
    titleDescription: state.titleDescription,
  })));
  const { title, description } = titleDescription;

  return (
    <div className='grid gap-1'>
      <div className='mb-2'>
        <h1 className="text-lg font-bold break-all">
          {title ? title : "Store"}
        </h1>
        <p
          className="whitespace-pre-wrap break-words"
          style={{ overflowWrap: 'anywhere' }}
        >
          {description ? description : "No Description"}
        </p>
      </div>
      <div className='flex justify-center my-2'>
        <Button
          variant={"default"}
          className='cursor-pointer mt-[-20px]'
          onClick={() => {
            setOpenVariables(true);
            onCloseDialog();
          }}
        >
          Open Variables
          <TbVariable className="size-8" />
        </Button>
      </div>
    </div>
  );
};