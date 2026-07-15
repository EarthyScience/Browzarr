import { decompressSync, gzipSync } from "fflate";
import { ZarrMetadata } from "./Interfaces";

export function formatBytes(bytes: number): string {
	const units = ["bytes", "KB", "MB", "GB", "TB", "PB"];
	let value = bytes;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}

	return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export function getDtypeSize(dtype: string): number {
	const dtypeMap: Record<string, number> = {
		int8: 1,
		uint8: 1,
		int16: 2,
		uint16: 2,
		int32: 4,
		uint32: 4,
		int64: 8,
		uint64: 8,
		float32: 4,
		float64: 8,
		bool: 1,
	};
	return dtypeMap[dtype] || 4; // default to 4 bytes if type not found
}
export function RescaleArray(array: Float16Array, scalingFactor: number) {
	// Rescales built array when new chunk has higher scalingFactor
	const multipler = 1 / Math.pow(10, scalingFactor);
	for (let i = 0; i < array.length; i++) {
		array[i] *= multipler;
	}
}

export function ToFloat16(
	array: Float32Array,
	scalingFactor: number | null,
): [Float16Array, number | null] {
	const initialScale = scalingFactor ?? 0;
	let denominator = Math.pow(10, initialScale);
	let multiplier = 1 / denominator;
	let maxVal = 0;
	for (let i = 0; i < array.length; i++) {
		const val = Math.abs(array[i] * multiplier);
		if (val > maxVal && isFinite(val)) {
			maxVal = val;
		}
	}
	if (maxVal === 0) {
		const newArray = new Float16Array(array.length);
		for (let i = 0; i < array.length; i++) {
			newArray[i] = array[i] === 0 ? 0 : NaN;
		}
		return [newArray, initialScale !== 0 ? initialScale : null];
	}

	const additionalScaling = Math.ceil(Math.log10(maxVal / 65504));
	const needsRescale = additionalScaling > 0 || additionalScaling <= -6;
	//I think this is complicating things. Because if it was already scaled then there should already by enough variance in the data it doesn't need to go further
	// (scalingFactor && scalingFactor <= -6 && additionalScaling < 0)
	const newScalingFactor = needsRescale
		? additionalScaling + initialScale
		: initialScale;
	denominator = Math.pow(10, newScalingFactor);
	multiplier = 1 / denominator;
	const newArray = new Float16Array(array.length);
	for (let i = 0; i < array.length; i++) {
		newArray[i] = array[i] * multiplier;
	}
	return [newArray, newScalingFactor != 0 ? newScalingFactor : null];
}

export function calculateTotalElements(shape: number[]): number {
	return shape.reduce((acc, val) => acc * val, 1);
}

export function calculateChunkCount(shape: number[], chunks: number[]): number {
	return shape.reduce((acc, dim, i) => acc * Math.ceil(dim / chunks[i]), 1);
}

/** Promise-based delay for retry/backoff loops. */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Paths that do not start with `local` are treated as remote for error reporting. */
export function isRemoteZarrStorePath(storePath: string): boolean {
	return storePath.slice(0, 5) !== "local";
}

export function resolveStoreRetryDefaults(options?: {
	maxRetries?: number;
	retryDelay?: number;
}): { maxRetries: number; retryDelay: number } {
	return {
		maxRetries: options?.maxRetries ?? 10,
		retryDelay: options?.retryDelay ?? 500,
	};
}

export function stripLeadingSlash(path: string): string {
	return path.startsWith("/") ? path.slice(1) : path;
}

export function ensureLeadingSlash(path: string): string {
	return path.startsWith("/") ? path : `/${path}`;
}

/** `fullPath` is relative to the group root (no leading slash). */
export function groupPathFromRelativeName(
	fullPath: string,
): string | undefined {
	const pathParts = fullPath.split("/");
	return pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : undefined;
}

export function computeZarrSizeSummary(
	shape: number[],
	chunks: number[],
	dtype: string,
): {
	totalSize: number;
	chunkSize: number;
	chunkCount: number;
	totalSizeFormatted: string;
	chunkSizeFormatted: string;
} {
	const dtypeSize = getDtypeSize(dtype);
	const totalElements = calculateTotalElements(shape);
	const chunkCount = calculateChunkCount(shape, chunks);
	const chunkElements = calculateTotalElements(chunks);
	const totalSize = totalElements * dtypeSize;
	const chunkSize = chunkElements * dtypeSize;
	return {
		totalSize,
		chunkSize,
		chunkCount,
		totalSizeFormatted: formatBytes(totalSize),
		chunkSizeFormatted: formatBytes(chunkSize),
	};
}

/** Placeholder coordinate arrays when dimension names are missing. */
export function defaultFilledDimsForShape(shape: number[]): {
	dimArrays: unknown[];
	dimUnits: unknown[];
} {
	const dimArrays: unknown[] = [];
	const dimUnits: unknown[] = [];
	for (const dimLength of shape) {
		dimArrays.push(Array(dimLength).fill(0));
		dimUnits.push("Default");
	}
	return { dimArrays, dimUnits };
}

export function buildDimCoordinateResult(
	dimNames: string[] | undefined,
	shape: number[],
	dimArrays: unknown[],
	dimUnits: unknown[],
): { dimNames: string[]; dimArrays: unknown[]; dimUnits: unknown[] } {
	return {
		dimNames: dimNames ?? Array(shape.length).fill("Default"),
		dimArrays,
		dimUnits,
	};
}

/** NetCDF-style `_ARRAY_DIMENSIONS` or icechunk `dimensionNames` on cached meta. */
export function getDimensionNamesFromMeta(
	meta: Record<string, unknown>,
): string[] | undefined {
	const raw = meta._ARRAY_DIMENSIONS ?? meta.dimensionNames;
	if (!raw) return undefined;
	return raw as string[];
}
export function CompressArray(array: Float16Array, level: number) {
	const uint8View = new Uint8Array(array.buffer);
	const compressed = gzipSync(uint8View, {
		level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined,
	});
	return compressed;
}
// Infer compressed type
export function DecompressArray(compressed: Uint8Array) {
	const decompressed = decompressSync(compressed);
	const floatArray = new Float16Array(decompressed.buffer);
	return floatArray;
}

export function copyChunkToArray(
	chunkData: Float16Array,
	chunkShape: number[],
	chunkStride: number[],
	destArray: Float16Array,
	destShape: number[],
	destStride: number[],
	chunkGridPos: number[],
	fullChunkDim: number[],
	sliceStart: number[],
): void {
	const [z, y, x] = chunkGridPos;
	const [chunkDimZ, chunkDimY, chunkDimX] = fullChunkDim;
	const [sliceStartZ, sliceStartY, sliceStartX] = sliceStart;
	const [destShapeZ, destShapeY, destShapeX] = destShape;

	const absZ = z * chunkDimZ;
	const absY = y * chunkDimY;
	const absX = x * chunkDimX;

	const czStart = Math.max(0, sliceStartZ - absZ);
	const czEnd = Math.min(chunkShape[0], sliceStartZ + destShapeZ - absZ);
	const cyStart = Math.max(0, sliceStartY - absY);
	const cyEnd = Math.min(chunkShape[1], sliceStartY + destShapeY - absY);
	const cxStart = Math.max(0, sliceStartX - absX);
	const cxEnd = Math.min(chunkShape[2], sliceStartX + destShapeX - absX);

	for (let cz = czStart; cz < czEnd; cz++) {
		for (let cy = cyStart; cy < cyEnd; cy++) {
			const sourceRowOffset = cz * chunkStride[0] + cy * chunkStride[1];
			const destZ = (absZ + cz) - sliceStartZ;
			const destY = (absY + cy) - sliceStartY;
			const destXStart = (absX + cxStart) - sliceStartX;
			const destRowOffset = destZ * destStride[0] + destY * destStride[1] + destXStart;

			if (chunkStride[2] === 1) {
				const rowData = chunkData.subarray(
					sourceRowOffset + cxStart,
					sourceRowOffset + cxEnd,
				);
				destArray.set(rowData, destRowOffset);
			} else {
				for (let cx = cxStart; cx < cxEnd; cx++) {
					const destX = (absX + cx) - sliceStartX;
					destArray[destZ * destStride[0] + destY * destStride[1] + destX] = chunkData[sourceRowOffset + cx * chunkStride[2]];
				}
			}
		}
	}
}

export function copyChunkToArray2D(
	chunkData: Float16Array,
	chunkShape: number[],
	chunkStride: number[],
	destArray: Float16Array,
	destShape: number[],
	destStride: number[],
	chunkGridPos: number[],
	fullChunkDim: number[],
	sliceStart: number[],
): void {
	const [y, x] = chunkGridPos;
	const [chunkDimY, chunkDimX] = fullChunkDim;
	const [sliceStartY, sliceStartX] = sliceStart;
	const [destShapeY, destShapeX] = destShape;

	const absY = y * chunkDimY;
	const absX = x * chunkDimX;

	const cyStart = Math.max(0, sliceStartY - absY);
	const cyEnd = Math.min(chunkShape[0], sliceStartY + destShapeY - absY);
	const cxStart = Math.max(0, sliceStartX - absX);
	const cxEnd = Math.min(chunkShape[1], sliceStartX + destShapeX - absX);

	for (let cy = cyStart; cy < cyEnd; cy++) {
		const sourceRowOffset = cy * chunkStride[0];
		const destY = (absY + cy) - sliceStartY;
		const destXStart = (absX + cxStart) - sliceStartX;
		const destRowOffset = destY * destStride[0] + destXStart;

		if (chunkStride[1] === 1) {
			const rowData = chunkData.subarray(
				sourceRowOffset + cxStart,
				sourceRowOffset + cxEnd,
			);
			destArray.set(rowData, destRowOffset);
		} else {
			for (let cx = cxStart; cx < cxEnd; cx++) {
				const destX = (absX + cx) - sliceStartX;
				destArray[destY * destStride[0] + destX] = chunkData[sourceRowOffset + cx * chunkStride[1]];
			}
		}
	}
}

export function GetSize(outVar: any) {
	const dtypeSize = getDtypeSize(outVar.dtype);
	const totalElements = calculateTotalElements(outVar.shape);
	const chunkElements = calculateTotalElements(outVar.chunks);
	const totalSize = totalElements * dtypeSize;
	const chunkSize = chunkElements * dtypeSize;
	const chunkShape = outVar.chunks;
	return [totalSize, chunkSize, chunkShape];
}

// Common coordinate variable names to filter out
const COORDINATE_VARS = [
	"longitude",
	"latitude",
	"lat",
	"lon",
	"time",
	"depth",
	"height",
	"altitude",
	"x",
	"y",
	"z",
	"t",
	"level",
];

function isCoordinateVariable(name: string): boolean {
	const lowerName = name.toLowerCase();
	return COORDINATE_VARS.some((coord) => lowerName === coord);
}

function isOneDimensional(variable: any) {
	return variable.shape.length == 1;
}

export async function GetVariableNames(
	variables: Promise<ZarrMetadata[]>,
): Promise<string[]> {
	const metadata = await variables;
	return metadata
		.filter((variable) => !isCoordinateVariable(variable.name))
		.filter((variable) => !isOneDimensional(variable))
		.map((variable) => variable.name)
		.sort((a, b) => a.localeCompare(b));
}
