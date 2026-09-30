# Dataset loading

> Load curated, remote, or local datasets.

Click the `database` icon in the main menu to open the dataset modal. There are three ways to get data into Browzarr.

## Curated catalog

The modal ships with a browsable catalog of public datasets, split into two groups:

- **Zarr stores** — e.g. SeasFire Cube, Earth System Data Cube (ESDC), CMIP6 experiments, NASA MUR SST, ARCO-OCEAN
- **Icechunk stores** — e.g. NOAA HRRR/GFS forecasts, ECMWF AIFS, ERA5 surface reanalysis, Met Office forecasts

Each entry shows a label and a short subtitle. Click one to load its metadata.

## Remote store by URL

Paste the URL of a Zarr or Icechunk store:

- **Remote Zarr** — a URL pointing at the store root (where `.zmetadata`/`zarr.json` lives), e.g. `https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr`
- **Remote Icechunk** — a URL pointing at the Icechunk repository

<callout icon="i-lucide-shield-alert">

The store must allow cross-origin requests from the Browzarr origin (**CORS**). If a remote store fails to load, CORS is the most common culprit — see [Remote data](/guides/remote-data).

</callout>

## Local data

With the offline (npm / Julia) versions you can open data from your own disk:

- **Local Zarr** — a `.zarr` directory served locally by the Browzarr app
- **Local NetCDF** — a `.nc` file, decoded in the browser via WebAssembly

See [Local data](/guides/local-data) for details and layout requirements.

## What you see after loading

Once a dataset is selected, Browzarr parses the store's metadata and shows the available variables. From there, continue with [Variable selection](/essentials/variable-selection).
