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
  const setStoreFromURL = useGlobalStore(s => s.setStoreFromURL);
  const { setUseNC, setFetchNC } = useZarrStore(useShallow(s => ({
    setUseNC: s.setUseNC,
    setFetchNC: s.setFetchNC,
  })));

  useEffect(() => {
    const store = searchParams.get("store");
    if (!store) {
      setStoreFromURL(false);
      return;
    }

    const isNC = searchParams.get("format") === "nc";
    setUseNC(isNC);
    setFetchNC(isNC);
    const initValue = isRemoteStore(store) ? store : `local:${store}`;
    setInitStore(initValue);
    // mark that a store was provided in the URL; LandingHome will open variables once
    // the custom store is actually loaded.
    setStoreFromURL(true);
  }, [searchParams, setUseNC, setFetchNC, setInitStore, setStoreFromURL]);

  return null;
}

export function StoreInitializer() {
  return (
    <Suspense fallback={null}>
      <StoreInitializerInner />
    </Suspense>
  );
}