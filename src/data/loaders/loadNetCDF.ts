// utils/loadNetCDF.ts
import { NetCDF4 } from '@earthyscience/netcdf4-wasm';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useZarrStore } from '@/stores/ZarrStore';

const NETCDF_EXT_REGEX = /\.(nc|netcdf|nc3|nc4)$/i;

export async function loadNetCDF(file: File) {
  const { setStatus } = useGlobalStore.getState();
  const { ncModule } = useZarrStore.getState();
  if (ncModule) ncModule.close();
  setStatus("Loading...");
  const fileName = file.name
  try {
    const data = await NetCDF4.fromBlobLazy(file);
    const [variables, attrs, metadata] = await Promise.all([
      data.getVariables(),
      data.getGlobalAttributes(),
      data.getFullMetadata(),
    ]);
    useGlobalStore.setState({
      variables: Object.keys(variables),
      zMeta: metadata,
      initStore: `local:${fileName}`,
      titleDescription: {
        title: attrs.title ?? fileName,
        description: attrs.history ?? '',
      },
    });
    useZarrStore.setState({ useNC: true, useGT:false, ncModule: data });
  } finally {
    setStatus(null);
  }
}

export { NETCDF_EXT_REGEX };