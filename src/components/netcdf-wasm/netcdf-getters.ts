import { NC_CONSTANTS } from './constants';
import type { NetCDF4Module } from './types';

export function getVariables(
    module: NetCDF4Module,
    ncid: number
): Record<string, any> {
    const variables:  Record<string, any> = {}; 
    if (!module) throw new Error("Failed to load module. Ensure module is initialized before calling methods")
    const varCount = getVarCount(module, ncid);
    const dimIds = getDimIDs(module, ncid)
    for (let varid = 0; varid < varCount; varid++) {
        if (dimIds.includes(varid)) continue; //Don't include spatial Vars

        const result = module.nc_inq_varname(ncid,varid);
        if (result.result !== NC_CONSTANTS.NC_NOERR || !result.name) {
            console.warn(`Failed to get variable name for varid ${varid} (error: ${result.result})`);
            continue;
        }
        variables[result.name] = {
            id: varid
        }
    }
    return variables;
}

export function getVarCount(
    module: NetCDF4Module,
    ncid: number
): number {    
    if (!module) throw new Error("Failed to load module. Ensure module is initialized before calling methods")
    const result = module.nc_inq_nvars(ncid);
    if (result.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get number of variables (error: ${result.result})`);
    }
    return result.nvars || 0;
}

export function getDims(
    module: NetCDF4Module,
    ncid: number
): Record<string, any> {
    const dimIDs = getDimIDs(module, ncid);
    const dims: Record<string, any> = {};
    for (const dimid of dimIDs) {
        const dim = getDim(module, ncid, dimid)
        dims[dim.name] = {
            size: dim.len,
            units:dim.units,
            id:dim.id
        }
    }
    return dims
}

export function getDimIDs(
    module: NetCDF4Module,
    ncid: number
): number[] | Int32Array {    
    if (!module) throw new Error("Failed to load module. Ensure module is initialized before calling methods")
    const result = module.nc_inq_dimids(ncid, 0);
    if (result.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get dimension IDs (error: ${result.result})`);
    }
    return result.dimids || [0];
}

export function getDim(
    module: NetCDF4Module,
    ncid: number,
    dimid: number
): Record<string, any> {
    if (!module) throw new Error("Failed to load module. Ensure module is initialized before calling methods")
    const result = module.nc_inq_dim(ncid, dimid);
    if (result.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get dim (error: ${result.result})`);
    }
    const varResult = module.nc_inq_varid(ncid, result.name as string) 
    const varID = varResult.varid as number
    const {result:output, ...dim} = result
    const unitResult = getAttributeValues(module, ncid, varID, "units")
    return {...dim, units:unitResult, id:varID}; 
}

export function getAttributeValues(
    module: NetCDF4Module,
    ncid: number,
    varid: number, 
    attname: string
): any {
    if (!module) throw new Error("Failed to load module. Ensure module is initialized before calling methods")
    const attInfo = module.nc_inq_att(ncid, varid, attname);
    if (attInfo.result !== NC_CONSTANTS.NC_NOERR) {
        console.warn(`Failed to get attribute info for ${attname} (error: ${attInfo.result})`);
        return;
    }
    const attType = attInfo.type;
    if (!attType) throw new Error("Failed to allocate memory for attribute type.");
    let attValue;
    if (attType === 2) attValue = module.nc_get_att_text(ncid, varid, attname, attInfo.len as number);
    else if (attType === 3) attValue = module.nc_get_att_short(ncid, varid, attname, attInfo.len as number);
    else if (attType === 4) attValue = module.nc_get_att_int(ncid, varid, attname, attInfo.len as number);
    else if (attType === 5) attValue = module.nc_get_att_float(ncid, varid, attname, attInfo.len as number);
    else if (attType === 6) attValue = module.nc_get_att_double(ncid, varid, attname, attInfo.len as number);
    else if (attType === 10) attValue = module.nc_get_att_longlong(ncid, varid, attname, attInfo.len as number);
    else attValue = module.nc_get_att_double(ncid, varid, attname, attInfo.len as number);

    return attValue.data
}