import * as zarr from "zarrita";
import { ZarrMetadata, ZarrItem, ZarrTitleDescription, FetchStoreOptions } from "./Interfaces";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useErrorStore, ZarrError } from "@/GlobalStates/ErrorStore";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { getDtypeSize, calculateTotalElements, calculateChunkCount, formatBytes } from "./utils";

export async function getFetchStore(
  storePath: string,
  fetchOptions?: FetchStoreOptions
): Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>> | undefined> {
  const maxRetries = fetchOptions?.maxRetries ?? 10;
  const retryDelay = fetchOptions?.retryDelay ?? 500;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const d_store = zarr.tryWithConsolidated(
        new zarr.FetchStore(storePath, { overrides: fetchOptions?.overrides })
      );
      const gs = await d_store.then(store => zarr.open(store, { kind: 'group' }));
      useGlobalStore.setState({ status: null });
      return gs;
    } catch (error) {
      if (attempt === maxRetries) {
        if (storePath.slice(0, 5) !== 'local') {
          useErrorStore.getState().setError('zarrFetch');
          useGlobalStore.setState({ status: null });
        }
        throw new ZarrError(`Failed to initialize store at ${storePath}`, error);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

export async function getFetchStoreMetadata(
  group: zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>
): Promise<ZarrMetadata[]> {
  const contents  = ('contents' in group.store) ? group.store.contents() as ZarrItem[] : [];
  const variables: ZarrMetadata[] = [];

  for (const item of contents) {
    if (item.path && item.path.length > 1 && item.kind === 'array') {
      const array = await zarr.open(group.resolve(item.path.substring(1)), { kind: 'array' });
      const dtypeSize = getDtypeSize(array.dtype);
      const totalElements = calculateTotalElements(array.shape);
      const chunkCount = calculateChunkCount(array.shape, array.chunks);
      const chunkElements = calculateTotalElements(array.chunks);
      const totalSize = totalElements * dtypeSize;
      const chunkSize = chunkElements * dtypeSize;

      const fullPath = item.path.substring(1);
      const pathParts = fullPath.split('/');
      const groupPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : undefined;

      variables.push({
        name: fullPath,
        //@ts-expect-error: doesn't know it exists but sometimes it does
        long_name: array.attrs.long_name,
        shape: array.shape,
        chunks: array.chunks,
        dtype: array.dtype,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        chunkCount,
        chunkSize,
        chunkSizeFormatted: formatBytes(chunkSize),
        groupPath,
      });
    }
  }

  return variables;
}

export async function getFetchStoreTitleDescription(
  group: zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>
): Promise<ZarrTitleDescription> {
  const fallback = useGlobalStore.getState().initStore;
  const description = 'attrs' in group
    ? ('description' in group.attrs ? String(group.attrs.description) : fallback)
    : fallback;
  const title = 'attrs' in group
    ? ('title' in group.attrs ? String(group.attrs.title) : null)
    : null;
  return { title, description };
}

export async function getFetchStoreAttributes(
  group: zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>,
  variable: string,
  cacheName: string
) {
  const outVar = await zarr.open(group.resolve(variable), { kind: 'array' });
  const meta = outVar.attrs;
  useCacheStore.getState().cache.set(cacheName, meta);
  return meta;
}

export async function getFetchStoreDims(
  group: zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>,
  variable: string,
  initStore: string
) {
  const { cache } = useCacheStore.getState();
  const dimArrays: unknown[] = [];
  const dimUnits: unknown[] = [];

  const outVar = await zarr.open(group.resolve(variable), { kind: 'array' });
  const meta = outVar.attrs as Record<string, unknown>;
  meta.shape = outVar.shape;
  cache.set(`${initStore}_${variable}_meta`, meta);

  const dimNames = meta._ARRAY_DIMENSIONS as string[] | undefined;

  if (dimNames) {
    for (const dim of dimNames) {
      const dimArray = await zarr.open(group.resolve(dim), { kind: 'array' })
        .then(result => zarr.get(result));
      const dimMeta  = await zarr.open(group.resolve(dim), { kind: 'array' })
        .then(result => result.attrs);
      cache.set(`${initStore}_${dim}`, dimArray.data);
      cache.set(`${initStore}_${dim}_meta`, dimMeta);
      dimArrays.push(dimArray.data);
      dimUnits.push((dimMeta as Record<string, unknown>).units ?? null);
    }
  } else {
    for (const dimLength of outVar.shape) {
      dimArrays.push(Array(dimLength).fill(0));
      dimUnits.push('Default');
    }
  }

  return {
    dimNames: dimNames ?? Array(outVar.shape.length).fill('Default'),
    dimArrays,
    dimUnits,
  };
}