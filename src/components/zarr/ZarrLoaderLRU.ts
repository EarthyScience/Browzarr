import { IcechunkStore } from "icechunk-js";
import * as zarr from "zarrita";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
import { useZarrStore } from "@/GlobalStates/ZarrStore";
import {
	FetchStoreOptions,
	IcechunkStoreOptions,
	ZarrMetadata,
	ZarrTitleDescription,
} from "./Interfaces";
import {
	getIcechunkAttributes,
	getIcechunkDims,
	getIcechunkMetadata,
	getIcechunkStore,
	getIcechunkTitleDescription,
} from "./icechunk-store";
import { GetNCMetadata } from "./NCGetters";

import {
	buildDimCoordinateResult,
	defaultFilledDimsForShape,
	getDimensionNamesFromMeta,
} from "./utils";

import {
	getFetchStore,
	getFetchStoreAttributes,
	getFetchStoreDims,
	getFetchStoreMetadata,
	getFetchStoreTitleDescription,
} from "./zarrita-store";

type GroupType = zarr.Group<
	zarr.FetchStore | zarr.Listable<zarr.FetchStore> | IcechunkStore
>;

export async function GetStore(
	storePath: string,
	fetchOptions?: FetchStoreOptions,
	icechunkOptions?: IcechunkStoreOptions,
): Promise<GroupType | undefined> {
	if (icechunkOptions) {
		return getIcechunkStore(storePath, icechunkOptions);
	}
	return getFetchStore(storePath, fetchOptions);
}

export async function GetZarrMetadata(
	groupStore: Promise<GroupType>,
): Promise<ZarrMetadata[]> {
	const group = await groupStore;
	if (group.store instanceof IcechunkStore) {
		return getIcechunkMetadata(group as zarr.Group<IcechunkStore>);
	}
	return getFetchStoreMetadata(
		group as zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>,
	);
}

export async function GetTitleDescription(
	groupStore: Promise<GroupType>,
): Promise<ZarrTitleDescription> {
	const group = await groupStore;
	if (group.store instanceof IcechunkStore) {
		return getIcechunkTitleDescription(group as zarr.Group<IcechunkStore>);
	}
	return getFetchStoreTitleDescription(
		group as zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>,
	);
}

export async function GetZarrAttributes(thisVariable?: string) {
	const { initStore, variable } = useGlobalStore.getState();
	const { cache } = useCacheStore.getState();
	const { currentStore } = useZarrStore.getState();
	const resolvedVariable = thisVariable ?? variable;
	const cacheName = `${initStore}_${resolvedVariable}_meta`;

	if (cache.has(cacheName)) return cache.get(cacheName);

	const group = await currentStore;
	if (!group) throw new Error(`Failed to open store: ${initStore}`);

	if (group.store instanceof IcechunkStore) {
		return getIcechunkAttributes(
			group as zarr.Group<IcechunkStore>,
			resolvedVariable,
			cacheName,
		);
	}
	return getFetchStoreAttributes(group, resolvedVariable, cacheName);
}

export async function GetZarrDims(variable: string) {
	const { cache } = useCacheStore.getState();
	const { initStore } = useGlobalStore.getState();
	const cacheName = `${initStore}_${variable}_meta`;
	// Cache hit — same for both store types
	if (cache.has(cacheName)) {
		const meta = cache.get(cacheName) as Record<string, unknown>;
		const shape = meta.shape as number[];
		if (!shape || !Array.isArray(shape)) {
			console.warn(
				`Invalid shape in cache for ${cacheName}, treating as cache miss`,
				// meta,
			);
		} else {
			const dimNames = getDimensionNamesFromMeta(meta);
			const dimArrays: unknown[] = [];
			const dimUnits: unknown[] = [];

			if (dimNames) {
				for (let i = 0; i < dimNames.length; i++) {
					const dim = dimNames[i];
					dimArrays.push(
						cache.get(`${initStore}_${dim}`) ??
							new Array(shape[i]).fill(0),
					);
					dimUnits.push(
						cache.get(`${initStore}_${dim}_meta`)?.units ?? null,
					);
				}
			} else {
				const defaults = defaultFilledDimsForShape(shape);
				dimArrays.push(...defaults.dimArrays);
				dimUnits.push(...defaults.dimUnits);
			}
			return buildDimCoordinateResult(
				dimNames,
				shape,
				dimArrays,
				dimUnits,
			);
		}
	}

	const group = await useZarrStore.getState().currentStore;
	if (!group) throw new Error(`Failed to open store: ${initStore}`);

	if (group.store instanceof IcechunkStore) {
		return getIcechunkDims(
			group as zarr.Group<IcechunkStore>,
			variable,
			initStore,
		);
	}
	return getFetchStoreDims(group, variable, initStore);
}

export async function GetAttributes(thisVariable?: string) {
	const { initStore, variable } = useGlobalStore.getState();
	const { cache } = useCacheStore.getState();
	const { useNC } = useZarrStore.getState();
	const cacheName = `${initStore}_${thisVariable ?? variable}_meta`;
	if (cache.has(cacheName)) {
		const meta = cache.get(cacheName);
		return useNC ? meta.attributes : meta;
	} else {
		if (useNC) {
			const meta = await GetNCMetadata(thisVariable);
			return meta.attributes;
		} else {
			const meta = await GetZarrAttributes(thisVariable);
			return meta;
		}
	}
}
