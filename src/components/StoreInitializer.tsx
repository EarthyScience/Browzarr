"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useShallow } from 'zustand/shallow';
import { isRemoteStore } from '@/utils/isRemoteStore';

function StoreInitializerInner() {
  const searchParams = useSearchParams();
  const setInitStore = useGlobalStore(s => s.setInitStore);
  const setOpenVariables = useGlobalStore(s => s.setOpenVariables);
  const { setUseNC, setFetchNC } = useZarrStore(useShallow(s => ({
    setUseNC: s.setUseNC,
    setFetchNC: s.setFetchNC,
  })));

  useEffect(() => {
    const store = searchParams.get("store");
    if (!store) return;

    const isNC = searchParams.get("format") === "nc";
    setUseNC(isNC);
    setFetchNC(isNC);
    const initValue = isRemoteStore(store) ? store : `local:${store}`;
    setInitStore(initValue);
    if (isRemoteStore(store)) {
      setOpenVariables(true);
    }
  }, [searchParams, setUseNC, setFetchNC, setInitStore, setOpenVariables]);

  return null;
}

export function StoreInitializer() {
  return (
    <Suspense fallback={null}>
      <StoreInitializerInner />
    </Suspense>
  );
}