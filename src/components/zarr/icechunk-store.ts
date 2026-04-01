/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
import * as zarr from "zarrita";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useErrorStore, ZarrError } from "@/GlobalStates/ErrorStore";
import { IcechunkStore } from "icechunk-js";
import type { NodeSnapshot } from "icechunk-js";
import type { FetchClient } from "icechunk-js";
import { ZarrMetadata, ZarrTitleDescription } from "./Interfaces";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { getDtypeSize, calculateTotalElements, calculateChunkCount, formatBytes } from "./utils";
import { IcechunkStoreOptions } from "./Interfaces";

export function getIcechunkNodes(store: IcechunkStore): NodeSnapshot[] {
  if (!(store as any)._cachedNodes) {
    (store as any)._cachedNodes = store.listNodes();
  }
  return (store as any)._cachedNodes;
}
// For testing purposes only.
// https://carbonplan-share.s3.us-west-2.amazonaws.com/zarr-layer-examples/pipeline/multi_level_virtual_hybrid_icechunk.icechunk

export async function getIcechunkStore(
  storePath: string,
  options?: IcechunkStoreOptions
): Promise<zarr.Group<IcechunkStore> | undefined> {
  const maxRetries = options?.maxRetries ?? 10;
  const retryDelay = options?.retryDelay ?? 500;

  const fetchClient: FetchClient | undefined = options?.fetchClient
    ?? (options?.headers
      ? {
          async fetch(url, init) {
            return globalThis.fetch(url, {
              ...init,
              headers: { ...init?.headers, ...options.headers },
            });
          },
        }
      : undefined);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const icechunkStore = await IcechunkStore.open(storePath, {
        branch: options?.branch ?? 'main',
        formatVersion: 'v1',
        ...(options?.tag      && { tag: options.tag }),
        ...(options?.snapshot && { snapshot: options.snapshot }),
        ...(fetchClient       && { fetchClient }),
      });

      // Prime the node cache immediately after opening
      (icechunkStore as any)._cachedNodes = icechunkStore.listNodes();
      // console.log('icechunk nodes:', (icechunkStore as any)._cachedNodes);
      const gs = await zarr.open(icechunkStore, { kind: 'group' });
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

export async function getIcechunkMetadata(
  group: zarr.Group<IcechunkStore>
): Promise<ZarrMetadata[]> {
  const icechunkStore = group.store as IcechunkStore;
  const variables: ZarrMetadata[] = [];

  const allNodes   = getIcechunkNodes(icechunkStore);
  console.log('All icechunk nodes:', allNodes);
  const arrayNodes = allNodes.filter(node =>
    (node.nodeData as { type: string }).type === 'array'
  );
  console.log('Array nodes:', arrayNodes);

  for (const node of arrayNodes) {
    const nodeData = node.nodeData as {
      type: 'array';
      shape: { arrayLength: number; chunkLength: number }[];
      dimensionNames: string[];
    };

    const userDataJson = JSON.parse(new TextDecoder().decode(node.userData)) as {
      data_type?: string;
      attributes?: Record<string, unknown>;
    };

    const shape  = nodeData.shape.map(s => s.arrayLength);
    const chunks = nodeData.shape.map(s => s.chunkLength);
    const dtype  = userDataJson.data_type ?? 'unknown';

    const dtypeSize = getDtypeSize(dtype);
    const totalElements = calculateTotalElements(shape);
    const chunkCount = calculateChunkCount(shape, chunks);
    const chunkElements = calculateTotalElements(chunks);
    const totalSize = totalElements * dtypeSize;
    const chunkSize = chunkElements * dtypeSize;

    const fullPath = node.path.startsWith('/') ? node.path.substring(1) : node.path;
    const pathParts = fullPath.split('/');
    const groupPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : undefined;

    variables.push({
      name: fullPath,
      //@ts-expect-error: It doesn't know this exists
      long_name: userDataJson.attributes?.long_name as string ?? undefined,
      shape,
      chunks,
      dtype,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      chunkCount,
      chunkSize,
      chunkSizeFormatted: formatBytes(chunkSize),
      groupPath,
    });
  }
  console.log('Icechunk variables:', variables);
  return variables;
}

export async function getIcechunkTitleDescription(
  group: zarr.Group<IcechunkStore>
): Promise<ZarrTitleDescription> {
  const fallback = useGlobalStore.getState().initStore;
  try {
    const allNodes = getIcechunkNodes(group.store as IcechunkStore);
    const rootNode = allNodes.find(node => node.path === '/');
    if (!rootNode) return { title: null, description: fallback };

    const userDataJson = JSON.parse(new TextDecoder().decode(rootNode.userData)) as {
      attributes?: Record<string, unknown>;
    };
    const attrs = userDataJson.attributes ?? {};
    return {
      title: attrs.title ? String(attrs.title) : null,
      description: attrs.description ? String(attrs.description) : fallback,
    };
  } catch {
    return { title: null, description: fallback };
  }
}

export async function getIcechunkAttributes(
  group: zarr.Group<IcechunkStore>,
  variable: string,
  cacheName: string
) {
  const allNodes = getIcechunkNodes(group.store as IcechunkStore);
  const normalizedVariable = variable.startsWith('/') ? variable : `/${variable}`;
  const node = allNodes.find(n => n.path === normalizedVariable);

  if (!node) throw new Error(`Variable ${variable} not found in icechunk store`);

  const userDataJson = JSON.parse(new TextDecoder().decode(node.userData)) as {
    attributes?: Record<string, unknown>;
  };

  const meta = userDataJson.attributes ?? {};
  useCacheStore.getState().cache.set(cacheName, meta);
  return meta;
}

export async function getIcechunkDims(
  group: zarr.Group<IcechunkStore>,
  variable: string,
  initStore: string
) {
  const { cache } = useCacheStore.getState();
  const allNodes = getIcechunkNodes(group.store as IcechunkStore);
  console.log('All icechunk nodes:', allNodes);
  const normalizedVariable = variable.startsWith('/') ? variable : `/${variable}`;
  const node = allNodes.find(n => n.path === normalizedVariable);
  const dimArrays: unknown[] = [];
  const dimUnits: unknown[] = [];

  if (!node) throw new Error(`Variable ${variable} not found in icechunk store`);

  const nodeData = node.nodeData as {
    type: 'array';
    shape: { arrayLength: number; chunkLength: number }[];
    dimensionNames: string[];
  };

  const userDataJson = JSON.parse(new TextDecoder().decode(node.userData)) as {
    attributes?: Record<string, unknown>;
  };

  const shape = nodeData.shape.map(s => s.arrayLength);
  const dimNames = nodeData.dimensionNames?.length > 0 ? nodeData.dimensionNames : undefined;

  cache.set(`${initStore}_${variable}_meta`, { 
    ...userDataJson.attributes,
    shape,
    dimensionNames: dimNames ?? [], 
  });

  if (dimNames) {
    for (const dim of dimNames) {
      const dimPath = variable.includes('/')
        ? `${variable.split('/').slice(0, -1).join('/')}/${dim}`
        : dim;
      const dimArray = await zarr.open(group.resolve(dimPath), { kind: 'array' })
        .then(result => zarr.get(result));
      const dimNode = allNodes.find(n => n.path === `/${dimPath}`);
      const dimMeta = dimNode
        ? (JSON.parse(new TextDecoder().decode(dimNode.userData)) as { attributes?: Record<string, unknown> }).attributes ?? {}
        : {};
      cache.set(`${initStore}_${dim}`, dimArray.data);
      cache.set(`${initStore}_${dim}_meta`, dimMeta);
      dimArrays.push(dimArray.data);
      dimUnits.push((dimMeta as Record<string, unknown>).units ?? null);
    }
  } else {
    for (const dimLength of shape) {
      dimArrays.push(Array(dimLength).fill(0));
      dimUnits.push('Default');
    }
  }

  return {
    dimNames: dimNames ?? Array(shape.length).fill('Default'),
    dimArrays,
    dimUnits,
  };
}