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
export function RescaleArray(array: Float16Array, scalingFactor: number){ // Rescales built array when new chunk has higher scalingFactor
	const multipler = 1/Math.pow(10,scalingFactor)
	for (let i = 0; i < array.length; i++) {
		array[i] *= multipler;
	}
}

// export function ToFloat16(array : Float32Array, scalingFactor: number | null) : [Float16Array, number | null]{ 
// 	const initialScale = scalingFactor ?? 0
// 	let denominator =  Math.pow(10,initialScale); 
// 	let multiplier = 1/denominator;
// 	let maxVal = 0;
// 	for (let i = 0; i < array.length; i++) {
// 		const val = Math.abs(array[i] * multiplier);
// 		if (val > maxVal && isFinite(val)) {
//             maxVal = val;
//         }
// 	}
// 	const additionalScaling = Math.ceil(Math.log10(maxVal/65504))
// 	const needsRescale =
// 		additionalScaling > 0 ||
// 		additionalScaling <= -6
// 		//I think this is complicating things. Because if it was already scaled then there should already by enough variance in the data it doesn't need to go further
// 		// (scalingFactor && scalingFactor <= -6 && additionalScaling < 0) 
// 	const newScalingFactor = needsRescale ?
// 		additionalScaling + initialScale :
// 		initialScale
// 	denominator = Math.pow(10,newScalingFactor);
// 	multiplier = 1/denominator;
// 	const newArray = new Float16Array(array.length)
// 	for (let i = 0; i < array.length; i++) {
// 		newArray[i] = array[i] * multiplier;
// 	}
// 	return [newArray, newScalingFactor != 0 ? newScalingFactor : null]
// }

export function ToFloat16(array : Float32Array) : [Float16Array, number | null]{ 
    let scalingFactor = 0;
	let maxVal = 0;
	for (let i = 0; i < array.length; i++) {
		const val = Math.abs(array[i]);
		if (val > maxVal && isFinite(val)) {
            maxVal = val;
        }
	}
    const newArray = new Float16Array(array.length)
    const scaleCheck = Math.ceil(Math.log10(maxVal/65504))
	if (scaleCheck > 0 || scaleCheck <= -6){
        scalingFactor = scaleCheck
        const denominator = Math.pow(10,scalingFactor);
        const multiplier = 1/denominator;
        for (let i = 0; i < array.length; i++) {
            newArray[i] = array[i] * multiplier;
        }
    }
	return [newArray, scalingFactor]
}

export function calculateTotalElements(shape: number[]): number {
    return shape.reduce((acc, val) => acc * val, 1);
}

export function calculateChunkCount(shape: number[], chunks: number[]): number {
    return shape.reduce((acc, dim, i) => acc * Math.ceil(dim / chunks[i]), 1);
}

export function CompressArray(array: Float16Array, level: number){
    const uint8View = new Uint8Array(array.buffer);
    const compressed = gzipSync(uint8View, { level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined })
    return compressed
}
// Infer compressed type
export function DecompressArray(compressed : Uint8Array){
    const decompressed = decompressSync(compressed)
    const floatArray = new Float16Array(decompressed.buffer)
    return floatArray
}

export function copyChunkToArray(
    chunkData: Float16Array,
    chunkShape: number[],
    chunkStride: number[],
    destArray: Float16Array,
    destShape: number[], 
    destStride: number[],
    chunkGridPos: number[],
    chunkGridStart: number[],
): void {
    const [z, y, x] = chunkGridPos;
    const [zStartIdx, yStartIdx, xStartIdx] = chunkGridStart;
    const [chunkShapeZ, chunkShapeY, chunkShapeX] = chunkShape;
    const [destShapeZ, destShapeY, destShapeX] = destShape;

    // 1. Calculate the local coordinates of the chunk within the destination grid
    const localZ = z - zStartIdx;
    const localY = y - yStartIdx;
    const localX = x - xStartIdx;

    // 2. Determine the starting element position for this chunk in the destination array
    const zStart = localZ * chunkShapeZ;
    const yStart = localY * chunkShapeY;
    const xStart = localX * chunkShapeX;

    // 3. Calculate the actual number of elements to copy for this chunk
    // This prevents writing past the end of the destination array for partial chunks.
    const zLimit = Math.min(chunkShapeZ, destShapeZ - zStart);
    const yLimit = Math.min(chunkShapeY, destShapeY - yStart);
    const xLimit = Math.min(chunkShapeX, destShapeX - xStart);

    // 4. Loop using the calculated limits and copy row by row
    for (let cz = 0; cz < zLimit; cz++) {
        for (let cy = 0; cy < yLimit; cy++) {
            // Offset to the start of the row in the SOURCE chunk data
            const sourceRowOffset = cz * chunkStride[0] + cy * chunkStride[1];
            
            // Offset to the start of the row in the DESTINATION typedArray
            const destRowOffset = (zStart + cz) * destStride[0] + (yStart + cy) * destStride[1] + xStart;
            
            // Get the row of data from the source chunk, using the new xLimit
            const rowData = chunkData.subarray(sourceRowOffset, sourceRowOffset + xLimit);
            
            // Place the row in the correct position in the final array
            destArray.set(rowData, destRowOffset);
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
    chunkGridStart: number[],
): void {
    // Destructure the 2D properties
    const [y, x] = chunkGridPos;
    const [yStartIdx, xStartIdx] = chunkGridStart;
    const [chunkShapeY, chunkShapeX] = chunkShape;
    const [destShapeY, destShapeX] = destShape;

    // 1. Calculate the local coordinates of the chunk within the destination grid
    const localY = y - yStartIdx;
    const localX = x - xStartIdx;

    // 2. Determine the starting element position for this chunk in the destination array
    const yStart = localY * chunkShapeY;
    const xStart = localX * chunkShapeX;

    // 3. Calculate the actual number of elements to copy for this chunk.
    // This prevents writing past the end of the destination array for partial chunks.
    const yLimit = Math.min(chunkShapeY, destShapeY - yStart);
    const xLimit = Math.min(chunkShapeX, destShapeX - xStart);

    // 4. Loop through the rows (Y-axis) and copy each one
    for (let cy = 0; cy < yLimit; cy++) {
        // Offset to the start of the row in the SOURCE chunk data
        // chunkStride[0] is the stride for the Y-dimension
        const sourceRowOffset = cy * chunkStride[0];
        
        // Offset to the start of the row in the DESTINATION typedArray
        // destStride[0] is the stride for the Y-dimension
        const destRowOffset = (yStart + cy) * destStride[0] + xStart;
        
        // Get the row of data from the source chunk, using the calculated xLimit
        const rowData = chunkData.subarray(sourceRowOffset, sourceRowOffset + xLimit);
        
        // Place the row in the correct position in the final destination array
        destArray.set(rowData, destRowOffset);
    }
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
