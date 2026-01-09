import type { NetCDF4Module } from "./types";
import * as NCGet from './netcdf-getters'
import { WasmModuleLoader } from "./wasm-module";
import { NC_CONSTANTS } from "./constants";

declare function importScripts(...urls: string[]): void;
declare function NetCDF4Module(config: any): any;
const isProd = process.env.NODE_ENV === 'production';

// @ts-ignore: location is available in worker global scope in browsers
importScripts(`${(self as any).location.origin}/${isProd ? 'latest/' : ''}netcdf4.js`);
let netcdfModule: NetCDF4Module; // Will be created by NetCDF4Module(...)

// Wait for runtime initialization
const waitForModule = new Promise((resolve) => {
    netcdfModule = NetCDF4Module({
        onRuntimeInitialized: () => resolve(netcdfModule),
        // Critical fix: tell Emscripten where the .wasm is
        locateFile: (path: string, scriptDirectory: string) => {
            // scriptDirectory is usually the directory of netcdf4.js
            // But to be safe, force the full origin + path
            // @ts-ignore: location is available in worker global scope in browsers
            if (path.endsWith('.wasm')) {
                return `${(self as any).location.origin}/` + path;
            }
            return scriptDirectory + path; // fallback for other files
        }
    });
});

// @ts-ignore: onmessage is available in worker global scope
self.onmessage = async (e: MessageEvent) => {
    const data = e.data;
    const {type, id} = data
    const rawmod = (await waitForModule) as NetCDF4Module;
    const mod = WasmModuleLoader.wrapModule(rawmod)
    try {
        let result;
        switch (type) {
            case 'init': {
                const { blob, filename } = e.data; 
    
                // We need to extract the directory and the base name
                // e.g., if filename is "/working/data.nc", mount point is "/working"
                const pathParts = filename.split('/');
                const baseName = pathParts.pop(); // "data.nc"
                const mountPoint = pathParts.join('/') || '/'; // "/working"
                try {
                    // Ensure the directory exists before mounting
                    mod.FS.mkdir(mountPoint);
                } catch (e) { /* ignore if exists */ }

                try {
                    mod.FS.mount(mod.WORKERFS, {
                        blobs: [{ name: baseName, data: blob }],
                    }, mountPoint);
                } catch (err: any) {
                    // If already mounted, we can ignore or re-throw
                    console.warn("Mount failed (might already be mounted):", err.message);
                }
                break;
            }
            case 'open': {
                const openResult = mod.nc_open(data.path, data.modeValue); 
                const ncid = openResult.ncid ?? -1;
                if (ncid < 0) {
                    throw new Error('nc_open failed with code ' + ncid);
                }
                result = ncid
                break;
            }
            case 'close': {
                const closeResult = mod.nc_close(data.ncid);
                if (closeResult !== NC_CONSTANTS.NC_NOERR){
                    throw new Error("Failed to close file");
                }
                break;
            }

            //---- Getters ----//
            //Globals
            case 'getGlobalAttributes' : {
                result = NCGet.getGlobalAttributes(mod, data.ncid);
                break;
            }
            case 'getFullMetadata' : {
                result = NCGet.getFullMetadata(mod, data.ncid);
                break;
            }
            //Dims
            case 'getDimCount' : {
                result = NCGet.getDimCount(mod, data.ncid);
                break;
            }
            case 'getDimIDs' : {
                result = NCGet.getDimIDs(mod, data.ncid);
                break;
            }
            case 'getDims' : {
                result = NCGet.getDims(mod, data.ncid);
                break;
            }
            case 'getDim' : {
                result = NCGet.getDim(mod, data.ncid, data.dimid);
                break;
            }
            case 'getDims' : {
                result = NCGet.getDims(mod, data.ncid);
                break;
            }
            case 'getDims' : {
                result = NCGet.getDims(mod, data.ncid);
                break;
            }
            case 'getDims' : {
                result = NCGet.getDims(mod, data.ncid);
                break;
            }
            //Vars
            case 'getVariables': {
                result = NCGet.getVariables(mod, data.ncid);
                break;
            }
            case 'getVarCount': {
                result = NCGet.getVarCount(mod, data.ncid);
                break;
            }
            case 'getVariableInfo': {
                result = NCGet.getVariableInfo(mod, data.ncid, data.variable);
                break;
            }
            case 'getAttributeValues': {
                result = NCGet.getAttributeValues(mod, data.ncid, data.varid, data.attname);
                break;
            }
            //Arrays
            case 'getVariableArray': {
                result = NCGet.getVariableArray(mod, data.ncid, data.variable);
                break;
            }
            case 'getSlicedVariableArray': {
                result = NCGet.getSlicedVariableArray(mod, data.ncid, data.variable, data.start, data.count);
                break;
            }

        }
        self.postMessage({ type, id, success: true, result });
    } catch (err: any) {
        console.error(`Worker Error [${type}]:`, err);
        self.postMessage({ type: 'error', id, message: err.message });
    }
    
};