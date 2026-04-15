/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */

import type { NodeSnapshot } from "icechunk-js";
import { IcechunkStore } from "icechunk-js";
import * as zarr from "zarrita";
import { useCacheStore } from "@/GlobalStates/CacheStore";
import { useErrorStore, ZarrError } from "@/GlobalStates/ErrorStore";
import { useGlobalStore } from "@/GlobalStates/GlobalStore";
// import { Repository, HttpStorage } from "icechunk-js";
import {
	IcechunkStoreOptions,
	ZarrMetadata,
	ZarrTitleDescription,
} from "./Interfaces";
import {
	buildDimCoordinateResult,
	computeZarrSizeSummary,
	defaultFilledDimsForShape,
	ensureLeadingSlash,
	groupPathFromRelativeName,
	isRemoteZarrStorePath,
	resolveStoreRetryDefaults,
	sleep,
	stripLeadingSlash,
} from "./utils";

export async function getIcechunkNodes(
	store: IcechunkStore,
): Promise<NodeSnapshot[]> {
	if (!(store as any)._cachedNodes) {
		(store as any)._cachedNodes = store.listNodes();
	}
	return await (store as any)._cachedNodes;
}

export async function getIcechunkStore(
	storePath: string,
	options?: IcechunkStoreOptions,
): Promise<zarr.Group<IcechunkStore> | undefined> {
	const { maxRetries, retryDelay } = resolveStoreRetryDefaults(options);
	const fetchClient = options?.fetchClient;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const icechunkStore = await IcechunkStore.open(storePath, {
				branch: options?.branch ?? "main",
				formatVersion: "v1",
				...(options?.tag && { tag: options.tag }),
				...(options?.snapshot && { snapshot: options.snapshot }),
				...(fetchClient && { fetchClient }),
			});
			// console.log(icechunkStore);
			// const storage = new HttpStorage(storePath);
			// console.log('Storage initialized:', storage);
			// const repo = await Repository.open({ storage });
			// console.log('Repository opened:', repo);
			// const branches = await repo.listBranches();
			// const tags = await repo.listTags();
			// console.log('Branches:', branches);
			// console.log('Tags:', tags);

			// Prime the node cache immediately after opening
			(icechunkStore as any)._cachedNodes = icechunkStore.listNodes();
			// console.log('icechunk nodes:', (icechunkStore as any)._cachedNodes);
			const gs = await zarr.open(icechunkStore, { kind: "group" });
			useGlobalStore.setState({ status: null });

			return gs;
		} catch (error) {
			if (attempt === maxRetries) {
				if (isRemoteZarrStorePath(storePath)) {
					useErrorStore.getState().setError("zarrFetch");
					useGlobalStore.setState({ status: null });
				}
				throw new ZarrError(
					`Failed to initialize store at ${storePath}`,
					error,
				);
			}
			await sleep(retryDelay);
		}
	}
}

export async function getIcechunkMetadata(
	group: zarr.Group<IcechunkStore>,
): Promise<ZarrMetadata[]> {
	const icechunkStore = group.store as IcechunkStore;
	const variables: ZarrMetadata[] = [];

	const allNodes = await getIcechunkNodes(icechunkStore);
	const arrayNodes = allNodes.filter(
		(node) => (node.nodeData as { type: string }).type === "array",
	);

	for (const node of arrayNodes) {
		const nodeData = node.nodeData as {
			type: "array";
			shape: { arrayLength: number; chunkLength: number }[];
			dimensionNames: string[];
		};
		const userDataJson =
			node.userData.length > 0
				? (JSON.parse(new TextDecoder().decode(node.userData)) as {
						data_type?: string;
						attributes?: Record<string, unknown>;
					})
				: {};

		const shape = nodeData.shape.map((s) => s.arrayLength);
		const chunks = nodeData.shape.map((s) => s.chunkLength);
		const dtype = userDataJson.data_type ?? "unknown";

		const {
			totalSize,
			chunkSize,
			chunkCount,
			totalSizeFormatted,
			chunkSizeFormatted,
		} = computeZarrSizeSummary(shape, chunks, dtype);

		const fullPath = stripLeadingSlash(node.path);
		const groupPath = groupPathFromRelativeName(fullPath);

		variables.push({
			name: fullPath,
			//@ts-expect-error: It doesn't know this exists
			long_name:
				(userDataJson.attributes?.long_name as string) ?? undefined,
			shape,
			chunks,
			dtype,
			totalSize,
			totalSizeFormatted,
			chunkCount,
			chunkSize,
			chunkSizeFormatted,
			groupPath,
		});
	}
	return variables;
}

export async function getIcechunkTitleDescription(
	group: zarr.Group<IcechunkStore>,
): Promise<ZarrTitleDescription> {
	const fallback = useGlobalStore.getState().initStore;
	try {
		const allNodes = await getIcechunkNodes(group.store as IcechunkStore);
		const rootNode = allNodes.find((node) => node.path === "/");
		if (!rootNode) return { title: null, description: fallback };

		const userDataJson = JSON.parse(
			new TextDecoder().decode(rootNode.userData),
		) as {
			attributes?: Record<string, unknown>;
		};
		const attrs = userDataJson.attributes ?? {};
		return {
			title: attrs.title ? String(attrs.title) : null,
			description: attrs.description
				? String(attrs.description)
				: fallback,
		};
	} catch {
		return { title: null, description: fallback };
	}
}

export async function getIcechunkAttributes(
	group: zarr.Group<IcechunkStore>,
	variable: string,
	cacheName: string,
) {
	const allNodes = await getIcechunkNodes(group.store as IcechunkStore);
	const normalizedVariable = ensureLeadingSlash(variable);
	const node = allNodes.find((n) => n.path === normalizedVariable);

	if (!node)
		throw new Error(`Variable ${variable} not found in icechunk store`);

	const userDataJson = JSON.parse(
		new TextDecoder().decode(node.userData),
	) as {
		attributes?: Record<string, unknown>;
	};

	const meta = userDataJson.attributes ?? {};
	useCacheStore.getState().cache.set(cacheName, meta);
	return meta;
}

export async function getIcechunkDims(
	group: zarr.Group<IcechunkStore>,
	variable: string,
	initStore: string,
) {
	const { cache } = useCacheStore.getState();
	const allNodes = await getIcechunkNodes(group.store as IcechunkStore);
	const normalizedVariable = ensureLeadingSlash(variable);
	const node = allNodes.find((n) => n.path === normalizedVariable);
	const dimArrays: unknown[] = [];
	const dimUnits: unknown[] = [];

	if (!node)
		throw new Error(`Variable ${variable} not found in icechunk store`);

	const nodeData = node.nodeData as {
		type: "array";
		shape: { arrayLength: number; chunkLength: number }[];
		dimensionNames: string[];
	};

	if (!nodeData.shape || !Array.isArray(nodeData.shape)) {
		throw new Error(
			`Invalid shape data for variable ${variable}: ${nodeData.shape}`,
		);
	}

	const userDataJson = JSON.parse(
		new TextDecoder().decode(node.userData),
	) as {
		attributes?: Record<string, unknown>;
	};
	const meta = userDataJson.attributes ?? {};

	const shape = nodeData.shape.map((s) => s.arrayLength);
	const dimNames =
		nodeData.dimensionNames?.length > 0
			? nodeData.dimensionNames
			: undefined;

	cache.set(`${initStore}_${variable}_meta`, {
		...meta,
		shape,
		dimensionNames: dimNames ?? [],
	});

	if (dimNames) {
		for (const dim of dimNames) {
			const dimPath = variable.includes("/")
				? `${variable.split("/").slice(0, -1).join("/")}/${dim}`
				: dim;
			const dimArray = await zarr
				.open(group.resolve(dimPath), { kind: "array" })
				.then((result) => zarr.get(result));
			const normalizedDimPath = ensureLeadingSlash(dimPath);
			const dimNode = allNodes.find((n) => n.path === normalizedDimPath);
			const dimMeta = dimNode
				? ((
						JSON.parse(
							new TextDecoder().decode(dimNode.userData),
						) as { attributes?: Record<string, unknown> }
					).attributes ?? {})
				: {};

			cache.set(`${initStore}_${dim}`, dimArray.data);
			cache.set(`${initStore}_${dim}_meta`, dimMeta);
			dimArrays.push(dimArray.data);
			dimUnits.push((dimMeta as Record<string, unknown>).units ?? null);
		}
	} else {
		const defaults = defaultFilledDimsForShape(shape);
		dimArrays.push(...defaults.dimArrays);
		dimUnits.push(...defaults.dimUnits);
	}

	return buildDimCoordinateResult(dimNames, shape, dimArrays, dimUnits);
}
