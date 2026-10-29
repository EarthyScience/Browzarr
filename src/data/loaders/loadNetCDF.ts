import { NetCDF4 } from '@earthyscience/netcdf4-wasm';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useZarrStore } from '@/stores/ZarrStore';

export const NETCDF_EXT_REGEX = /\.(nc|netcdf|nc3|nc4)$/i;

function openNetCDF(source: File | string) {
  return typeof source === 'string'
    ? NetCDF4.fromUrl(source)
    : NetCDF4.fromBlobLazy(source);
}

export async function loadNetCDF(source: File | string) {
  const { setStatus } = useGlobalStore.getState();
  const isURL = typeof source === 'string';
  const fileName = (isURL ? source.split('/').at(-1) : source.name) || 'dataset.nc';
  setStatus('Loading...');
  try {
    const data = await openNetCDF(source);
    const [variables, attrs, metadata] = await Promise.all([
      data.getVariables(),
      data.getGlobalAttributes(),
      data.getFullMetadata(),
    ]);

    // Only release the previous file once the new one has opened successfully
    useZarrStore.getState().ncModule?.close();
    useGlobalStore.setState({
      variables: Object.keys(variables),
      zMeta: metadata,
      initStore: isURL ? source : `local:${fileName}`,
      titleDescription: {
        title: attrs.title ?? fileName,
        description: attrs.history ?? '',
      },
    });
    useZarrStore.setState({ useNC: true, useGT: false, ncModule: data });
  } catch (error) {
    console.error(`Failed to load NetCDF file "${fileName}":`, error);
  } finally {
    setStatus(null);
  }
}
