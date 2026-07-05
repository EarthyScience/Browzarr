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
        async fetchChunk({ rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D, variable, ndSlices }: any): Promise<FetchOutput> {
            const chunkSlice = new Array(rank).fill(0);
            if (ndSlices && ndSlices.length === rank) {
                for (let i = 0; i < rank; i++) {
                    if (i === xDimIndex) {
                        chunkSlice[i] = zarr.slice(x * chunkShape[i], Math.min((x + 1) * chunkShape[i], shape[i]));
                    } else if (i === yDimIndex) {
                        chunkSlice[i] = zarr.slice(y * chunkShape[i], Math.min((y + 1) * chunkShape[i], shape[i]));
                    } else if (i === zDimIndex) {
                        chunkSlice[i] = zarr.slice(z * chunkShape[i], Math.min((z + 1) * chunkShape[i], shape[i]));
                    } else {
                        const sel = ndSlices[i];
                        if (Array.isArray(sel)) {
                            chunkSlice[i] = zarr.slice(sel[0], sel[1]);
                        } else {
                            chunkSlice[i] = sel;
                        }
                    }
                }
            } else {
                chunkSlice[xDimIndex] = zarr.slice(x * chunkShape[xDimIndex], (x + 1) * chunkShape[xDimIndex]);
                chunkSlice[yDimIndex] = zarr.slice(y * chunkShape[yDimIndex], (y + 1) * chunkShape[yDimIndex]);
                if (zDimIndex >= 0) {
                    chunkSlice[zDimIndex] = zarr.slice(z * chunkShape[zDimIndex], (z + 1) * chunkShape[zDimIndex]);
                }
                if (rank >= 4) {
                    chunkSlice[0] = idx4D;
                }
            }

            const chunk = await fetchWithRetry(() => zarr.get(outVar, chunkSlice), `variable ${variable}`, useGlobalStore.getState().setStatus);
            if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
                throw new Error("BigInt arrays not supported.");
            }
            
            let outShape = chunk.shape;
            if (!outShape || outShape.length === 0) {
                outShape = chunkShape; // fallback if Zarrita doesn't collapse
            }
            
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
        async fetchChunk({ rank, shape, chunkShape, x, y, z, xDimIndex, yDimIndex, zDimIndex, idx4D, variable, ndSlices }: any): Promise<FetchOutput> {
            const starts = new Array(rank).fill(0);
            const counts = new Array(rank).fill(1);

            if (ndSlices && ndSlices.length === rank) {
                for (let i = 0; i < rank; i++) {
                    if (i === xDimIndex) {
                        starts[i] = x * chunkShape[i];
                        counts[i] = Math.min(chunkShape[i], shape[i] - starts[i]);
                    } else if (i === yDimIndex) {
                        starts[i] = y * chunkShape[i];
                        counts[i] = Math.min(chunkShape[i], shape[i] - starts[i]);
                    } else if (i === zDimIndex) {
                        starts[i] = z * chunkShape[i];
                        counts[i] = Math.min(chunkShape[i], shape[i] - starts[i]);
                    } else {
                        const sel = ndSlices[i];
                        if (Array.isArray(sel)) {
                            starts[i] = sel[0];
                            counts[i] = sel[1] - sel[0];
                        } else {
                            starts[i] = sel;
                            counts[i] = 1;
                        }
                    }
                }
            } else {
                if (rank > 3) { starts[0] = idx4D; counts[0] = 1; }
                starts[xDimIndex] = x * chunkShape[xDimIndex];
                counts[xDimIndex] = Math.min(chunkShape[xDimIndex], shape[xDimIndex] - starts[xDimIndex]);
                starts[yDimIndex] = y * chunkShape[yDimIndex];
                counts[yDimIndex] = Math.min(chunkShape[yDimIndex], shape[yDimIndex] - starts[yDimIndex]);
                if (zDimIndex >= 0) {
                    starts[zDimIndex] = z * chunkShape[zDimIndex];
                    counts[zDimIndex] = Math.min(chunkShape[zDimIndex], shape[zDimIndex] - starts[zDimIndex]);
                }
            }

            let data = await ncModule.getSlicedVariableArray(variable, starts, counts);

            // Filter out collapsed dims so shape matches Zarrita behavior
            let collapsedShape = counts.filter((c, i) => ndSlices ? (!Array.isArray(ndSlices[i]) && i !== xDimIndex && i !== yDimIndex && i !== zDimIndex ? false : true) : c !== 1);
            if (collapsedShape.length === 0) collapsedShape = [1];
            
            console.log("NCFetcher fetchChunk:", {
                variable, rank, x, y, z, xDimIndex, yDimIndex, zDimIndex, ndSlices,
                starts, counts, collapsedShape, rawShape: shape, chunkShape
            });

            return { data, shape: collapsedShape, stride: calculateStrides(collapsedShape) };
        },
    };
}


//---- Class possiblity

export class ZarrFetcher {
    private outVar: zarr.Array<zarr.DataType, any> | undefined;
    private variable: string;

    constructor(variable: string) {
        this.variable = variable;
    }

    async init(){
        const { currentStore } = useZarrStore.getState();
        const group = await currentStore;
        const tempOutVar = await zarr.open(group.resolve(this.variable), { kind: "array" });
        this.outVar = tempOutVar;
    }

    async getMetadata(): Promise<any> {
        if (!this.outVar) {
            await this.init();
            if (!this.outVar){
                throw new Error(`Init failed`);
            }
        }
        if (!this.outVar.is("number") && !this.outVar.is("bigint")) {
            throw new Error(`Unsupported data type: ${this.outVar.dtype}`);
        }

        const symbols = Object.getOwnPropertySymbols(this.outVar);
        const contextSymbol = symbols.find(s => s.toString().includes("zarrita.context"));
        const fillValue = contextSymbol && !Number.isNaN((this.outVar as any)[contextSymbol]?.fill_value)
                            ? (this.outVar as any)[contextSymbol].fill_value
                            : NaN;
        return {
            shape: this.outVar.shape,
            chunkShape: GetSize(this.outVar)[2],
            fillValue,
            dtype: this.outVar.dtype,
        };
    }

    async fetchChunk({
        rank,
        shape,
        chunkShape,
        x,
        y,
        z,
        xDimIndex,
        yDimIndex,
        zDimIndex,
        idx4D,
        ndSlices
    }: any): Promise<FetchOutput> {
        if (!this.outVar) {
            await this.init();
            if (!this.outVar){
                throw new Error(`Init failed`);
            }
        }

        const chunkSlice = new Array(rank).fill(0);
        if (ndSlices && ndSlices.length === rank) {
            for (let i = 0; i < rank; i++) {
                if (i === xDimIndex) {
                    chunkSlice[i] = zarr.slice(x * chunkShape[i], Math.min((x + 1) * chunkShape[i], shape[i]));
                } else if (i === yDimIndex) {
                    chunkSlice[i] = zarr.slice(y * chunkShape[i], Math.min((y + 1) * chunkShape[i], shape[i]));
                } else if (i === zDimIndex) {
                    chunkSlice[i] = zarr.slice(z * chunkShape[i], Math.min((z + 1) * chunkShape[i], shape[i]));
                } else {
                    const sel = ndSlices[i];
                    if (Array.isArray(sel)) {
                        chunkSlice[i] = zarr.slice(sel[0], sel[1]);
                    } else {
                        chunkSlice[i] = sel;
                    }
                }
            }
        } else {
            chunkSlice[xDimIndex] = zarr.slice(x * chunkShape[xDimIndex], (x + 1) * chunkShape[xDimIndex]);
            chunkSlice[yDimIndex] = zarr.slice(y * chunkShape[yDimIndex], (y + 1) * chunkShape[yDimIndex]);
            if (zDimIndex >= 0) {
                chunkSlice[zDimIndex] = zarr.slice(z * chunkShape[zDimIndex], (z + 1) * chunkShape[zDimIndex]);
            }
            if (rank >= 4) {
                chunkSlice[0] = idx4D;
            }
        }

        const chunk = await fetchWithRetry(
            () => zarr.get(this.outVar!, chunkSlice),
            `variable ${this.variable}`,
            useGlobalStore.getState().setStatus
        );

        if (!chunk || chunk.data instanceof BigInt64Array || chunk.data instanceof BigUint64Array) {
            throw new Error("BigInt arrays not supported.");
        }
        
        let outShape = chunk.shape;
        if (!outShape || outShape.length === 0) {
            outShape = chunkShape; // fallback if Zarrita doesn't collapse
        }
        
        return {
            data: chunk.data as Float32Array,
            shape: outShape as number[],
            stride: chunk.stride as number[],
        };
    }
}