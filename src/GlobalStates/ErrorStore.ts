import { create } from "zustand";

type ErrorState = {
  error : string | null;

  setError: (error: string | null) => void;
}

export const useErrorStore = create<ErrorState>((set) =>({
  error: null,
  setError: (error) => set({ error })
}))