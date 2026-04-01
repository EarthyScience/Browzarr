import type { FetchClient } from "icechunk-js";

export interface FetchStoreOptions {
  overrides?: RequestInit;
  signal?: AbortSignal;
  maxRetries?: number;
  retryDelay?: number;
}

export interface IcechunkStoreOptions {
  branch?: string;
  tag?: string;
  snapshot?: string;
  fetchClient?: FetchClient;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ZarrMetadata {
    name: string;
    shape: number[];
    chunks: number[];
    dtype: string;
    totalSize: number;  // in bytes
    totalSizeFormatted: string;  // human readable
    chunkCount: number;
    chunkSize: number;  // in bytes
    chunkSizeFormatted: string;  // human readable
    groupPath?: string;  // path to the group containing this array
}

export interface ZarrTitleDescription {
    title: string | null;
    description: string | null;
}

export interface ZarrItem {
    path: `/${string}`;
    kind: "group" | "array";
}