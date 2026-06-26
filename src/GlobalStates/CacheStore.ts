import { create } from "zustand";
import MemoryLRU from "../utils/MemoryLRU";

type CacheState = {
  cache: MemoryLRU<string, any>;
  maxSize: number;
  cacheVersion: number;
  clearCache: () => void;
  setMaxSize: (maxSize: number) => void;
}

export const useCacheStore = create<CacheState>((set, get) => {
  const memoryModule = new MemoryLRU({
    maxSize: 200 * 1024 * 1024,
    onChange: () => set(state => ({ cacheVersion: state.cacheVersion + 1 }))
  })

  return {
    cache: memoryModule as MemoryLRU<string, any>,  // 200 MB
    maxSize: 200 * 1024 * 1024,
    cacheVersion: 0,
    // Cache operations
    clearCache: () => {
      const { cache } = get()
      cache.clear()
    },
    setMaxSize: (maxSize) => {
      const { cache } = get()
      cache.resize(maxSize)
      set({ maxSize })
    }
  }
})