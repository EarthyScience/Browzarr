export const ErrorList = {
    oom: {
        title: "Out of Memory",
        description: "The application has run out of memory. Please try closing other applications or restarting your device."
    },
    cors: {
        title: "CORS Error",
        description: "There was a Cross-Origin Resource Sharing (CORS) error. Please check your network settings or try again later."
    },
    404: {
        title: "Resource Not Found",    
        description: "The requested resource could not be found. Please check the URL or try again later."
    },
    zarrFetch: {
        title: "Failed to Fetch Zarr Store",    
        description: "There was an error fetching the Zarr store. Please check the store path and your network connection."
    },
    dataType: {
        title: "Unsupported Data Type",    
        description: "The data type of the array is not supported. Please use arrays with Float[16|32|64] or (u)Int[8|16|32] data types."  
    },
    tsException: {
        title: "1D Transect Unavailable",    
        description: "1D transects are unavailable when using face displacement on the sphere plot."
    },
    largeArray :{
        title: "Requested too Much Memory",
        description: "Browzarr cannot request that much data in one call. This is a fixable issue, open an issue on GitHub so I am motivated to implement it."
    }
}