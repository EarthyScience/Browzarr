import { create } from "zustand";
import MemoryLRU from "../lib/MemoryLRU";

type CacheState = {
  cache: MemoryLRU<string, any>;
  maxSize: number;
  setMaxSize: (maxSize: number) => void;
}

const memoryModule = new MemoryLRU({ maxSize: 200 * 1024 * 1024 }) // 200 MB // Maybe moving it outside will allow Garbe Collector to correctly remove the cached data

export const useCacheStore = create<CacheState>((set, get) => ({
  cache: memoryModule as MemoryLRU<string, any>,  // 200 MB
  maxSize: 200 * 1024 * 1024,
  setMaxSize: (maxSize) => {
    const { cache } = get()
    cache.resize(maxSize)
    set({ maxSize })
  }
}))