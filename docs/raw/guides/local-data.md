# Local data

> Visualize local Zarr and NetCDF files offline.

The online app is sandboxed by the browser and cannot read arbitrary disk paths. To work with local data, run Browzarr offline via npm or Julia (see [Installation](/getting-started/installation)) — the local app serves your files over a tiny local server and the browser fetches from it.

## Local Zarr

Point Browzarr at a `.zarr` directory (standard Zarr v2/v3 layout with `zarr.json`/`.zgroup` at the root):

```bash
browzarr --port 8080
# then select "Local Zarr" in the dataset modal and pick your .zarr directory
```

Or launch straight into a store:

```julia
using Browzarr
browzarr(; store="/absolute/path/to/zarr_file.zarr")
```

## Local NetCDF

`.nc` files are decoded in the browser with WebAssembly (netcdf4-wasm), so most classic and HDF5-based NetCDF files work without conversion:

```julia
browzarr(; store="/absolute/path/to/file.nc")
```

<callout icon="i-lucide-info">

Use **absolute paths** when passing a `store` argument.

</callout>

## Tips for large files

- Chunked NetCDF (HDF5) files behave much better than contiguous ones
- Use the [variable sliders](/essentials/variable-selection) to subset before plotting
- Consider re-chunking to `1–10 MB` chunks for snappier interaction
