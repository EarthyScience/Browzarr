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
import { GetNCArray, GetNCMetadata } from "./NCGetters";
import {
	buildDimCoordinateResult,
	DecompressArray,
	defaultFilledDimsForShape,
	getDimensionNamesFromMeta,
} from "./utils";
import { GetZarrArray } from "./ZarrGetters";
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
		console.log("Fetching metadata from icechunk store");
		return getIcechunkMetadata(group as zarr.Group<IcechunkStore>);
	}
	console.log("Fetching metadata from fetch store");
	return getFetchStoreMetadata(
		group as zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>,
	);
}

export async function GetTitleDescription(
	groupStore: Promise<GroupType>,
): Promise<ZarrTitleDescription> {
	const group = await groupStore;
	if (group.store instanceof IcechunkStore) {
		console.log("Fetching title and description from icechunk store");
		return getIcechunkTitleDescription(group as zarr.Group<IcechunkStore>);
	}
	console.log("Fetching title and description from fetch store");
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
	console.log(
		`Getting dimensions for variable "${variable}" with cache key "${cacheName}"`,
	);
	// Cache hit — same for both store types
	if (cache.has(cacheName)) {
		const meta = cache.get(cacheName) as Record<string, unknown>;
		const dimNames = getDimensionNamesFromMeta(meta);
		console.log("Cache hit for dimensions:", { meta, dimNames });
		const dimArrays: unknown[] = [];
		const dimUnits: unknown[] = [];

		if (dimNames) {
			for (const dim of dimNames) {
				dimArrays.push(cache.get(`${initStore}_${dim}`) ?? [0]);
				dimUnits.push(
					cache.get(`${initStore}_${dim}_meta`)?.units ?? null,
				);
			}
		} else {
			const defaults = defaultFilledDimsForShape(meta.shape as number[]);
			dimArrays.push(...defaults.dimArrays);
			dimUnits.push(...defaults.dimUnits);
		}
		return buildDimCoordinateResult(
			dimNames,
			meta.shape as number[],
			dimArrays,
			dimUnits,
		);
	}

	const group = await useZarrStore.getState().currentStore;
	if (!group) throw new Error(`Failed to open store: ${initStore}`);

	if (group.store instanceof IcechunkStore) {
		console.log(
			"Fetching dimensions from icechunk store for variable:",
			variable,
		);
		return getIcechunkDims(
			group as zarr.Group<IcechunkStore>,
			variable,
			initStore,
		);
	}
	return getFetchStoreDims(group, variable, initStore);
}

export async function GetArray(newVariable?: string): Promise<{
	data: Float16Array;
	shape: number[];
	dtype: string;
	scalingFactor: number | null;
}> {
	const {
		is4D,
		idx4D,
		initStore,
		variable: storedVariable,
		setStrides,
	} = useGlobalStore.getState();
	const { useNC } = useZarrStore.getState();
	const { cache } = useCacheStore.getState();
	const variable = newVariable ?? storedVariable;

	//---- 1. Global Cache Check ----//
	if (
		cache.has(
			is4D
				? `${initStore}_${idx4D}_${variable}`
				: `${initStore}_${variable}`,
		)
	) {
		const thisChunk = cache.get(
			is4D
				? `${initStore}_${idx4D}_${variable}`
				: `${initStore}_${variable}`,
		);
		if (thisChunk.compressed) {
			thisChunk.data = DecompressArray(thisChunk.data);
		}
		setStrides(thisChunk.stride);
		return thisChunk;
	}
	if (useNC) {
		const output = GetNCArray(variable);
		return output;
	} else {
		const output = await GetZarrArray(variable);
		return output;
	}
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
