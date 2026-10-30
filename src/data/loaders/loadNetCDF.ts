import { NetCDF4 } from '@earthyscience/netcdf4-wasm';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useZarrStore } from '@/stores/ZarrStore';
import { useErrorStore } from '@/stores/ErrorStore';

export const NETCDF_EXT_REGEX = /\.(nc|netcdf|nc3|nc4)$/i;

async function openNetCDF(source: File | string) {
  const {fetchOptions} = useZarrStore.getState()
  const thisOptions = fetchOptions 
    ? {
      headers: fetchOptions.headers,
      withCredentials: fetchOptions.withCredentials
    }
    : undefined
  if (typeof source !== 'string') return NetCDF4.fromBlobLazy(source);
  // The first remote open often fails; retry once after a short delay
  return NetCDF4.fromUrl(source, thisOptions).catch(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return NetCDF4.fromUrl(source, thisOptions).catch(error => {
      useErrorStore.getState().setError('ncFail');
      throw error;
    });
  });
}

export async function loadNetCDF(source: File | string): Promise<boolean> {
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
    return true;
  } catch (error) {
    console.error(`Failed to load NetCDF file "${fileName}":`, error);
    return false;
  } finally {
    setStatus(null);
  }
}
