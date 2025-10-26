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