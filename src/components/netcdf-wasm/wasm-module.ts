// WASM module loading and wrapping functionality

import type { EmscriptenModule, NetCDF4Module, NetCDF4WasmOptions } from './types';
import { NC_CONSTANTS } from './constants';

const NC_MAX_NAME = 256;
const NC_MAX_DIMS = 1024;  
const NC_MAX_VARS = 8192;

export class WasmModuleLoader {
    static async loadModule(options: NetCDF4WasmOptions = {}): Promise<NetCDF4Module> {
        try {
            // Load the WASM module
            let moduleFactory: any;
            if (typeof NetCDF4Module === 'undefined') {
                throw new Error('NetCDF4Module not found. Make sure netcdf4.js is loaded.');
            }
            moduleFactory = NetCDF4Module;


            const rawModule = await moduleFactory({
                locateFile: (path: string) => {
                    if (options.wasmPath) {
                        const wasmPath = options.wasmPath.replace('.js', '.wasm');
                        return wasmPath;
                    }
                    return path;
                }
            });

            // Wrap the module with high-level functions
            return WasmModuleLoader.wrapModule(rawModule);
        } catch (error) {
            throw new Error(`Failed to load NetCDF4 WASM module: ${error}`);
        }
    }

    private static wrapModule(module: EmscriptenModule): NetCDF4Module {
        // Create wrappers for NetCDF functions
        const nc_open_wrapper = module.cwrap('nc_open_wrapper', 'number', ['string', 'number', 'number']);
        const nc_close_wrapper = module.cwrap('nc_close_wrapper', 'number', ['number']);

         // Dimension inquiry wrappers
        const nc_inq_ndims_wrapper = module.cwrap('nc_inq_ndims_wrapper', 'number', ['number', 'number']);
        const nc_inq_unlimdim_wrapper = module.cwrap('nc_inq_unlimdim_wrapper', 'number', ['number', 'number']);
        const nc_inq_dimids_wrapper = module.cwrap('nc_inq_dimids_wrapper', 'number', ['number', 'number', 'number', 'number']);
        const nc_inq_dim_wrapper = module.cwrap('nc_inq_dim_wrapper', 'number', ['number', 'number', 'number', 'number']);
        const nc_inq_dimid_wrapper = module.cwrap('nc_inq_dimid_wrapper', 'number', ['number', 'string', 'number']);
        const nc_inq_dimlen_wrapper = module.cwrap('nc_inq_dimlen_wrapper', 'number', ['number', 'number', 'number']);
        const nc_inq_dimname_wrapper = module.cwrap('nc_inq_dimname_wrapper', 'number', ['number', 'number', 'number']);

        // Variable inquiry wrappers
        const nc_inq_nvars_wrapper = module.cwrap('nc_inq_nvars_wrapper', 'number', ['number', 'number']);
        const nc_inq_varids_wrapper = module.cwrap('nc_inq_varids_wrapper', 'number', ['number', 'number', 'number']);
        const nc_inq_varid_wrapper = module.cwrap('nc_inq_varid_wrapper', 'number', ['number', 'string', 'number']);

        const nc_inq_var_wrapper = module.cwrap('nc_inq_var_wrapper', 'number', [
            'number', 'number',           // ncid, varid
            'number',                     // name pointer
            'number', 'number', 'number', // typep, ndimsp, dimidsp, nattsp
        ]);

        // Variable inquiry wrappers
        const nc_inq_varname_wrapper = module.cwrap('nc_inq_varname_wrapper', 'number', ['number', 'number', 'number']);
        const nc_inq_vartype_wrapper = module.cwrap('nc_inq_vartype_wrapper', 'number', ['number', 'number', 'number']);
        const nc_inq_varndims_wrapper = module.cwrap('nc_inq_varndims_wrapper', 'number', ['number', 'number', 'number']);
        const nc_inq_vardimid_wrapper = module.cwrap('nc_inq_vardimid_wrapper', 'number', ['number', 'number', 'number']);
        const nc_inq_varnatts_wrapper = module.cwrap('nc_inq_varnatts_wrapper', 'number', ['number', 'number', 'number']);

        // Attribute inquiry wrappers
        const nc_inq_natts_wrapper = module.cwrap('nc_inq_natts_wrapper', 'number', ['number', 'number']);
        const nc_inq_att_wrapper = module.cwrap('nc_inq_att_wrapper', 'number', ['number', 'number', 'string', 'number', 'number']);
        const nc_inq_attid_wrapper = module.cwrap('nc_inq_attid_wrapper', 'number', ['number', 'number', 'string', 'number']);
        const nc_inq_attname_wrapper = module.cwrap('nc_inq_attname_wrapper', 'number', ['number', 'number', 'number', 'number']);
        const nc_inq_atttype_wrapper = module.cwrap('nc_inq_atttype_wrapper', 'number', ['number', 'number', 'string', 'number']);
        const nc_inq_attlen_wrapper = module.cwrap('nc_inq_attlen_wrapper', 'number', ['number', 'number', 'string', 'number']);
        
        // Attribute getters
        const nc_get_att_text_wrapper = module.cwrap('nc_get_att_text_wrapper', 'number', ['number', 'number', 'string', 'number']);
        const nc_get_att_short_wrapper = module.cwrap('nc_get_att_short_wrapper', 'number', ['number', 'number', 'string', 'number']);
        const nc_get_att_int_wrapper = module.cwrap('nc_get_att_int_wrapper', 'number', ['number', 'number', 'string', 'number']);
        const nc_get_att_float_wrapper = module.cwrap('nc_get_att_float_wrapper', 'number', ['number', 'number', 'string', 'number']);
        const nc_get_att_double_wrapper = module.cwrap('nc_get_att_double_wrapper', 'number', ['number', 'number', 'string', 'number']);
        const nc_get_att_longlong_wrapper = module.cwrap('nc_get_att_longlong_wrapper', 'number', ['number', 'number', 'string', 'number']);

        // Variable getters
        const nc_get_vara_short_wrapper = module.cwrap('nc_get_vara_short_wrapper', 'number', ['number', 'number', 'number', 'number', 'number']);
        const nc_get_vara_int_wrapper = module.cwrap('nc_get_vara_int_wrapper', 'number', ['number', 'number', 'number', 'number', 'number']);
        const nc_get_vara_float_wrapper = module.cwrap('nc_get_vara_float_wrapper', 'number', ['number', 'number', 'number', 'number', 'number']);
        const nc_get_vara_double_wrapper = module.cwrap('nc_get_vara_double_wrapper', 'number', ['number', 'number', 'number', 'number', 'number']);

        const nc_get_var_text_wrapper = module.cwrap('nc_get_var_text_wrapper', 'number', ['number', 'number', 'number']);
        const nc_get_var_short_wrapper = module.cwrap('nc_get_var_short_wrapper', 'number', ['number', 'number', 'number']);
        const nc_get_var_int_wrapper = module.cwrap('nc_get_var_int_wrapper', 'number', ['number', 'number', 'number']);
        const nc_get_var_longlong_wrapper = module.cwrap('nc_get_var_longlong_wrapper', 'number', ['number', 'number', 'number']);
        const nc_get_var_float_wrapper = module.cwrap('nc_get_var_float_wrapper', 'number', ['number', 'number', 'number']);
        const nc_get_var_double_wrapper = module.cwrap('nc_get_var_double_wrapper', 'number', ['number', 'number', 'number']);


        return {
            ...module,
            
            nc_open: (path: string, mode: number) => {
                const ncidPtr = module._malloc(4);
                const result = nc_open_wrapper(path, mode, ncidPtr);
                const ncid = module.getValue(ncidPtr, 'i32');
                module._free(ncidPtr);
                return { result, ncid };
            },

            nc_close: (ncid: number) => {
                return nc_close_wrapper(ncid);
            },

            // ---- Dimension Inquiry ----//
            nc_inq_ndims: (ncid: number) => {
                const ndimsPtr = module._malloc(4);
                const result = nc_inq_ndims_wrapper(ncid, ndimsPtr);
                const ndims = result === NC_CONSTANTS.NC_NOERR ? module.getValue(ndimsPtr, 'i32') : undefined;
                module._free(ndimsPtr);
                return { result, ndims };
            },

            nc_inq_unlimdim: (ncid: number) => {
                const unlimdimidPtr = module._malloc(4);
                const result = nc_inq_unlimdim_wrapper(ncid, unlimdimidPtr);
                const unlimdimid = result === NC_CONSTANTS.NC_NOERR ? module.getValue(unlimdimidPtr, 'i32') : undefined;
                module._free(unlimdimidPtr);
                return { result, unlimdimid };
            },

            nc_inq_dimids: (ncid: number, include_parents: number = 0) => {
                const ndimsPtr = module._malloc(4);
                const dimidsPtr = module._malloc(NC_MAX_DIMS * 4);
                const result = nc_inq_dimids_wrapper(ncid, ndimsPtr, dimidsPtr, include_parents);
                let ndims, dimids;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    ndims = module.getValue(ndimsPtr, 'i32');
                    dimids = Int32Array.from({ length: ndims }, (_, i) => 
                        module.getValue(dimidsPtr + (i * 4), 'i32')
                    );
                }
                module._free(ndimsPtr);
                module._free(dimidsPtr);
                return { result, ndims, dimids };
            },

            nc_inq_dim: (ncid: number, dimid: number) => {
                const namePtr = module._malloc(NC_MAX_NAME + 1);
                const lenPtr = module._malloc(8); // size_t (use 8 bytes for safety in wasm64)
                const result = nc_inq_dim_wrapper(ncid, dimid, namePtr, lenPtr);
                let name, len;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    name = module.UTF8ToString(namePtr);
                    len = module.getValue(lenPtr, 'i32'); // or 'i32' if your build uses 32-bit size_t
                }
                module._free(namePtr);
                module._free(lenPtr);
                return { result, name, len };
            },

            nc_inq_dimid: (ncid: number, name: string) => {
                const dimidPtr = module._malloc(4);
                const result = nc_inq_dimid_wrapper(ncid, name, dimidPtr);
                const dimid = result === NC_CONSTANTS.NC_NOERR ? module.getValue(dimidPtr, 'i32') : undefined;
                module._free(dimidPtr);
                return { result, dimid };
            },

            nc_inq_dimlen: (ncid: number, dimid: number) => {
                const lenPtr = module._malloc(8);
                const result = nc_inq_dimlen_wrapper(ncid, dimid, lenPtr);
                const len = result === NC_CONSTANTS.NC_NOERR ? module.getValue(lenPtr, 'i64') : undefined;
                module._free(lenPtr);
                return { result, len };
            },

            nc_inq_dimname: (ncid: number, dimid: number) => {
                const namePtr = module._malloc(NC_MAX_NAME + 1);
                module.HEAPU8.fill(0, namePtr, namePtr + NC_MAX_NAME + 1);
                const result = nc_inq_dimname_wrapper(ncid, dimid, namePtr);
                const name = result === NC_CONSTANTS.NC_NOERR ? module.UTF8ToString(namePtr) : undefined;
                module._free(namePtr);
                return { result, name };
            },

            //---- Variable inquiry functions ----//

            nc_inq_nvars: (ncid: number) => {
                const nvarsPtr = module._malloc(4);
                const result = nc_inq_nvars_wrapper(ncid, nvarsPtr);
                const nvars = result === NC_CONSTANTS.NC_NOERR ? module.getValue(nvarsPtr, 'i32') : undefined;
                module._free(nvarsPtr);
                return { result, nvars };
            },

            nc_inq_varids: (ncid: number) => {
                const nvarsPtr = module._malloc(4);
                const varidsPtr = module._malloc(NC_MAX_VARS * 4);
                const result = nc_inq_varids_wrapper(ncid, nvarsPtr, varidsPtr);
                let nvars, varids;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    nvars = module.getValue(nvarsPtr, 'i32');
                    varids = Int32Array.from({ length: nvars }, (_, i) => 
                        module.getValue(varidsPtr + (i * 4), 'i32')
                    );

                }
                module._free(nvarsPtr);
                module._free(varidsPtr);
                return { result, nvars, varids };
            },

            nc_inq_varid: (ncid: number, name: string) => {
                const varidPtr = module._malloc(4);
                const result = nc_inq_varid_wrapper(ncid, name, varidPtr);
                const varid = result === NC_CONSTANTS.NC_NOERR ? module.getValue(varidPtr, 'i32') : undefined;
                module._free(varidPtr);
                return { result, varid };
            },

            nc_inq_var: (ncid: number, varid: number) => {
                const namePtr = module._malloc(NC_MAX_NAME + 1);
                const typePtr = module._malloc(4);
                const ndimsPtr = module._malloc(4);
                const dimidsPtr = module._malloc(NC_MAX_DIMS * 4);
                const nattsPtr = module._malloc(4);
                const result = nc_inq_var_wrapper(ncid, varid, namePtr, typePtr, ndimsPtr, dimidsPtr, nattsPtr);
                let name, type, ndims, dimids, natts;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    name = module.UTF8ToString(namePtr);
                    type = module.getValue(typePtr, 'i32');
                    ndims = module.getValue(ndimsPtr, 'i32');
                    natts = module.getValue(nattsPtr, 'i32');
                    dimids = Int32Array.from({ length: ndims }, (_, i) => 
                        module.getValue(dimidsPtr + (i * 4), 'i32')
                    );
                }
                module._free(namePtr);
                module._free(typePtr);
                module._free(ndimsPtr);
                module._free(dimidsPtr);
                module._free(nattsPtr);
                return { result, name, type, ndims, dimids, natts };
            },

            nc_inq_varname: (ncid: number, varid: number) => {
                const namePtr = module._malloc(NC_MAX_NAME + 1);
                const result = nc_inq_varname_wrapper(ncid, varid, namePtr);
                const name = result === NC_CONSTANTS.NC_NOERR ? module.UTF8ToString(namePtr) : undefined;
                module._free(namePtr);
                return { result, name };
            },

            nc_inq_vartype: (ncid: number, varid: number) => {
                const typePtr = module._malloc(4);
                const result = nc_inq_vartype_wrapper(ncid, varid, typePtr);
                const type = result === NC_CONSTANTS.NC_NOERR ? module.getValue(typePtr, 'i32') : undefined;
                module._free(typePtr);
                return { result, type };
            },

            nc_inq_varndims: (ncid: number, varid: number) => {
                const ndimsPtr = module._malloc(4);
                const result = nc_inq_varndims_wrapper(ncid, varid, ndimsPtr);
                const ndims = result === NC_CONSTANTS.NC_NOERR ? module.getValue(ndimsPtr, 'i32') : undefined;
                module._free(ndimsPtr);
                return { result, ndims };
            },

            nc_inq_vardimid: (ncid: number, varid: number) => {
                const ndimsPtr = module._malloc(4);
                const dimidsPtr = module._malloc(NC_MAX_DIMS * 4);
                const result = nc_inq_vardimid_wrapper(ncid, varid, dimidsPtr); // Note: this wrapper doesn't return ndims first
                // nc_inq_vardimid writes directly into dimids array; we need ndims separately or assume max
                // Better: always call nc_inq_varndims first in practice, or use nc_inq_var
                // For standalone use, we'll read up to NC_MAX_DIMS
                let dimids;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    // You may want to get ndims first via nc_inq_varndims for exact length
                    dimids = Int32Array.from(new Int32Array(module.HEAP32.buffer, dimidsPtr, NC_MAX_DIMS));
                    // Trim trailing -1 or invalid values if needed
                }
                module._free(ndimsPtr);
                module._free(dimidsPtr);
                return { result, dimids };
            },

            nc_inq_varnatts: (ncid: number, varid: number) => {
                const nattsPtr = module._malloc(4);
                const result = nc_inq_varnatts_wrapper(ncid, varid, nattsPtr);
                const natts = result === NC_CONSTANTS.NC_NOERR ? module.getValue(nattsPtr, 'i32') : undefined;
                module._free(nattsPtr);
                return { result, natts };
            },

            //---- Attribute inquiry functions ----//

            nc_inq_natts: (ncid: number) => {
                const nattsPtr = module._malloc(4);
                const result = nc_inq_natts_wrapper(ncid, nattsPtr);
                const natts = result === NC_CONSTANTS.NC_NOERR ? module.getValue(nattsPtr, 'i32') : undefined;
                module._free(nattsPtr);
                return { result, natts };
            },

            nc_inq_att: (ncid: number, varid: number, name: string) => {
                const typePtr = module._malloc(4);
                const lenPtr = module._malloc(8);
                const result = nc_inq_att_wrapper(ncid, varid, name, typePtr, lenPtr);
                let type, len;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    type = module.getValue(typePtr, 'i32');
                    len = module.getValue(lenPtr, 'i32');
                }
                module._free(typePtr);
                module._free(lenPtr);
                return { result, type, len };
            },

            nc_inq_attid: (ncid: number, varid: number, name: string) => {
                const attnumPtr = module._malloc(4);
                const result = nc_inq_attid_wrapper(ncid, varid, name, attnumPtr);
                const attnum = result === NC_CONSTANTS.NC_NOERR ? module.getValue(attnumPtr, 'i32') : undefined;
                module._free(attnumPtr);
                return { result, attnum };
            },

            nc_inq_attname: (ncid: number, varid: number, attnum: number) => {
                const namePtr = module._malloc(NC_MAX_NAME + 1);
                const result = nc_inq_attname_wrapper(ncid, varid, attnum, namePtr);
                const name = result === NC_CONSTANTS.NC_NOERR ? module.UTF8ToString(namePtr) : undefined;
                module._free(namePtr);
                return { result, name };
            },

            nc_inq_atttype: (ncid: number, varid: number, name: string) => {
                const typePtr = module._malloc(4);
                const result = nc_inq_atttype_wrapper(ncid, varid, name, typePtr);
                const type = result === NC_CONSTANTS.NC_NOERR ? module.getValue(typePtr, 'i32') : undefined;
                module._free(typePtr);
                return { result, type };
            },

            nc_inq_attlen: (ncid: number, varid: number, name: string) => {
                const lenPtr = module._malloc(8);
                const result = nc_inq_attlen_wrapper(ncid, varid, name, lenPtr);
                const len = result === NC_CONSTANTS.NC_NOERR ? module.getValue(lenPtr, 'i64') : undefined;
                module._free(lenPtr);
                return { result, len };
            },

            //---- Attribute Getters ----//
            nc_get_att_text: (ncid: number, varid: number, name: string, length: number) => {
                const dataPtr = module._malloc(length + 1);
                const result = nc_get_att_text_wrapper(ncid, varid, name, dataPtr);
                module.setValue(dataPtr + length, 0, 'i8'); // Add null terminator so it doesn't read too far
                const data = result === NC_CONSTANTS.NC_NOERR 
                    ? module.UTF8ToString(dataPtr)
                    : undefined;
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_att_short: (ncid: number, varid: number, name: string, length: number) => {
                const dataPtr = module._malloc(length * 2);
                const result = nc_get_att_short_wrapper(ncid, varid, name, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length }, (_, i) => module.getValue(dataPtr + i * 2, 'i16'))
                    : undefined;
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_att_int: (ncid: number, varid: number, name: string, length: number) => {
                const dataPtr = module._malloc(length * 4);
                const result = nc_get_att_int_wrapper(ncid, varid, name, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length }, (_, i) => module.getValue(dataPtr + i * 4, 'i32'))
                    : undefined;
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_att_float: (ncid: number, varid: number, name: string, length: number) => {
                const dataPtr = module._malloc(length * 4);
                const result = nc_get_att_float_wrapper(ncid, varid, name, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length }, (_, i) => module.getValue(dataPtr + i * 4, 'float'))
                    : undefined;
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_att_double: (ncid: number, varid: number, name: string, length: number) => {
                const dataPtr = module._malloc(length * 8);
                const result = nc_get_att_double_wrapper(ncid, varid, name, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length }, (_, i) => module.getValue(dataPtr + i * 8, 'double'))
                    : undefined;
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_att_longlong: (ncid: number, varid: number, name: string, length: number) => {
                const dataPtr = module._malloc(length * 8);
                const result = nc_get_att_longlong_wrapper(ncid, varid, name, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length }, (_, i) => BigInt(module.getValue(dataPtr + i * 8, 'i64')))
                    : undefined;
                module._free(dataPtr);
                return { result, data };
            },

            //---- Variable Getters ----//
            nc_get_vara_short: (ncid: number, varid: number, start: number[], count: number[]) => {
                const totalLength = count.reduce((a, b) => a * b, 1);
                const dataPtr = module._malloc(totalLength * 2);
                const startPtr = module._malloc(start.length * 8);
                const countPtr = module._malloc(count.length * 8);
                
                start.forEach((val, i) => module.setValue(startPtr + i * 8, val, 'i64'));
                count.forEach((val, i) => module.setValue(countPtr + i * 8, val, 'i64'));
                
                const result = nc_get_vara_short_wrapper(ncid, varid, startPtr, countPtr, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length: totalLength }, (_, i) => module.getValue(dataPtr + i * 2, 'i16'))
                    : undefined;
                
                module._free(dataPtr);
                module._free(startPtr);
                module._free(countPtr);
                return { result, data };
            },

            nc_get_vara_int: (ncid: number, varid: number, start: number[], count: number[]) => {
                const totalLength = count.reduce((a, b) => a * b, 1);
                const dataPtr = module._malloc(totalLength * 4);
                const startPtr = module._malloc(start.length * 8);
                const countPtr = module._malloc(count.length * 8);
                
                start.forEach((val, i) => module.setValue(startPtr + i * 8, val, 'i64'));
                count.forEach((val, i) => module.setValue(countPtr + i * 8, val, 'i64'));
                
                const result = nc_get_vara_int_wrapper(ncid, varid, startPtr, countPtr, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length: totalLength }, (_, i) => module.getValue(dataPtr + i * 4, 'i32'))
                    : undefined;
                
                module._free(dataPtr);
                module._free(startPtr);
                module._free(countPtr);
                return { result, data };
            },

            nc_get_vara_float: (ncid: number, varid: number, start: number[], count: number[]) => {
                const totalLength = count.reduce((a, b) => a * b, 1);
                const dataPtr = module._malloc(totalLength * 4);
                const startPtr = module._malloc(start.length * 8);
                const countPtr = module._malloc(count.length * 8);
                
                start.forEach((val, i) => module.setValue(startPtr + i * 8, val, 'i64'));
                count.forEach((val, i) => module.setValue(countPtr + i * 8, val, 'i64'));
                
                const result = nc_get_vara_float_wrapper(ncid, varid, startPtr, countPtr, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length: totalLength }, (_, i) => module.getValue(dataPtr + i * 4, 'float'))
                    : undefined;
                
                module._free(dataPtr);
                module._free(startPtr);
                module._free(countPtr);
                return { result, data };
            },

            nc_get_vara_double: (ncid: number, varid: number, start: number[], count: number[]) => {
                const totalLength = count.reduce((a, b) => a * b, 1);
                const dataPtr = module._malloc(totalLength * 8);
                const startPtr = module._malloc(start.length * 8);
                const countPtr = module._malloc(count.length * 8);
                
                start.forEach((val, i) => module.setValue(startPtr + i * 8, val, 'i64'));
                count.forEach((val, i) => module.setValue(countPtr + i * 8, val, 'i64'));
                
                const result = nc_get_vara_double_wrapper(ncid, varid, startPtr, countPtr, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length: totalLength }, (_, i) => module.getValue(dataPtr + i * 8, 'double'))
                    : undefined;
                
                module._free(dataPtr);
                module._free(startPtr);
                module._free(countPtr);
                return { result, data };
            },
            //---- Full Varaible Getters ----//

            nc_get_var_text: (ncid: number, varid: number, length: number) => {
                const dataPtr = module._malloc(length);
                const result = nc_get_var_text_wrapper(ncid, varid, dataPtr);
                const data = result === NC_CONSTANTS.NC_NOERR
                    ? Array.from({ length }, (_, i) => module.UTF8ToString(module.getValue(dataPtr + i, 'i8')))
                    : undefined;
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_var_short: (ncid: number, varid: number, length: number) => {
                const dataPtr = module._malloc(length * 2);
                const result = nc_get_var_short_wrapper(ncid, varid, dataPtr);
                let data;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    // Create a view of the heap and copy it into a new Int16Array
                    data = new Int16Array(module.HEAP16.buffer, dataPtr, length).slice();
                }
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_var_int: (ncid: number, varid: number, length: number) => {
                const dataPtr = module._malloc(length * 4);
                const result = nc_get_var_int_wrapper(ncid, varid, dataPtr);
                let data;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    data = new Int32Array(module.HEAP32.buffer, dataPtr, length).slice();
                }
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_var_float: (ncid: number, varid: number, length: number) => {
                const dataPtr = module._malloc(length * 4);
                const result = nc_get_var_float_wrapper(ncid, varid, dataPtr);
                let data;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    data = new Float32Array(module.HEAPF32.buffer, dataPtr, length).slice();
                }
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_var_double: (ncid: number, varid: number, length: number) => {
                const dataPtr = module._malloc(length * 8);
                const result = nc_get_var_double_wrapper(ncid, varid, dataPtr);
                let data;
                console.log(Object.keys(module))
                if (result === NC_CONSTANTS.NC_NOERR) {
                    data = new Float64Array(module.HEAPF64.buffer, dataPtr, length).slice();
                }
                module._free(dataPtr);
                return { result, data };
            },

            nc_get_var_longlong: (ncid: number, varid: number, length: number) => {
                const dataPtr = module._malloc(length * 8);
                const result = nc_get_var_longlong_wrapper(ncid, varid, dataPtr);
                let data;
                if (result === NC_CONSTANTS.NC_NOERR) {
                    // BigInt64Array is used for i64 (long long)
                    data = new BigInt64Array(module.HEAP64.buffer, dataPtr, length).slice();
                }
                module._free(dataPtr);
                return { result, data };
            },
        };
    }
}