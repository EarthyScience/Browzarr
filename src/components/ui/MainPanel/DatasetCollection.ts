export const ZARR_STORES = {
  ESDC: 'https://s3.bgc-jena.mpg.de:9000/esdl-esdc-v3.0.2/esdc-16d-2.5deg-46x72x1440-3.0.2.zarr',
  SEASFIRE: 'https://s3.bgc-jena.mpg.de:9000/misc/seasfire_rechunked.zarr',
  PRECIPITATION: 'https://storage.googleapis.com/cmip6/CMIP6/HighResMIP/EC-Earth-Consortium/EC-Earth3P-HR/highresSST-present/r1i1p1f1/Amon/pr/gr/v20170811/',
};

export const DATASETS_COLLECTION = [
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
];