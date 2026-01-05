// Type definitions for NetCDF4 WASM

export interface EmscriptenModule {
    ccall: (name: string, returnType: string, argTypes: string[], args: any[]) => any;
    cwrap: (name: string, returnType: string, argTypes: string[]) => (...args: any[]) => any;
    getValue: (ptr: number, type: string) => number;
    setValue: (ptr: number, value: number, type: string) => void;
    UTF8ToString: (ptr: number) => string;
    stringToUTF8: (str: string, outPtr: number, maxBytesToWrite: number) => void;
    lengthBytesUTF8: (str: string) => number;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    allocateString: (str: string) => number;
    freeString: (ptr: number) => void;
    FS: any;
    ready: Promise<EmscriptenModule>;
    HEAPF64: Float64Array;
    HEAP64: BigInt64Array;
    HEAP32: Int32Array;
    HEAPF32: Float32Array;
    HEAPU8: Uint8Array;
    HEAP16: Float16Array;
}

export interface NetCDF4Module extends EmscriptenModule {
    // Wrapped NetCDF4 functions
    nc_open: (path: string, mode: number) => { result: number; ncid: number };
    nc_close: (ncid: number) => number;
    
    // 1. Dimension inquiry
    nc_inq_ndims: (ncid: number) => { result: any; ndims: number | undefined; };
    nc_inq_dimids(ncid: number, include_parents: number): { result: number; ndims?: number; dimids?: Int32Array }
    nc_inq_unlimdim(ncid: number): { result: number; unlimdimid?: number }
    nc_inq_dim(ncid: number, dimid: number): { result: number; name?: string; len?: number }
    nc_inq_dimid(ncid: number, name: string): { result: number; dimid?: number }
    nc_inq_dimlen(ncid: number, dimid: number): { result: number; len?: number }
    nc_inq_dimname(ncid: number, dimid: number): { result: number; name?: string }

    // 2. Variable inquiry
    nc_inq_nvars(ncid: number): { result: number; nvars?: number }
    nc_inq_varids(ncid: number): { result: number; nvars?: number; varids?: Int32Array }
    nc_inq_varid(ncid: number, name: string): { result: number; varid?: number }

    nc_inq_var(ncid: number, varid: number): {
        result: number;
        name?: string;
        type?: number;      // nc_type enum value
        ndims?: number;
        dimids?: Int32Array;
        natts?: number;
    }
    nc_inq_varname(ncid: number, varid: number): { result: number; name?: string }
    nc_inq_vartype(ncid: number, varid: number): { result: number; type?: number }
    nc_inq_varndims(ncid: number, varid: number): { result: number; ndims?: number }
    nc_inq_vardimid(ncid: number, varid: number): { result: number; dimids?: Int32Array }
    nc_inq_varnatts(ncid: number, varid: number): { result: number; natts?: number }

    // 3. Attribute inquiry
    nc_inq_natts(ncid: number): { result: number; natts?: number }  // global attributes
    nc_inq_att(ncid: number, varid: number, name: string): { result: number; type?: number; len?: number }
    nc_inq_attid(ncid: number, varid: number, name: string): { result: number; attnum?: number }
    nc_inq_attname(ncid: number, varid: number, attnum: number): { result: number; name?: string }
    nc_inq_atttype(ncid: number, varid: number, name: string): { result: number; type?: number }
    nc_inq_attlen(ncid: number, varid: number, name: string): { result: number; len?: number }

    // 4. Attribute Getters
    nc_get_att_text(ncid: number, varid: number, name: string, length: number): { result: number; data?: string }
    nc_get_att_short(ncid: number, varid: number, name: string, length: number): { result: number; data?: number[] }
    nc_get_att_int(ncid: number, varid: number, name: string, length: number): { result: number; data?: number[] }
    nc_get_att_float(ncid: number, varid: number, name: string, length: number): { result: number; data?: number[] }
    nc_get_att_double(ncid: number, varid: number, name: string, length: number): { result: number; data?: number[] }
    nc_get_att_longlong(ncid: number, varid: number, name: string, length: number): { result: number; data?: BigInt[] }

    // 5. Variable Getters
    nc_get_var_text: (ncid: number, varid: number,  length: number) => { result: number; data?: string[] };
    nc_get_var_short: (ncid: number, varid: number,  length: number) => { result: number; data?: Int16Array };
    nc_get_var_int: (ncid: number, varid: number,  length: number) => { result: number; data?: Int32Array };
    nc_get_var_longlong: (ncid: number, varid: number,  length: number) => { result: number; data?: BigInt64Array };
    nc_get_var_float: (ncid: number, varid: number,  length: number) => { result: number; data?: Float32Array };
    nc_get_var_double: (ncid: number, varid: number,  length: number) => { result: number; data?: Float64Array };
    
    nc_get_vara_short: (ncid: number, varid: number, startp: number[], countp: number[]) => { result: number; data?: number[] };
    nc_get_vara_int: (ncid: number, varid: number, startp: number[], countp: number[]) => { result: number; data?: number[] };
    nc_get_vara_float: (ncid: number, varid: number, startp: number[], countp: number[]) => { result: number; data?: number[] };
    nc_get_vara_double: (ncid: number, varid: number, startp: number[], countp: number[]) => { result: number; data?: number[] };

}

export interface NetCDF4WasmOptions {
    wasmPath?: string;
    memoryInitialPages?: number;
    memoryMaximumPages?: number;
}

export interface DatasetOptions extends NetCDF4WasmOptions {
    format?: string;
    diskless?: boolean;
    persist?: boolean;
    keepweakref?: boolean;
    memory?: ArrayBuffer;
}

export interface MemoryDatasetSource {
    data: ArrayBuffer | Uint8Array | Blob;
    filename?: string;
}

// Union type for polymorphic Dataset constructor
export type DatasetSource = string | Blob | ArrayBuffer | Uint8Array;

export interface VariableOptions {
    zlib?: boolean;
    complevel?: number;
    shuffle?: boolean;
    fletcher32?: boolean;
    contiguous?: boolean;
    chunksizes?: number[];
}

declare global {
    function NetCDF4Module(options?: any): Promise<EmscriptenModule>;
}

export interface WorkerFSSource {
    data: Blob | File;
    filename: string;
    mountPoint: string;
}