import * as zarr from "zarrita";
import { ZarrMetadata, ZarrItem, ZarrTitleDescription } from "./Interfaces";
import { useGlobalStore } from "@/utils/GlobalStates";

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

function getDtypeSize(dtype: string): number {
    const dtypeMap: Record<string, number> = {
        'int8': 1,
        'uint8': 1,
        'int16': 2,
        'uint16': 2,
        'int32': 4,
        'uint32': 4,
        'int64': 8,
        'uint64': 8,
        'float32': 4,
        'float64': 8,
        'bool': 1
    };
    return dtypeMap[dtype] || 4; // default to 4 bytes if type not found
}

function calculateTotalElements(shape: number[]): number {
    return shape.reduce((acc, val) => acc * val, 1);
}

function calculateChunkCount(shape: number[], chunks: number[]): number {
    return shape.reduce((acc, dim, i) => acc * Math.ceil(dim / chunks[i]), 1);
}

export async function GetZarrMetadata(groupStore: Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>>): Promise<ZarrMetadata[]> {

    const group = await groupStore
    const contents = ('contents' in group.store) ? group.store.contents() as ZarrItem[] : [];
    const variables: ZarrMetadata[] = [];

    for (const item of contents) {
        
        if (item.path && item.path.length > 1 && item.kind === 'array') {
            const array = await zarr.open(group.resolve(item.path.substring(1)), {kind: "array"});
            const dtypeSize = getDtypeSize(array.dtype);
            const totalElements = calculateTotalElements(array.shape);
            const chunkCount = calculateChunkCount(array.shape, array.chunks);
            const chunkElements = calculateTotalElements(array.chunks);
            
            const totalSize = totalElements * dtypeSize;
            const chunkSize = chunkElements * dtypeSize;
            // Extract group path from the item path
            const fullPath = item.path.substring(1); // Remove leading '/'
            const pathParts = fullPath.split('/');
            const groupPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : undefined;
            // ? should we query the node type instead or in addition?

            variables.push({
                name: item.path.substring(1),
                //@ts-expect-error It doesn't know this exists
                long_name: array.attrs.long_name,
                shape: array.shape,
                chunks: array.chunks,
                dtype: array.dtype,
                totalSize: totalSize,
                totalSizeFormatted: formatBytes(totalSize),
                chunkCount: chunkCount,
                chunkSize: chunkSize,
                chunkSizeFormatted: formatBytes(chunkSize),
                groupPath: groupPath
            });
        }
    }

    return variables;
}

export function GetSize(outVar: any){
    const dtypeSize = getDtypeSize(outVar.dtype);
    const totalElements = calculateTotalElements(outVar.shape);
    const chunkElements = calculateTotalElements(outVar.chunks);
    const totalSize = totalElements * dtypeSize;
    const chunkSize = chunkElements * dtypeSize;
    const chunkShape = outVar.chunks
    return [totalSize,chunkSize,chunkShape]
}

// Common coordinate variable names to filter out
const COORDINATE_VARS = [
    'longitude', 'latitude', 'lat', 'lon', 'time', 
    'depth', 'height', 'altitude',
    'x', 'y', 'z', 't',
    'level'
];

function isCoordinateVariable(name: string): boolean {
    const lowerName = name.toLowerCase();
    return COORDINATE_VARS.some(coord => lowerName === coord);
}

function isOneDimensional(variable: any){
    return variable.shape.length == 1;
}

export async function GetVariableNames(variables: Promise<ZarrMetadata[]>): Promise<string[]> {
    const metadata = await variables;
    return metadata
        .filter(variable => !isCoordinateVariable(variable.name))
        .filter(variable => !isOneDimensional(variable))
        .map(variable => variable.name)
        .sort((a, b) => a.localeCompare(b));
}

export async function GetTitleDescription(
  groupStore: Promise<zarr.Group<zarr.FetchStore | zarr.Listable<zarr.FetchStore>>>, 
): Promise<ZarrTitleDescription> {
  
  const group = await groupStore;
  const description = 'attrs' in group ? ('description' in group.attrs ? String(group.attrs.description) : useGlobalStore.getState().initStore) : useGlobalStore.getState().initStore;
  const title = 'attrs' in group ? ('title' in group.attrs ? String(group.attrs.title) : '') : null;

  return { title, description };
}