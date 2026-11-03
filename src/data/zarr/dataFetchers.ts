import { useGlobalStore } from '@/stores/GlobalStore';
import { useZarrStore } from '@/stores/ZarrStore';
import { useErrorStore, ZarrError } from '@/stores/ErrorStore';
import { GetSize } from './utils';
import * as zarr from 'zarrita';
import { calculateStrides } from '@/lib/helpers';
import * as perf from '@/lib/perf';

interface FetchOutput{
    data: Float32Array
    shape: number[]
    stride: number[]
}

// Per-dim selection: [start, end) range keeps the dim, a scalar index collapses it
export type Selection = ([number, number] | number)[];

function selectionShape(selection: Selection): number[] {
    const shape = selection.filter((s): s is [number, number] => Array.isArray(s)).map(([lo, hi]) => hi - lo);
    return shape.length ? shape : [1];
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
        async fetchChunk(variable: string, selection: Selection): Promise<FetchOutput> {
            const chunkSlice = selection.map(s => Array.isArray(s) ? zarr.slice(s[0], s[1]) : s);
            // zarr.get fetches and decodes together; decode = total - network time spent in this call
            const t0 = perf.now(), net0 = perf.sumOf('chunkFetch');
            const chunk = await fetchWithRetry(() => zarr.get(outVar, chunkSlice), `variable ${variable}`, useGlobalStore.getState().setStatus);
            perf.add('decode', Math.max(0, perf.now() - t0 - (perf.sumOf('chunkFetch') - net0)), t0);
            if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
                throw new Error("BigInt arrays not supported.");
            }
            
            const outShape = chunk.shape?.length ? chunk.shape : selectionShape(selection);
            return { data: chunk.data as Float32Array, shape: outShape, stride: chunk.stride as number[] };
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
        async fetchChunk(variable: string, selection: Selection): Promise<FetchOutput> {
            const starts = selection.map(s => Array.isArray(s) ? s[0] : s);
            const counts = selection.map(s => Array.isArray(s) ? s[1] - s[0] : 1);
            perf.note('netcdf: read+decode are one wasm call, reported as fetchDecode');
            const data = await perf.time('fetchDecode', () => ncModule.getSlicedVariableArray(variable, starts, counts));
            // Scalar dims are collapsed so shape matches Zarrita behavior
            const shape = selectionShape(selection);
            return { data, shape, stride: calculateStrides(shape) };
        },
    };
}