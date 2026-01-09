import * as NCGet from './netcdf-getters.js';
import { WasmModuleLoader } from "./wasm-module.js";
import { NC_CONSTANTS } from "./constants.js";
let netcdfModule;
let mod;
// Wait for runtime initialization
const waitForModule = new Promise(async (resolve) => {
    // Dynamically import the generated netcdf4-wasm.js module
    const netcdf4Module = await import('./netcdf4-wasm.js');
    const createNetCDF4Module = netcdf4Module.default;
    // Use the imported module factory
    netcdfModule = await createNetCDF4Module({
        locateFile: (file) => {
            // This handles Next.js bundling which adds identifiers to the filename
            if (file.endsWith('.wasm')) {
                return `${self.location.origin}/${file}`;
            }
            return file;
        }
    });
    resolve(netcdfModule);
});
// @ts-ignore: onmessage is available in worker global scope
self.onmessage = async (e) => {
    const data = e.data;
    const { type, id } = data;
    try {
        // Handle init message separately (before wrapping)
        if (type === 'init') {
            const rawmod = await waitForModule;
            mod = WasmModuleLoader.wrapModule(rawmod);
            const { blob, filename } = data;
            const pathParts = filename.split('/');
            const baseName = pathParts.pop(); // "data.nc"
            const mountPoint = pathParts.join('/') || '/'; // "/working"
            try {
                mod.FS.mkdir(mountPoint);
            }
            catch (e) { /* ignore if exists */ }
            try {
                mod.FS.mount(mod.WORKERFS, {
                    blobs: [{ name: baseName, data: blob }],
                }, mountPoint);
            }
            catch (err) {
                console.warn("Mount failed (might already be mounted):", err.message);
            }
            // Send success response matching what initHandler expects
            self.postMessage({ success: true });
            return;
        }
        // For all other operations, ensure mod is initialized
        if (!mod) {
            const rawmod = await waitForModule;
            mod = WasmModuleLoader.wrapModule(rawmod);
        }
        let result;
        switch (type) {
            case 'open': {
                const openResult = mod.nc_open(data.path, data.modeValue);
                const ncid = openResult.ncid ?? -1;
                if (ncid < 0) {
                    throw new Error('nc_open failed with code ' + ncid);
                }
                result = ncid;
                console.log('Worker: Returning ncid:', result);
                break;
            }
            case 'close': {
                const closeResult = mod.nc_close(data.ncid);
                if (closeResult !== NC_CONSTANTS.NC_NOERR) {
                    throw new Error("Failed to close file");
                }
                result = closeResult;
                break;
            }
            //---- Getters ----//
            //Globals
            case 'getGlobalAttributes': {
                result = NCGet.getGlobalAttributes(mod, data.ncid);
                break;
            }
            case 'getFullMetadata': {
                result = NCGet.getFullMetadata(mod, data.ncid);
                break;
            }
            //Dims
            case 'getDimCount': {
                result = NCGet.getDimCount(mod, data.ncid);
                break;
            }
            case 'getDimIDs': {
                result = Array.from(NCGet.getDimIDs(mod, data.ncid));
                break;
            }
            case 'getDim': {
                result = NCGet.getDim(mod, data.ncid, data.dimid);
                break;
            }
            case 'getDims': {
                result = NCGet.getDims(mod, data.ncid);
                break;
            }
            //Vars
            case 'getVariables': {
                console.log('Worker: getVariables called with ncid:', data.ncid);
                result = NCGet.getVariables(mod, data.ncid);
                break;
            }
            case 'getVarIDs': {
                result = Array.from(NCGet.getVarIDs(mod, data.ncid));
                break;
            }
            case 'getVarCount': {
                result = NCGet.getVarCount(mod, data.ncid);
                break;
            }
            case 'getAttributeName': {
                result = NCGet.getAttributeName(mod, data.ncid, data.varid, data.attId);
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
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
        self.postMessage({ id, success: true, result });
    }
    catch (err) {
        console.error(`Worker Error [${type}]:`, err);
        self.postMessage({ id, success: false, error: err.message });
    }
};
//# sourceMappingURL=netcdf-worker.js.map