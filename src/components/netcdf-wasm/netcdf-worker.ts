import type { NetCDF4Module } from "./types";
import * as NCGet from './netcdf-getters'
import { WasmModuleLoader } from "./wasm-module";

// netcdf-worker.ts
declare const self: DedicatedWorkerGlobalScope & typeof globalThis;
declare function importScripts(...urls: string[]): void;
declare function NetCDF4Module(config: any): any;

// @ts-ignore: location is available in worker global scope in browsers
importScripts(`${(self as any).location.origin}/netcdf4.js`);
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
    const {type} = data
    const rawmod = (await waitForModule) as NetCDF4Module;
    const mod = WasmModuleLoader.wrapModule(rawmod)
    try {
        switch (type) {
            case 'init': {
                const { blob, filename } = e.data; 
    
                // We need to extract the directory and the base name
                // e.g., if filename is "/working/data.nc", mount point is "/working"
                const pathParts = filename.split('/');
                const baseName = pathParts.pop(); // "data.nc"
                const mountPoint = pathParts.join('/') || '/'; // "/working"
                console.log(filename)
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

                self.postMessage({ type: 'ready' });
                break;
            }

            case 'open': {
                // Use the full mounted path, e.g., '/working/data.nc'
                const result = mod.nc_open(data.path, data.modeValue); // data.path is your virtualFilename
                const ncid = result.ncid ?? -1;
                if (ncid < 0) {
                    throw new Error('nc_open failed with code ' + ncid);
                }
                self.postMessage({ type: 'openResult', success: true, ncid });
                break;
            }

            case 'getVariables': {
                console.log(data)
                const vars = NCGet.getVariables(mod, data.ncid);
                console.log(vars)
                self.postMessage({ type: 'variables', success: true, result: vars });
                break;
            }
        }
    } catch (err: any) {
        console.error(`Worker Error [${type}]:`, err);
        self.postMessage({ type: 'error', message: err.message });
    }

    // Add more handlers here...
};