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

interface ChunkProps{
    chunkRanges: [number, number][];
    mapping:number[];
    variable: string;
    ndSlices: [number, number][];
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
            if (!group) throw new Error("Zarr store not initialized");
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
        async fetchChunk({ chunkRanges, mapping, variable, ndSlices }: ChunkProps): Promise<FetchOutput> {
            let chunkSlice: zarr.Slice[] = Array.from({length: ndSlices.length})
            mapping.forEach((val, idx) => {
                const range = chunkRanges[idx]
                chunkSlice[val] = zarr.slice(range[0], range[1])
            })
            chunkSlice = chunkSlice.map((val, idx) => val?? zarr.slice(ndSlices[idx][0], ndSlices[idx][1]))
            const chunk = await fetchWithRetry(() => zarr.get(outVar, chunkSlice), `variable ${variable}`, useGlobalStore.getState().setStatus);
            if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
                throw new Error("BigInt arrays not supported.");
            }
            let outShape = chunk.shape;            
            return { data: chunk.data as Float32Array, shape: outShape as number[], stride: chunk.stride as number[] };
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
        async fetchChunk({ chunkRanges, mapping, variable, ndSlices }: ChunkProps): Promise<FetchOutput> {
            let starts:number[] = Array.from({length:ndSlices.length});
            let counts:number[] = Array.from({length:ndSlices.length});
            chunkRanges.forEach((val, idx) => {
                starts[mapping[idx]] = val[0]; 
                const count = val[1] - val[0];
                counts[mapping[idx]] = count;
            })
            starts = starts.map((val, idx) => val ?? ndSlices[idx][0])
            counts = counts.map(val => val ?? 1)
            let data = await ncModule.getSlicedVariableArray(variable, starts, counts);
            return { data, shape:counts, stride: calculateStrides(counts) };
        },
    };
}