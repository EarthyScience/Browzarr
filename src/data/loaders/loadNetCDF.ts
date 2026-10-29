// utils/loadNetCDF.ts
import { NetCDF4 } from '@earthyscience/netcdf4-wasm';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useZarrStore } from '@/stores/ZarrStore';

const NETCDF_EXT_REGEX = /\.(nc|netcdf|nc3|nc4)$/i;

export async function loadNetCDF(file: File | string) {
  const { setStatus } = useGlobalStore.getState();
  const { ncModule } = useZarrStore.getState();
  if (ncModule) ncModule.close();
  setStatus("Loading...");
  const isURL = typeof file === 'string'
  const fileName = isURL ? file.split('/').at(-1) : file.name
  const fetcher = isURL ? NetCDF4.fromUrl : NetCDF4.fromBlobLazy
  try {
    const data = await fetcher(file);
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
  } catch{ console.log("Yes failed"); console.log(fetcher); console.log(typeof file)
  }finally {
    setStatus(null);
  }
}

export { NETCDF_EXT_REGEX };