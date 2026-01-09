// NetCDF4 constants (populated from NetCDF4 headers)

export const NC_CONSTANTS = {
    // Error codes
    NC_NOERR: 0,
    
    // File modes
    NC_NOWRITE: 0,
    NC_WRITE: 1,
    NC_CLOBBER: 0,
    NC_NOCLOBBER: 4,
    NC_NETCDF4: 4096,
    
    // Data types
    NC_BYTE: 1,
    NC_CHAR: 2,
    NC_SHORT: 3,
    NC_INT: 4,
    NC_FLOAT: 5,
    NC_DOUBLE: 6,
    NC_LONGLONG: 10,
    
    // Storage types
    NC_CHUNKED: 0,
    NC_CONTIGUOUS: 1,
    NC_COMPACT: 2,
    // Special values
    NC_UNLIMITED: -1000, // Use special value to distinguish from 0
    NC_GLOBAL: -1,
};

// Data type mapping from string names to NetCDF constants
export const DATA_TYPE_MAP: { [key: string]: number } = {
    'f8': NC_CONSTANTS.NC_DOUBLE,
    'f4': NC_CONSTANTS.NC_FLOAT,
    'i4': NC_CONSTANTS.NC_INT,
    'i2': NC_CONSTANTS.NC_SHORT,
    'i1': NC_CONSTANTS.NC_BYTE,
    'S1': NC_CONSTANTS.NC_CHAR,
    'i8': NC_CONSTANTS.NC_LONGLONG,
    'double': NC_CONSTANTS.NC_DOUBLE,
    'float': NC_CONSTANTS.NC_FLOAT,
    'int': NC_CONSTANTS.NC_INT,
    'short': NC_CONSTANTS.NC_SHORT,
    'byte': NC_CONSTANTS.NC_BYTE,
    'char': NC_CONSTANTS.NC_CHAR
};

export const CONSTANT_DTYPE_MAP: { [key: number]: string } = {
    1 : 'i1',
    2: 'S1',
    3: 'i2',
    4: 'i4',
    5: 'f4',
    6: 'f8',
    10: 'i8'
}

export const DATA_TYPE_SIZE: { [key: number]: number } = {
    1: 1,
    2: 1,
    3: 2,
    4: 4,
    5: 4,
    6: 8,
    10: 8
}
