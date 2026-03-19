// utils/loadNetCDF.ts
import { NetCDF4 } from '@earthyscience/netcdf4-wasm';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';

const NETCDF_EXT_REGEX = /\.(nc|netcdf|nc3|nc4)$/i;

export async function loadNetCDF(file: Blob, filename: string, setOpenVariables: (v: boolean) => void) {
  const { setStatus } = useGlobalStore.getState();
  const { ncModule } = useZarrStore.getState();
  if (ncModule) ncModule.close();
  setStatus("Loading...");
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
      initStore: `local_${filename}`,
      titleDescription: {
        title: attrs.title ?? filename,
        description: attrs.history ?? '',
      },
    });
    useZarrStore.setState({ useNC: true, ncModule: data });
    setOpenVariables(true);
  } finally {
    setStatus(null);
  }
}

export { NETCDF_EXT_REGEX };