// NetCDF4 WASM - Main entry point
// JavaScript API modeled on netcdf4-python for familiarity
// Export all classes and types
export { NetCDF4, DataTree } from './netcdf4.js';
export { Variable } from './variable.js';
export { Dimension } from './dimension.js';
export { Group } from './group.js';
export { NC_CONSTANTS, DATA_TYPE_MAP } from './constants.js';
// Re-export NetCDF4 as default for backwards compatibility
export { NetCDF4 as default } from './netcdf4.js';
// Polymorphic Dataset constructor - accepts filename, Blob, ArrayBuffer, or Uint8Array
import { NetCDF4 } from './netcdf4.js';
export async function Dataset(source, mode = 'r', options = {}) {
    // Type detection and routing
    if (typeof source === 'string') {
        // File path
        return await NetCDF4.Dataset(source, mode, options);
    }
    else if (source instanceof Blob) {
        // Blob object
        return await NetCDF4.fromBlob(source, mode, options);
    }
    else if (source instanceof ArrayBuffer) {
        // ArrayBuffer
        return await NetCDF4.fromArrayBuffer(source, mode, options);
    }
    else if (source instanceof Uint8Array) {
        // Uint8Array
        return await NetCDF4.fromMemory(source, mode, options);
    }
    else {
        throw new Error('Invalid source type. Expected string, Blob, ArrayBuffer, or Uint8Array.');
    }
}
// Legacy convenience functions for backward compatibility
export async function DatasetFromBlob(blob, mode = 'r', options = {}) {
    return await Dataset(blob, mode, options);
}
export async function DatasetFromArrayBuffer(buffer, mode = 'r', options = {}) {
    return await Dataset(buffer, mode, options);
}
export async function DatasetFromMemory(data, mode = 'r', options = {}, filename) {
    if (filename) {
        return await NetCDF4.fromMemory(data, mode, options, filename);
    }
    return await Dataset(data, mode, options);
}
//# sourceMappingURL=index.js.map