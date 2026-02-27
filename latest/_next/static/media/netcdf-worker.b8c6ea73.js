import * as NCGet from './netcdf-getters.js';
import { WasmModuleLoader } from "./wasm-module.js";
import { NC_CONSTANTS } from "./constants.js";
let netcdfModule;
let mod;
// Wait for runtime initialization
const waitForModule = new Promise(async (resolve) => {
    const netcdf4Module = await import('./netcdf4-wasm.js');
    const createNetCDF4Module = netcdf4Module.default;
    netcdfModule = await createNetCDF4Module({
        locateFile: (file) => {
            if (file.endsWith('.wasm')) {
                const origin = self.location.origin;
                const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
                return `${origin}${basePath}/${file}`;
            }
            return file;
        }
    });
    resolve(netcdfModule);
});
// @ts-ignore worker scope
self.onmessage = async (e) => {
    const data = e.data;
    const { type, id } = data;
    try {
        // ---------------- INIT ----------------
        if (type === 'init') {
            mod = WasmModuleLoader.wrapModule(await waitForModule);
            const { blob, filename } = data;
            const pathParts = filename.split('/');
            const baseName = pathParts.pop();
            const mountPoint = pathParts.join('/') || '/';
            // safer for nested paths
            try {
                mod.FS.mkdirTree(mountPoint);
            }
            catch (_) { }
            try {
                mod.FS.mount(mod.WORKERFS, {
                    blobs: [{ name: baseName, data: blob }],
                }, mountPoint);
            }
            catch (err) {
                console.warn("Mount failed (might already be mounted):", err.message);
            }
            self.postMessage({ id, success: true });
            return;
        }
        // ------------- ENSURE READY -------------
        if (!mod) {
            mod = WasmModuleLoader.wrapModule(await waitForModule);
        }
        let result;
        switch (type) {
            case 'open': {
                const openResult = mod.nc_open(data.path, data.modeValue);
                if (openResult.result !== NC_CONSTANTS.NC_NOERR) {
                    throw new Error('nc_open failed: ' + openResult.result);
                }
                result = openResult.ncid;
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
            // ---- Globals ----
            case 'getGlobalAttributes':
                result = NCGet.getGlobalAttributes(mod, data.ncid, data.groupPath);
                break;
            case 'getFullMetadata':
                result = NCGet.getFullMetadata(mod, data.ncid, data.groupPath);
                break;
            // ---- Dims ----
            case 'getDimCount':
                result = NCGet.getDimCount(mod, data.ncid);
                break;
            case 'getDimIDs':
                result = Array.from(NCGet.getDimIDs(mod, data.ncid));
                break;
            case 'getDim':
                result = NCGet.getDim(mod, data.ncid, data.dimid);
                break;
            case 'getDims':
                result = NCGet.getDims(mod, data.ncid, data.groupPath);
                break;
            // ---- Vars ----
            case 'getGroupVariables':
                // console.log('Worker: getGroupVariables', data.ncid);
                result = NCGet.getGroupVariables(mod, data.ncid, data.groupPath);
                break;
            case 'getVarIDs':
                result = Array.from(NCGet.getVarIDs(mod, data.ncid));
                break;
            case 'getVarCount':
                result = NCGet.getVarCount(mod, data.ncid);
                break;
            case 'getAttributeName':
                result = NCGet.getAttributeName(mod, data.ncid, data.varid, data.attId);
                break;
            case 'getVariableInfo':
                result = NCGet.getVariableInfo(mod, data.ncid, data.variable, data.groupPath);
                break;
            case 'getAttributeValues':
                result = NCGet.getAttributeValues(mod, data.ncid, data.varid, data.attname);
                break;
            // ---- Arrays ----
            case 'getVariableArray':
                result = NCGet.getVariableArray(mod, data.ncid, data.variable, data.groupPath);
                break;
            case 'getSlicedVariableArray':
                result = NCGet.getSlicedVariableArray(mod, data.ncid, data.variable, data.start, data.count, data.groupPath);
                break;
            // ---- Groups ----
            case 'getGroups':
                result = NCGet.getGroups(mod, data.ncid);
                break;
            case 'getGroupsRecursive':
                result = NCGet.getGroupsRecursive(mod, data.ncid);
                break;
            case 'getGroupNCID':
                result = NCGet.getGroupNCID(mod, data.ncid, data.groupPath);
                break;
            case 'getGroupName':
                result = NCGet.getGroupName(mod, data.ncid);
                break;
            case 'getGroupPath':
                result = NCGet.getGroupPath(mod, data.ncid);
                break;
            case 'getCompleteHierarchy':
                result = NCGet.getCompleteHierarchy(mod, data.ncid, data.groupPath);
                break;
            case 'getVariables':
                result = NCGet.getVariables(mod, data.ncid);
                break;
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