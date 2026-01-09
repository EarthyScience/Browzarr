import { NC_CONSTANTS, DATA_TYPE_SIZE, CONSTANT_DTYPE_MAP } from './constants';
import type { NetCDF4Module } from './types';

export function getVariables(
    module: NetCDF4Module,
    ncid: number
): Record<string, any> {
    const variables:  Record<string, any> = {}; 
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
    const result = module.nc_inq_nvars(ncid);
    if (result.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get number of variables (error: ${result.result})`);
    }
    return result.nvars || 0;
}

export function getDimCount(
    module: NetCDF4Module,
    ncid: number
): number {    
    const result = module.nc_inq_ndims(ncid);
    if (result.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get number of dimensions (error: ${result.result})`);
    }
    return result.ndims || 0;
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

export function getGlobalAttributes(
    module: NetCDF4Module,
    ncid: number,
): Record<string, any> {
    const attributes: Record<string, any> = {};
    const nattsResult = module.nc_inq_natts(ncid);
    if (nattsResult.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get number of global attributes (error: ${nattsResult.result})`);
    }
    const nAtts = nattsResult.natts as number
    const attNames = []
    for (let i=0; i < nAtts; i++){
        const name = getAttributeName(module, ncid, NC_CONSTANTS.NC_GLOBAL, i)
        attNames.push(name)
    }
    if (attNames.length === 0) return attributes
    for (const attname of attNames){
        if (!attname) continue;
        attributes[attname] = getAttributeValues(module, ncid, NC_CONSTANTS.NC_GLOBAL, attname)
    }
    return attributes
}

export function getAttributeName(
    module: NetCDF4Module,
    ncid: number,
    varid:number, 
    attId: number
) : string | undefined {
    const result = module.nc_inq_attname(ncid, varid, attId);
    if (result.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get attribute (error: ${result.result})`);
    }
    return result.name
}

export function getFullMetadata(
    module: NetCDF4Module,
    ncid: number,
): Record<string, any>[] {
    const varIds = getVarIDs(module, ncid)
    const metas = []
    for (const varid of varIds){
        const varMeta = getVariableInfo(module, ncid, varid)
        const {attributes, ...varDeets} = varMeta
        metas.push({...varDeets,...attributes})
    }
    return metas
}

export function getVarIDs(
    module: NetCDF4Module,
    ncid: number
): number[] | Int32Array {    
    const result = module.nc_inq_varids(ncid);
    if (result.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get variable IDs (error: ${result.result})`);
    }
    return result.varids || [0];
}

export function getVariableInfo(
    module: NetCDF4Module,
    ncid: number,
    variable: number | string): Record<string, any>{
    const info: Record<string, any> = {}

    const isId = typeof variable === "number"
    let varid = variable
    if (!isId){
        const result = module.nc_inq_varid(ncid, variable)
        varid = result.varid as number
    }
    const result = module.nc_inq_var(ncid, varid as number);
    if (result.result !== NC_CONSTANTS.NC_NOERR) {
        throw new Error(`Failed to get variable info (error: ${result.result})`);
    }
    const typeMultiplier = DATA_TYPE_SIZE[result.type as number]

    //Dim Info
    const dimids = result.dimids
    const dims = []
    const shape = []
    let size = 1
    if (dimids){
        for (const dimid of dimids){
            const dim = getDim(module, ncid, dimid)
            size *= dim.len
            dims.push(dim)
            shape.push(dim.len)
        }
    }
    
    //Attribute Info
    const attNames = []
    if (result.natts){
        for (let i = 0; i < result.natts; i++ ){
            const attname = getAttributeName(module, ncid, varid as number, i)
            attNames.push(attname)
        } 
    }
    const atts: Record<string, any> = {}
    if (attNames.length > 0){
        for (const attname of attNames){
            if (!attname) continue;
            atts[attname] = getAttributeValues(module, ncid, varid as number, attname)
        }
    }

    //Chunking Info
    let chunks: number[];
    const chunkResult = module.nc_inq_var_chunking(ncid, varid as number);
    const isChunked = chunkResult.chunking === NC_CONSTANTS.NC_CHUNKED
    if (isChunked) {
        chunks = chunkResult.chunkSizes as number[]
    } else{
        chunks = shape
    }
    const chunkElements = chunks.reduce((a: number, b: number) => a * b, 1)

    //Output 
    info["name"] = result.name
    info["dtype"] = CONSTANT_DTYPE_MAP[result.type as number]
    info['nctype'] = result.type
    info["shape"] = shape
    info['dims'] = dims
    info["size"] = size
    info["totalSize"] = size * typeMultiplier
    info["attributes"] = atts
    info["chunked"] = isChunked
    info["chunks"] = chunks
    info["chunkSize"] = chunkElements * typeMultiplier

    return info;
}

export function getVariableArray(
    module: NetCDF4Module,
    ncid: number,
    variable: number | string
): Float32Array | Float64Array | Int16Array | Int32Array | BigInt64Array | BigInt[] | string[]  {
    const isId = typeof variable === "number"
    let varid = isId ? variable as number : 0
    if (!isId){
        const result = module.nc_inq_varid(ncid, variable)
        varid = result.varid as number
    }
    const info = getVariableInfo(module, ncid, varid)
    const arraySize = info.size
    const arrayType = info.nctype
    if (!arrayType || !arraySize) throw new Error("Failed to allocate memory for array")
    let arrayData;
    if (arrayType === 2) arrayData = module.nc_get_var_text(ncid, varid, arraySize);
    else if (arrayType === 3) arrayData = module.nc_get_var_short(ncid, varid, arraySize);
    else if (arrayType === 4) arrayData = module.nc_get_var_int(ncid, varid, arraySize);
    else if (arrayType === 10) arrayData = module.nc_get_var_longlong(ncid, varid, arraySize);
    else if (arrayType === 5) arrayData = module.nc_get_var_float(ncid, varid, arraySize);
    else if (arrayType === 6) arrayData = module.nc_get_var_double(ncid, varid, arraySize);
    else arrayData = module.nc_get_var_double(ncid, varid, arraySize);
    if (!arrayData.data) throw new Error("Failed to read array data")
    return arrayData.data
}

export function getSlicedVariableArray(
    module: NetCDF4Module,
    ncid: number,
    variable: number | string, 
    start: number[], 
    count: number[]
): Float32Array | Float64Array | Int16Array | Int32Array | BigInt64Array | BigInt[] | string[] {
    const isId = typeof variable === "number"
    let varid = isId ? variable as number : 0
    if (!isId){
        const result = module.nc_inq_varid(ncid, variable)
        varid = result.varid as number
    }
    const info = getVariableInfo(module, ncid, varid)
    const arrayType = info.nctype
    if (!arrayType) throw new Error("Failed to allocate memory for array")
    let arrayData;
    if (arrayType === 3) arrayData = module.nc_get_vara_short(ncid, varid, start, count);
    else if (arrayType === 4) arrayData = module.nc_get_vara_int(ncid, varid, start, count);
    else if (arrayType === 5) arrayData = module.nc_get_vara_float(ncid, varid, start, count);
    else if (arrayType === 6) arrayData = module.nc_get_vara_double(ncid, varid, start, count);
    else arrayData = module.nc_get_vara_double(ncid, varid, start, count);
    if (!arrayData.data) {
        console.log(arrayData)
        throw new Error("Failed to read array data")}
    return arrayData.data
}

//    if (!module) throw new Error("Failed to load module. Ensure module is initialized before calling methods")