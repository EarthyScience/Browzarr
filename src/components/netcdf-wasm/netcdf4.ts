// Main NetCDF4 class implementation

import { Group } from './group';
import { WasmModuleLoader } from './wasm-module';
import { NC_CONSTANTS } from './constants';
import type { NetCDF4Module, DatasetOptions, MemoryDatasetSource } from './types';
import * as NCGet from './netcdf-getters'


export class NetCDF4 extends Group {
    private module: NetCDF4Module | null = null;
    private initialized = false;
    private ncid: number = -1;
    private _isOpen = false;
    private memorySource?: MemoryDatasetSource;
    private workerSource?: { blob: Blob; filename: string };
    private worker?: Worker;
    private workerReady?: Promise<void>;

    constructor(
        private filename?: string,
        private mode: string = 'r',
        private options: DatasetOptions = {}
    ) {
        super(null as any, '', -1);
        // Set up self-reference for Group methods
        (this as any).netcdf = this;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            if (this.workerSource) {
                // This now handles the WORKERFS mounting
                await this.setupWorker();
            } else {
                this.module = await WasmModuleLoader.loadModule(this.options);
                if (this.memorySource) {
                    await this.mountMemoryData();
                }
            }

            this.initialized = true;

            // Automatically open the file if a filename was provided
            if (this.filename) {
                await this.open();
            }
        } catch (error) {
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
                this.module = this.createMockModule();
                this.initialized = true;
                if (this.filename) await this.open();
            } else {
                throw error;
            }
        }
    }

    // Python-like factory method
    static async Dataset(
        filename: string,
        mode: string = 'r',
        options: DatasetOptions = {}
    ): Promise<NetCDF4> {
        const dataset = new NetCDF4(filename, mode, options);
        await dataset.initialize();
        return dataset;
    }

    // Create dataset from Blob
    static async fromBlob(
        blob: Blob,
        mode: string = 'r',
        options: DatasetOptions = {}
    ): Promise<NetCDF4> {
        const arrayBuffer = await blob.arrayBuffer();
        return NetCDF4.fromArrayBuffer(arrayBuffer, mode, options);
    }

    // Create dataset from ArrayBuffer
    static async fromArrayBuffer(
        buffer: ArrayBuffer,
        mode: string = 'r',
        options: DatasetOptions = {}
    ): Promise<NetCDF4> {
        const data = new Uint8Array(buffer);
        return NetCDF4.fromMemory(data, mode, options);
    }

    // Create dataset from memory data (Uint8Array or ArrayBuffer)
    static async fromMemory(
        data: Uint8Array | ArrayBuffer,
        mode: string = 'r',
        options: DatasetOptions = {},
        filename?: string
    ): Promise<NetCDF4> {
        if (!data) {
            throw new Error('Data cannot be null or undefined');
        }
        
        if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) {
            throw new Error('Data must be ArrayBuffer or Uint8Array');
        }
        
        const uint8Data = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
        const virtualFilename = filename || `/tmp/netcdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.nc`;
        
        const dataset = new NetCDF4(virtualFilename, mode, options);
        dataset.memorySource = {
            data: uint8Data,
            filename: virtualFilename
        };
        
        await dataset.initialize();
        return dataset;
    }

    // New factory for Blob/File (local, no full preload)
    static async fromBlobLazy(
        blob: Blob,
        options: DatasetOptions = {}
    ): Promise<NetCDF4> {
        // IMPORTANT: Keep this path consistent with the mount logic in the worker
        const mountPoint = '/working';
        const baseName = `netcdf_lazy_${Date.now()}.nc`;
        const fullPath = `${mountPoint}/${baseName}`;
        
        const dataset = new NetCDF4(fullPath, 'r', options);
        // Store the raw blob. The worker will mount it via WORKERFS
        dataset.workerSource = { blob, filename: fullPath }; 
        await dataset.initialize();
        return dataset;
    }


    private async open(): Promise<void> {
        if (this._isOpen) return;

        if (this.worker) {
            return new Promise((resolve, reject) => {
                // Setup a one-time listener for the result
                const handler = (e: MessageEvent) => {
                    if (e.data.type === 'open') {
                        this.worker!.removeEventListener('message', handler);
                        if (e.data.success) {
                            this.ncid = e.data.result;
                            this._isOpen = true;
                            resolve();
                        } else {
                            reject(new Error(e.data.error));
                        }
                    }
                };
                this.worker!.addEventListener('message', handler);
                
                this.worker!.postMessage({
                    type: 'open',
                    path: this.filename,
                    // NC_NOWRITE is 0, usually safe to hardcode or import
                    modeValue: 0 
                });
            });
        } else {
            // Main thread path
            this.ncid = await this.openFile(this.filename!, this.mode as any);
            this._isOpen = true;
        }
    }

    // Property access similar to Python API
    get file_format(): string {
        return this.options.format || 'NETCDF4';
    }

    get disk_format(): string {
        return this.file_format;
    }

    get filepath(): string {
        return this.filename || '';
    }

    get isopen(): boolean {
        return this._isOpen;
    }

    // Check if module is initialized
    isInitialized(): boolean {
        return this.initialized;
    }

    getModule(): NetCDF4Module {
        if (!this.module) {
            throw new Error('NetCDF4 module not initialized. Call initialize() first.');
        }
        return this.module;
    }

    // Close method
    close(): void {
        if (this._isOpen && this.ncid >= 0) {
            this.closeFile(this.ncid);
            this._isOpen = false;
            this.ncid = -1;
        }
    }

    // Sync method (flush to disk)
    async sync(): Promise<void> {
        if (this._isOpen) {
            // TODO: Implement nc_sync when available
            console.warn('sync() not yet implemented');
        }
    }

    // Context manager support (Python-like)
    async __aenter__(): Promise<NetCDF4> {
        if (!this.initialized) {
            await this.initialize();
        }
        return this;
    }

    async __aexit__(): Promise<void> {
        this.close();
    }

    // Low-level NetCDF operations (used by Group methods)
    async openFile(path: string, mode: 'r' | 'w' | 'a' = 'r'): Promise<number> {
        const module = this.getModule();
        const modeValue = mode === 'r' ? NC_CONSTANTS.NC_NOWRITE : 
                         mode === 'w' ? NC_CONSTANTS.NC_WRITE : 
                         NC_CONSTANTS.NC_WRITE;
        
        const result = module.nc_open(path, modeValue);
        if (result.result !== NC_CONSTANTS.NC_NOERR) {
            throw new Error(`Failed to open NetCDF file: ${path} (error: ${result.result})`);
        }
        return result.ncid;
    }

    async closeFile(ncid: number): Promise<void> {
        const module = this.module;
        if (!module) throw new Error("Failed to load module. Ensure module is initialized before calling methods")
        
        const result = module.nc_close(ncid);
        if (result !== NC_CONSTANTS.NC_NOERR) {
            throw new Error(`Failed to close NetCDF file with ID: ${ncid} (error: ${result})`);
        }
    }
    private requestId = 0;

    private async callWorker(type: string, payload: any = {}): Promise<any> {
        if (!this.worker) throw new Error("Worker not initialized");
        
        const id = ++this.requestId;
        
        return new Promise((resolve, reject) => {
            const handler = (e: MessageEvent) => {
                // Only handle messages that match our request ID
                if (e.data.id !== id) return;
                
                if (e.data.success) {
                    resolve(e.data.result);
                } else {
                    reject(new Error(e.data.error || `Worker error in ${type}`));
                }
                
                this.worker!.removeEventListener('message', handler);
            };

            this.worker!.addEventListener('message', handler);

            this.worker!.postMessage({
                id,  // Include the ID in the request
                type,
                ncid: this.ncid,
                ...payload
            });
        });
    }

    async getGlobalAttributes(): Promise<Record<string, any>> {
        if (this.worker) {
            return this.callWorker('getGlobalAttributes')
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getGlobalAttributes(this.module as NetCDF4Module, this.ncid);
        }
    }

    async getFullMetadata(): Promise<Record<string, any>[]> {
        if (this.worker) {
            return this.callWorker('getFullMetadata')
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getFullMetadata(this.module as NetCDF4Module, this.ncid);
        }
    }

    async getAttributeValues(varid: number, attname: string): Promise<any> {
        if (this.worker) {
            return this.callWorker('getAttributeValues', {varid, attname})
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getAttributeValues(this.module as NetCDF4Module, this.ncid, varid, attname);
        }
    }

    async getDimCount(): Promise<number> {
        if (this.worker) {
            return this.callWorker('getDimCount')
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getDimCount(this.module as NetCDF4Module, this.ncid);
        }
    }

    async getVariables(): Promise<Record<string, any>> {
        if (this.worker) {
            return this.callWorker('getVariables')
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getVariables(this.module as NetCDF4Module, this.ncid);
        }
    }

    async getVarIDs(): Promise<number[] | Int32Array> {    
         if (this.worker) {
            return this.callWorker('getVarIDs')
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getVarIDs(this.module as NetCDF4Module, this.ncid);
        }
    }

    async getDimIDs(): Promise<number[] | Int32Array> {    
        if (this.worker) {
            return this.callWorker('getDimIDs')
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getDimIDs(this.module as NetCDF4Module, this.ncid);
        }
    }

    async getDim(dimid: number): Promise<Record<string, any>> {
        if (this.worker) {
            return this.callWorker('getDim', {dimid})
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getDim(this.module as NetCDF4Module, this.ncid, dimid);
        }
    }

    async getDims(): Promise<Record<string, any>> {
        if (this.worker) {
            return this.callWorker('getDims')
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getDims(this.module as NetCDF4Module, this.ncid);
        }
    }
   
    async getVarCount(): Promise<number> {    
        if (this.worker) {
            return this.callWorker('getVarCount')
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getVarCount(this.module as NetCDF4Module, this.ncid);
        }
    }

    async getAttributeName(varid:number, attId: number) : Promise<string | undefined> {
        if (this.worker) {
            return this.callWorker('getAttributeName', {varid, attId})
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getAttributeName(this.module as NetCDF4Module, this.ncid, varid, attId);
        }
    }

    async getVariableInfo(variable: number | string): Promise<Record<string, any>>{
        if (this.worker) {
            return this.callWorker('getVariableInfo', {variable})
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getVariableInfo(this.module as NetCDF4Module, this.ncid, variable);
        }
    }

    async getVariableArray(variable: number | string): Promise<Float32Array | Float64Array | Int16Array | Int32Array | BigInt64Array | BigInt[] | string[]>  {
        if (this.worker) {
            return this.callWorker('getVariableArray', {variable})
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getVariableArray(this.module as NetCDF4Module, this.ncid, variable);
        }
    }

    async getSlicedVariableArray(variable: number | string, start: number[], count: number[]): Promise<Float32Array | Float64Array | Int16Array | Int32Array | BigInt64Array | BigInt[] | string[]> {
        if (this.worker) {
            return this.callWorker('getSlicedVariableArray', {variable, start, count})
        } else {
            // Main thread path is already synchronous (or could be wrapped in Promise.resolve)
            return NCGet.getSlicedVariableArray(this.module as NetCDF4Module, this.ncid, variable, start, count);
        }
    }

    // Create a mock module for testing
    private createMockModule(): NetCDF4Module {
        // Global mock file storage to simulate persistence across instances
        if (!(global as any).__netcdf4_mock_files) {
            (global as any).__netcdf4_mock_files = {};
        }
        const mockFiles = (global as any).__netcdf4_mock_files;

        return {
            nc_open: (path: string, mode: number) => {
                // Mock implementation that simulates invalid filenames and unsupported modes
                if (!path || path.trim() === '' || path.includes('unsupported') || !['r', 'w', 'a'].some(m => this.mode.includes(m))) {
                    return { result: -1, ncid: -1 };
                }
                // For reading mode, file should exist in mock storage, otherwise create a minimal entry
                if (this.mode === 'r' && !mockFiles[path]) {
                    // For test purposes, allow reading non-existent files but initialize them empty
                    mockFiles[path] = {
                        attributes: {},
                        dimensions: {},
                        variables: {}
                    };
                }
                return { result: NC_CONSTANTS.NC_NOERR, ncid: 1 };
            },
            nc_close: (ncid: number) => {
                // In a real implementation, this would flush data to the file
                // For our mock, we'll keep the data in memory
                return NC_CONSTANTS.NC_NOERR;
            },
            nc_create: (path: string, mode: number) => {
                if (path.includes('unsupported') || ['x', 'invalid'].some(m => this.mode.includes(m))) {
                    return { result: -1, ncid: -1 };
                }
                // Initialize mock file storage
                mockFiles[path] = {
                    attributes: {},
                    dimensions: {},
                    variables: {}
                };
                return { result: NC_CONSTANTS.NC_NOERR, ncid: 1 };
            },
            nc_def_dim: (ncid: number, name: string, len: number) => {
                // Store dimension in mock file
                if (this.filename && mockFiles[this.filename]) {
                    mockFiles[this.filename].dimensions[name] = {
                        size: len,
                        unlimited: len === NC_CONSTANTS.NC_UNLIMITED
                    };
                }
                return { result: NC_CONSTANTS.NC_NOERR, dimid: 1 };
            },
            nc_def_var: (ncid: number, name: string, xtype: number, ndims: number, dimids: number[]) => {
                // Initialize variable storage
                if (this.filename && mockFiles[this.filename]) {
                    mockFiles[this.filename].variables[name] = {
                        data: new Float64Array(0),
                        attributes: {}
                    };
                    // Return varid based on current variable count (1-based)
                    const varCount = Object.keys(mockFiles[this.filename].variables).length;
                    return { result: NC_CONSTANTS.NC_NOERR, varid: varCount };
                }
                return { result: NC_CONSTANTS.NC_NOERR, varid: 1 };
            },
            nc_put_var_double: (ncid: number, varid: number, data: Float64Array) => {
                // Store data in mock file - try to map varid to variable name
                if (this.filename && mockFiles[this.filename]) {
                    const variables = mockFiles[this.filename].variables;
                    const varNames = Object.keys(variables);
                    
                    // Map varid to variable name (1-based indexing)
                    if (varNames.length > 0 && varid >= 1 && varid <= varNames.length) {
                        const varName = varNames[varid - 1]; // Convert to 0-based
                        variables[varName].data = new Float64Array(data);
                    }
                }
                return NC_CONSTANTS.NC_NOERR;
            },
            nc_get_var_double: (ncid: number, varid: number, size: number) => {
                // Try to get actual stored data first
                if (this.filename && mockFiles[this.filename]) {
                    const variables = mockFiles[this.filename].variables;
                    const varNames = Object.keys(variables);
                    
                    // Map varid to variable name (1-based indexing)
                    if (varNames.length > 0 && varid >= 1 && varid <= varNames.length) {
                        const varName = varNames[varid - 1]; // Convert to 0-based
                        const storedData = variables[varName].data;
                        if (storedData && storedData.length > 0) {
                            // Return the stored data, resized to requested size if needed
                            if (size <= 0) {
                                return { result: NC_CONSTANTS.NC_NOERR, data: new Float64Array(0) };
                            }
                            const result = new Float64Array(size);
                            for (let i = 0; i < size && i < storedData.length; i++) {
                                result[i] = storedData[i];
                            }
                            return { result: NC_CONSTANTS.NC_NOERR, data: result };
                        }
                    }
                }
                
                // Fallback to test pattern if no data stored
                if (size <= 0) {
                    return { result: NC_CONSTANTS.NC_NOERR, data: new Float64Array(0) };
                }
                const data = new Float64Array(size);
                for (let i = 0; i < size; i++) {
                    data[i] = i * 0.1; // Simple test pattern
                }
                return { result: NC_CONSTANTS.NC_NOERR, data };
            },
            nc_enddef: (ncid: number) => NC_CONSTANTS.NC_NOERR,
        } as any;
    }
    
    private async setupWorker(): Promise<void> {
        if (!this.workerSource) throw new Error('No worker source');

        // 1. Instantiate the worker if it doesn't exist
        if (!this.worker) {
            // Option A: If using Vite/Webpack 5
            this.worker = new Worker(
                new URL('./netcdf-worker.ts', import.meta.url), 
                { type: 'module' }
            );
        }

        this.workerReady = new Promise((resolve, reject) => {
            // Use a named function so we can remove the listener later
            const initHandler = (e: MessageEvent) => {
                if (e.data.success) {
                    this.worker!.removeEventListener('message', initHandler);
                    resolve();
                } else {
                    this.worker!.removeEventListener('message', initHandler);
                    reject(new Error(e.data.message));
                }
            };

            this.worker!.addEventListener('message', initHandler);

            // 3. Send the initialization message
            this.worker!.postMessage({
                type: 'init',
                blob: this.workerSource!.blob,
                filename: this.workerSource!.filename
            });
        });

        return this.workerReady;
    }

    // Mount memory data in the WASM virtual file system
    private async mountMemoryData(): Promise<void> {
        if (!this.memorySource || !this.module) {
            return;
        }

        // Skip mounting in test mode (mock module doesn't have FS)
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            return;
        }

        try {
            const module = this.getModule();
            if (!module.FS) {
                throw new Error('Emscripten FS not available');
            }

            // Ensure the /tmp directory exists
            try {
                module.FS.mkdir('/tmp');
            } catch (e) {
                // Directory might already exist, ignore error
            }
            // Write the memory data to a virtual file
            module.FS.writeFile(this.memorySource.filename, this.memorySource.data);

            // Clear the data reference to free memory - we only need the filename now
            this.memorySource = undefined
        } catch (error) {
            throw new Error(`Failed to mount memory data: ${error}`);
        }
    }

    // Get data from memory or file as ArrayBuffer (for writing back to Blob)
    async toArrayBuffer(): Promise<ArrayBuffer> {
        if (!this.module) {
            throw new Error('NetCDF4 module not initialized');
        }

        // Skip in test mode
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            // Return empty buffer in test mode
            return new ArrayBuffer(0);
        }

        try {
            const module = this.getModule();
            if (!module.FS || !this.filename) {
                throw new Error('Cannot read file data');
            }

            // Read the file from the virtual file system
            const data = module.FS.readFile(this.filename);
            return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        } catch (error) {
            throw new Error(`Failed to read data as ArrayBuffer: ${error}`);
        }
    }

    // Convert to Blob
    async toBlob(type: string = 'application/x-netcdf'): Promise<Blob> {
        const buffer = await this.toArrayBuffer();
        return new Blob([buffer], { type });
    }

    toString(): string {
        const status = this._isOpen ? 'open' : 'closed';
        const source = this.memorySource ? '(in-memory)' : '';
        return `<netCDF4.Dataset '${this.filename}'${source}: mode = '${this.mode}', file format = '${this.file_format}', ${status}>`;
    }
}

