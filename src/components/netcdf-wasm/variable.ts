// Variable class similar to netcdf4-python

import type { NetCDF4 } from './netcdf4';
import { NC_CONSTANTS } from './constants';

export class Variable {
    private _attributes: { [key: string]: any } = {};

    constructor(
        private netcdf: NetCDF4,
        public readonly name: string,
        public readonly datatype: string,
        public readonly dimensions: string[],
        private varid: number,
        private ncid: number
    ) {}

    // Attribute access (Python-like)
    setAttr(name: string, value: any): void {
        this._attributes[name] = value;
        
        // Store in mock file system if in test mode
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            const mockFiles = (global as any).__netcdf4_mock_files;
            const dataset = this.netcdf as any;
            if (mockFiles && dataset.filename && mockFiles[dataset.filename] && mockFiles[dataset.filename].variables[this.name]) {
                mockFiles[dataset.filename].variables[this.name].attributes[name] = value;
            }
        }
        
        // TODO: Implement actual NetCDF attribute setting
    }

    getAttr(name: string): any {
        return this._attributes[name];
    }

    attrs(): string[] {
        return Object.keys(this._attributes);
    }


    // Property-style attribute access
    get units(): string | undefined { return this._attributes.units; }
    set units(value: string) { this.setAttr('units', value); }

    get long_name(): string | undefined { return this._attributes.long_name; }
    set long_name(value: string) { this.setAttr('long_name', value); }

    get standard_name(): string | undefined { return this._attributes.standard_name; }
    set standard_name(value: string) { this.setAttr('standard_name', value); }

    get scale_factor(): number | undefined { return this._attributes.scale_factor; }
    set scale_factor(value: number) { this.setAttr('scale_factor', value); }

    get add_offset(): number | undefined { return this._attributes.add_offset; }
    set add_offset(value: number) { this.setAttr('add_offset', value); }

    get _FillValue(): number | undefined { return this._attributes._FillValue; }
    set _FillValue(value: number) { this.setAttr('_FillValue', value); }

    // Additional CF convention attributes
    get calendar(): string | undefined { return this._attributes.calendar; }
    set calendar(value: string) { this.setAttr('calendar', value); }

    get axis(): string | undefined { return this._attributes.axis; }
    set axis(value: string) { this.setAttr('axis', value); }

    toString(): string {
        const dimStr = this.dimensions.length > 0 ? `(${this.dimensions.join(', ')})` : '()';
        return `<netCDF4.Variable '${this.name}': dimensions ${dimStr}, size = [${this.dimensions.map(d => this.netcdf.dimensions[d]?.size || '?').join(' x ')}], type = '${this.datatype}'>`;
    }
}