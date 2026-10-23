"use client";
import React, { ReactNode } from 'react';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { Button } from '@/components/ui/button-enhanced';
import { TbVariable, TbInfoCircle } from "react-icons/tb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  stack = false,
}: {
  setOpenVariables: (open: boolean) => void;
  onCloseDialog: () => void;
  stack?: boolean;
}) => {
  const { titleDescription } = useGlobalStore(
    useShallow((state) => ({ titleDescription: state.titleDescription }))
  );
  const { title, description } = titleDescription;
  const [openCard, setOpenCard] = React.useState(false);
  const [glow, setGlow] = React.useState(true);

  React.useEffect(() => {
    setGlow(true);
    const timer = setTimeout(() => setGlow(false), 2000);
    return () => clearTimeout(timer);
  }, [titleDescription]);

  return (
    <div className={`flex gap-2 ${glow ? 'glow-effect' : ''} ${stack ? "flex-col" : "flex-row items-center mt-3"}`}>
      <Button
        variant="outline"
        className={`cursor-pointer gap-1.5 ${stack ? "w-full justify-center" : "shrink-0"}`}
        onClick={() => setOpenCard(true)}
      >
        <TbInfoCircle className="size-4" />
        About dataset
      </Button>
      <Dialog open={openCard} onOpenChange={setOpenCard}>
        <DialogContent className="max-w-md md:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm break-all leading-snug py-4">
              {title || "Store"}
            </DialogTitle>
            <DialogDescription>{""}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-snug -mt-8">
            {description || "No description available."}
          </p>
        </DialogContent>
      </Dialog>
      <Button
        variant="default"
        className={`cursor-pointer ${stack ? "w-full" : "flex-1"}`}
        onClick={() => {
          setOpenVariables(true);
          onCloseDialog();
        }}
      >
        Open Variables
        <TbVariable className="size-6 ml-1" />
      </Button>
    </div>
  );
};

export default DescriptionContent;