import { create } from "zustand";

type ErrorState = {
  error : string | null;
  customError: string | null;
  setError: (error: string | null) => void;
  setCustomError: (customError: string | null) => void;
}

export const useErrorStore = create<ErrorState>((set) =>({
  error: null,
  customError: null,
  setError: (error) => set({ error }),
  setCustomError: (customError) => set({ customError }),
}))

export class ZarrError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'ZarrError';
    }
}