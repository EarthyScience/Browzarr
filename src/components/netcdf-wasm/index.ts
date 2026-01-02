// NetCDF4 WASM - Main entry point
// JavaScript API modeled on netcdf4-python for familiarity

// Export all classes and types
export { NetCDF4 } from './netcdf4';
export { Variable } from './variable';
export { Dimension } from './dimension';
export { Group } from './group';
export { NC_CONSTANTS, DATA_TYPE_MAP } from './constants';

// Export types
export type {
    EmscriptenModule,
    NetCDF4Module,
    NetCDF4WasmOptions,
    DatasetOptions,
    VariableOptions,
    MemoryDatasetSource,
    DatasetSource
} from './types';

// Re-export NetCDF4 as default for backwards compatibility
export { NetCDF4 as default } from './netcdf4';

// Polymorphic Dataset constructor - accepts filename, Blob, ArrayBuffer, or Uint8Array
import { NetCDF4 } from './netcdf4';
import type { DatasetOptions, DatasetSource } from './types';

export async function Dataset(
    source: DatasetSource,
    mode: string = 'r',
    options: DatasetOptions = {}
): Promise<NetCDF4> {
    // Type detection and routing
    if (typeof source === 'string') {
        // File path
        return await NetCDF4.Dataset(source, mode, options);
    } else if (source instanceof Blob) {
        // Blob object
        return await NetCDF4.fromBlob(source, mode, options);
    } else if (source instanceof ArrayBuffer) {
        // ArrayBuffer
        return await NetCDF4.fromArrayBuffer(source, mode, options);
    } else if (source instanceof Uint8Array) {
        // Uint8Array
        return await NetCDF4.fromMemory(source, mode, options);
    } else {
        throw new Error('Invalid source type. Expected string, Blob, ArrayBuffer, or Uint8Array.');
    }
}

// Legacy convenience functions for backward compatibility
export async function DatasetFromBlob(
    blob: Blob,
    mode: string = 'r',
    options: DatasetOptions = {}
): Promise<NetCDF4> {
    return await Dataset(blob, mode, options);
}

export async function DatasetFromArrayBuffer(
    buffer: ArrayBuffer,
    mode: string = 'r',
    options: DatasetOptions = {}
): Promise<NetCDF4> {
    return await Dataset(buffer, mode, options);
}

export async function DatasetFromMemory(
    data: Uint8Array | ArrayBuffer,
    mode: string = 'r',
    options: DatasetOptions = {},
    filename?: string
): Promise<NetCDF4> {
    if (filename) {
        return await NetCDF4.fromMemory(data, mode, options, filename);
    }
    return await Dataset(data, mode, options);
}