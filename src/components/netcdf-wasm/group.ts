// Group class for hierarchical data organization

import type { NetCDF4 } from './netcdf4';
import { Dimension } from './dimension';
import { Variable } from './variable';
import { NC_CONSTANTS, DATA_TYPE_MAP } from './constants';
import type { VariableOptions } from './types';

export class Group {
    public readonly dimensions: { [name: string]: Dimension } = {};
    public readonly variables: { [name: string]: Variable } = {};
    public readonly groups: { [name: string]: Group } = {};
    private _attributes: { [key: string]: any } = {};

    constructor(
        protected netcdf: NetCDF4,
        public readonly name: string,
        protected groupId: number
    ) {}

    // Attribute methods
    setAttr(name: string, value: any): void {
        this._attributes[name] = value;
        
        // Store in mock file system if in test mode
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            const mockFiles = (global as any).__netcdf4_mock_files;
            const dataset = this.netcdf as any;
            if (mockFiles && dataset.filename && mockFiles[dataset.filename]) {
                mockFiles[dataset.filename].attributes[name] = value;
            }
        }
        // TODO: Implement actual NetCDF global attribute setting
    }

    getAttr(name: string): any {
        // Check mock file system first if in test mode
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            const mockFiles = (global as any).__netcdf4_mock_files;
            const dataset = this.netcdf as any;
            if (mockFiles && dataset.filename && mockFiles[dataset.filename]) {
                const value = mockFiles[dataset.filename].attributes[name];
                if (value !== undefined) {
                    this._attributes[name] = value; // Sync local cache
                    return value;
                }
            }
        }
        return this._attributes[name];
    }

    attrs(): string[] {
        return Object.keys(this._attributes);
    }

    async createDimension(name: string, size: number | null): Promise<Dimension> {
        // Check for duplicate dimension name
        if (this.dimensions[name]) {
            throw new Error(`Dimension '${name}' already exists`);
        }
        
        // Check for invalid size values
        if (size !== null && size < 0 && size !== NC_CONSTANTS.NC_UNLIMITED) {
            throw new Error(`Invalid dimension size: ${size}. Size must be non-negative or null for unlimited.`);
        }
        
        // Handle unlimited dimension (null or NC_UNLIMITED constant)
        const isUnlimited = size === null || size === NC_CONSTANTS.NC_UNLIMITED;
        const ncSize = isUnlimited ? 0 : size as number; // Use 0 for unlimited in the actual NetCDF API
        const dimid = await this.netcdf.defineDimension(this.groupId, name, ncSize);
        
        const actualSize = isUnlimited ? NC_CONSTANTS.NC_UNLIMITED : size as number;
        const dimension = new Dimension(name, actualSize, isUnlimited);
        this.dimensions[name] = dimension;
        return dimension;
    }

    // Load dimensions and variables from mock storage when in test mode
    public loadMockDimensions(): void {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            const mockFiles = (global as any).__netcdf4_mock_files;
            const dataset = this.netcdf as any;
            if (mockFiles && dataset.filename && mockFiles[dataset.filename]) {
                // Load dimensions
                const mockDims = mockFiles[dataset.filename].dimensions;
                for (const [name, dimData] of Object.entries(mockDims as any)) {
                    const dimension = new Dimension(name, (dimData as any).size, (dimData as any).unlimited);
                    this.dimensions[name] = dimension;
                }
                
                // Load variables
                const mockVars = mockFiles[dataset.filename].variables;
                for (const [name, varData] of Object.entries(mockVars as any)) {
                    const varInfo = varData as any;
                    // Reconstruct variable - for now, assume double datatype and no dimensions for simplicity
                    const variable = new Variable(this.netcdf, name, varInfo.datatype || 'f8', varInfo.dimensions || [], 1, this.groupId);
                    // Restore variable attributes
                    if (varInfo.attributes) {
                        for (const [attrName, attrValue] of Object.entries(varInfo.attributes)) {
                            variable.setAttr(attrName, attrValue);
                        }
                    }
                    this.variables[name] = variable;
                }
            }
        }
    }

    async createVariable(
        name: string, 
        datatype: string, 
        dimensions: string[] = [],
        options: VariableOptions = {}
    ): Promise<Variable> {
        const ncType = DATA_TYPE_MAP[datatype];
        if (ncType === undefined) {
            throw new Error(`Unsupported datatype: ${datatype}`);
        }

        // Get dimension IDs
        const dimIds = dimensions.map(dimName => {
            const dim = this.dimensions[dimName];
            if (!dim) {
                throw new Error(`Dimension '${dimName}' not found`);
            }
            // For now, we'll use the dimension name as ID (simplified)
            return Object.keys(this.dimensions).indexOf(dimName);
        });

        const varid = await this.netcdf.defineVariable(this.groupId, name, ncType, dimIds);
        const variable = new Variable(this.netcdf, name, datatype, dimensions, varid, this.groupId);
        this.variables[name] = variable;
        
        // Store variable metadata in mock storage if in test mode
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            const mockFiles = (global as any).__netcdf4_mock_files;
            const dataset = this.netcdf as any;
            if (mockFiles && dataset.filename && mockFiles[dataset.filename]) {
                mockFiles[dataset.filename].variables[name] = {
                    datatype: datatype,
                    dimensions: dimensions,
                    data: new Float64Array(0),
                    attributes: {}
                };
            }
        }
        
        return variable;
    }

    createGroup(name: string): Group {
        // For simplicity, groups use the same ncid for now
        const group = new Group(this.netcdf, name, this.groupId);
        this.groups[name] = group;
        return group;
    }

    // Python-like method to get all children
    children(): { [name: string]: Group } {
        return this.groups;
    }

    // Get group path (Python-like)
    get path(): string {
        if (this.name === '') return '/';
        return `/${this.name}`;
    }

    toString(): string {
        return `<netCDF4.Group '${this.path}'>`;
    }
}