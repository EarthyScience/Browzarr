export const ZARR_STORES = {
  ESDC: 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr',
  SEASFIRE: 'https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr',
  PRECIPITATION: 'https://storage.googleapis.com/cmip6/CMIP6/HighResMIP/EC-Earth-Consortium/EC-Earth3P-HR/highresSST-present/r1i1p1f1/Amon/pr/gr/v20170811/',
  ERA5_TEMPERATURE: 'https://storage.googleapis.com/gcp-public-data-arco-era5/ar/full_37-1h-0p25deg-chunk-1.zarr-v3',
  CMIP6_SST: 'https://storage.googleapis.com/cmip6/CMIP6/CMIP/NCAR/CESM2/historical/r1i1p1f1/Omon/tos/gn/v20190308/',
  MODIS_NDVI: 'https://storage.googleapis.com/earthengine-public/modis/ndvi.zarr',
  PRISM_CLIMATE: 'https://storage.googleapis.com/prism-climate/4km/zarr/ppt/',
  GLEAM_EVAP: 'https://www.gleam.eu/datasets/v3.6a/daily/E.zarr',
};

export const CURATED_DATASETS = [
  {
    key: 'seasfire',
    label: 'SeasFire Cube',
    subtitle: 'A Global Dataset for Seasonal Fire Modeling in the Earth System',
    store: ZARR_STORES.SEASFIRE,
  },
  {
    key: 'ESDC',
    label: 'ESDC',
    subtitle: 'Earth System Data Cube v3.0.2',
    store: ZARR_STORES.ESDC,
  },
  {
    key: 'precipitation',
    label: 'Precipitation (EC-Earth3P-HR)',
    subtitle: 'Precipitation data from EC-Earth3P-HR highresSST-present',
    store: ZARR_STORES.PRECIPITATION,
  },
  {
    key: 'era5_temperature',
    label: 'ERA5 Temperature',
    subtitle: 'ARCO ERA5 full atmospheric reanalysis at 0.25° resolution',
    store: ZARR_STORES.ERA5_TEMPERATURE,
  },
  {
    key: 'cmip6_sst',
    label: 'CMIP6 Sea Surface Temperature',
    subtitle: 'CESM2 historical ocean surface temperature (Omon, gn)',
    store: ZARR_STORES.CMIP6_SST,
  },
  {
    key: 'modis_ndvi',
    label: 'MODIS NDVI',
    subtitle: 'Normalized Difference Vegetation Index from MODIS Terra',
    store: ZARR_STORES.MODIS_NDVI,
  },
  {
    key: 'prism_climate',
    label: 'PRISM Climate Data',
    subtitle: 'High-resolution monthly precipitation over the contiguous US at 4km',
    store: ZARR_STORES.PRISM_CLIMATE,
  },
  {
    key: 'gleam_evap',
    label: 'GLEAM Evaporation',
    subtitle: 'Global Land Evaporation Amsterdam Model v3.6a daily actual evaporation',
    store: ZARR_STORES.GLEAM_EVAP,
  },
];