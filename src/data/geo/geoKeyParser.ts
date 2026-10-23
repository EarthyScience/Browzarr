const MODEL_TYPE = { 1: 'Projected', 2: 'Geographic', 3: 'Geocentric' };
const RASTER_TYPE = { 1: 'PixelIsArea', 2: 'PixelIsPoint' };
const LINEAR_UNITS = { 9001: 'metre', 9002: 'foot', 9003: 'US survey foot' };
const ANGULAR_UNITS = { 9101: 'radian', 9102: 'degree' };
const USER_DEFINED = 32767;

// Common EPSG codes; extend as needed
const KNOWN_EPSG = {
  4326: 'WGS 84',
  4269: 'NAD83',
  3857: 'WGS 84 / Pseudo-Mercator',
  4258: 'ETRS89',
};

function describeEpsg(code: number) {
  if (code == null) return null;
  if (code === USER_DEFINED) return 'User-defined';
  if (KNOWN_EPSG[code as keyof typeof KNOWN_EPSG]) return KNOWN_EPSG[code as keyof typeof KNOWN_EPSG];
  // WGS 84 / UTM: 32601-32660 north, 32701-32760 south
  if (code >= 32601 && code <= 32660) return `WGS 84 / UTM zone ${code - 32600}N`;
  if (code >= 32701 && code <= 32760) return `WGS 84 / UTM zone ${code - 32700}S`;
  return null; // fall back to a lookup (proj4 / epsg.io) for others
}

export function parseGeoKeys(geoKeys: Record<string, any>) {
  const modelType = MODEL_TYPE[geoKeys.GTModelTypeGeoKey as keyof typeof MODEL_TYPE] ?? 'Unknown';
  const epsg = geoKeys.ProjectedCSTypeGeoKey ?? geoKeys.GeographicTypeGeoKey ?? null;
  const isProjected = modelType === 'Projected';
  const isGeographic = modelType === 'Geographic';

  return {
    modelType,
    rasterType: RASTER_TYPE[geoKeys.GTRasterTypeGeoKey as keyof typeof RASTER_TYPE] ?? 'Unknown',
    epsg,
    crsName:
      describeEpsg(epsg) ??
      geoKeys.GTCitationGeoKey ??
      geoKeys.GeogCitationGeoKey ??
      (epsg ? `EPSG:${epsg}` : 'Unknown'),
    datum: geoKeys.GeogCitationGeoKey ?? null,
    units: isProjected
      ? LINEAR_UNITS[geoKeys.ProjLinearUnitsGeoKey as keyof typeof LINEAR_UNITS] ?? 'unknown'
      : isGeographic
      ? ANGULAR_UNITS[geoKeys.GeogAngularUnitsGeoKey as keyof typeof ANGULAR_UNITS] ?? 'unknown'
      : 'unknown',
    axes: isGeographic
      ? { x: 'longitude', y: 'latitude' }
      : { x: 'x', y: 'y' },
    pixelIsPoint: geoKeys.GTRasterTypeGeoKey === 2,
    raw: geoKeys,
  };
}