import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useZarrStore } from '@/GlobalStates/ZarrStore';
import { useErrorStore, ZarrError } from '@/GlobalStates/ErrorStore';
import { GetSize } from './utils';
import * as zarr from 'zarrita';
import { calculateStrides } from '@/utils/HelperFuncs';


interface FetchOutput{
    data: Float32Array
    shape: number[]
    stride: number[]
}

//---- Zarr Fetch ----//

async function fetchWithRetry<T>(
    operation: () => Promise<T>, 
    context: string, 
    setStatus: (s: string | null) => void,
    maxRetries = 10, 
    retryDelay = 500
): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                useErrorStore.getState().setError('zarrFetch');
                setStatus(null);
                throw new ZarrError(`Failed to fetch ${context}`, error);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    throw new Error("Unreachable");
}


export function zarrFetcher() {
    const {currentStore} = useZarrStore.getState()
    let outVar: zarr.Array<zarr.DataType, any>;
    return {
        async getMetadata(variable: string) {
            const group = await currentStore;
            const tempOutVar = await zarr.open(group.resolve(variable), { kind: "array" });
            outVar = tempOutVar
            if (!outVar.is("number") && !outVar.is("bigint")) {
                throw new Error(`Unsupported data type: ${outVar.dtype}`);
            }
            const symbols = Object.getOwnPropertySymbols(outVar);
            const contextSymbol = symbols.find(s => s.toString().includes("zarrita.context"));
            const fillValue = contextSymbol && !Number.isNaN((outVar as any)[contextSymbol]?.fill_value)
                ? (outVar as any)[contextSymbol].fill_value
                : NaN;
            return {
                shape: outVar.shape,
                chunkShape: GetSize(outVar)[2],
                fillValue,
                dtype: outVar.dtype,
                _outVar: outVar, // carry through for fetchChunk
            } as any;
        },
        async fetchChunk({ variable, rank, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D }: any): Promise<FetchOutput> {
            const chunkSlice = new Array(rank).fill(0);
            chunkSlice[xDimIndex] = zarr.slice(x * chunkShape[xDimIndex], (x + 1) * chunkShape[xDimIndex]);
            chunkSlice[yDimIndex] = zarr.slice(y * chunkShape[yDimIndex], (y + 1) * chunkShape[yDimIndex]);
            if (zDimIndex >= 0) chunkSlice[zDimIndex] = zarr.slice(z * chunkShape[zDimIndex], (z + 1) * chunkShape[zDimIndex]);
            if (rank >= 4) chunkSlice[0] = idx4D;

            const chunk = await fetchWithRetry(() => zarr.get(outVar, chunkSlice), `variable ${variable}`, useGlobalStore.getState().setStatus);
            if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
                throw new Error("BigInt arrays not supported.");
            }
            return { data: chunk.data as Float32Array, shape: chunkShape, stride: chunk.stride };
        },
    };
}

//---- NC Fetch ----//

export function NCFetcher() {
    const {ncModule} = useZarrStore.getState()
    return {
        async getMetadata(variable: string) {
            const varInfo = await ncModule.getVariableInfo(variable);
            const { shape, attributes: atts } = varInfo;
            const chunkShape = varInfo.chunks || shape;

            let fillValue = NaN;
            if ("missing_value" in atts) fillValue = !Number.isNaN(atts["missing_value"][0]) ? atts["missing_value"][0] : fillValue;
            if ("_FillValue" in atts) fillValue = !Number.isNaN(atts["_FillValue"][0]) ? atts["_FillValue"][0] : fillValue;

            let validRange: { min: number; max: number } | undefined;
            if ("valid_min" in atts && "valid_max" in atts) validRange = { min: atts["valid_min"][0], max: atts["valid_max"][0] };

            let preScaling: number | undefined;
            if ("scale_factor" in atts && atts["scale_factor"][0] !== 1) preScaling = atts["scale_factor"][0];

            return { shape, chunkShape, fillValue, validRange, preScaling, dtype: varInfo.dtype };
        },
        async fetchChunk({ rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D, variable }: any): Promise<FetchOutput> {
            const starts = new Array(rank).fill(0);
            const counts = new Array(rank).fill(1);
            if (rank > 3) { starts[0] = idx4D; counts[0] = 1; }
            starts[xDimIndex] = x * chunkShape[xDimIndex];
            counts[xDimIndex] = Math.min(chunkShape[xDimIndex], shape[xDimIndex] - starts[xDimIndex]);
            starts[yDimIndex] = y * chunkShape[yDimIndex];
            counts[yDimIndex] = Math.min(chunkShape[yDimIndex], shape[yDimIndex] - starts[yDimIndex]);
            if (zDimIndex >= 0) {
                starts[zDimIndex] = z * chunkShape[zDimIndex];
                counts[zDimIndex] = Math.min(chunkShape[zDimIndex], shape[zDimIndex] - starts[zDimIndex]);
            }

            let data = await ncModule.getSlicedVariableArray(variable, starts, counts);

            return { data, shape: counts as number[], stride: calculateStrides(counts) };
        },
    };
}