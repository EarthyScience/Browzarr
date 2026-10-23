import { registry } from "zarrita";

/**
 * Minimal dtype to TypedArray constructor map.
 * GRIB decodes to float; dynamical stores use float64/float32 (the coordinate helper path may hit either).
 */
const CTORS: Record<string, new (length: number) => any> = {
  float64: Float64Array,
  float32: Float32Array,
  int64: BigInt64Array,
  int32: Int32Array,
  int16: Int16Array,
  int8: Int8Array,
  uint64: BigUint64Array,
  uint32: Uint32Array,
  uint16: Uint16Array,
  uint8: Uint8Array,
};

/**
 * Calculates C-order (row-major) strides for a chunk shape.
 */
function cStrides(shape: readonly number[]): number[] {
  const stride = new Array<number>(shape.length);
  let acc = 1;
  for (let i = shape.length - 1; i >= 0; i--) {
    stride[i] = acc;
    acc *= shape[i]!;
  }
  return stride;
}

type GribberishConfig = {
  var?: string | null;
  adjust_longitude_range?: boolean;
  north_up?: boolean;
};

type ChunkMeta = { dataType: string; shape: number[] };

/**
 * A Zarrita `array_to_bytes` codec that decodes GRIB2 message bytes into a
 * typed array, backed by the `@mattnucc/gribberish` bindings (native in Node,
 * WASM in the browser).
 *
 * This mirrors gribberish's own Python numcodecs `GribberishCodec`
 * (python/gribberish/zarr/codec.py): each stored chunk is one GRIB2 message;
 * data variables decode via `dataAdjusted(adjust_longitude_range, north_up)`,
 * and the synthetic `latitude`/`longitude` variables come from `latlngAdjusted`.
 *
 * @see {@link https://github.com/mpiannucci/gribberish/blob/main/python/gribberish/zarr/codec.py | Reference Python Implementation}
 */
export class GribberishCodec {
  kind = "array_to_bytes" as const;

  #var: string | null;
  #adjustLon: boolean;
  #northUp: boolean;
  #ctor: new (length: number) => any;
  #shape: number[];
  #stride: number[];

  constructor(config: GribberishConfig, meta: ChunkMeta) {
    this.#var = config?.var ?? null;
    this.#adjustLon = Boolean(config?.adjust_longitude_range);
    this.#northUp = Boolean(config?.north_up);
    const ctor = CTORS[meta.dataType];
    if (!ctor) {
      throw new Error(`gribberish codec: unsupported data type ${meta.dataType}`);
    }
    this.#ctor = ctor;
    this.#shape = meta.shape;
    this.#stride = cStrides(meta.shape);
  }

  /**
   * Instantiates the codec from config and metadata.
   */
  static fromConfig(config: GribberishConfig, meta: ChunkMeta): GribberishCodec {
    return new GribberishCodec(config, meta);
  }

  /**
   * Read-only codec, encoding is not supported.
   */
  encode(): never {
    throw new Error("gribberish codec is read-only (decode only)");
  }

  #copyToTypedArray(values: ArrayLike<number>): ArrayBufferView {
    const out = new this.#ctor(values.length);
    const isBig = out instanceof BigInt64Array || out instanceof BigUint64Array;
    if (isBig) {
      for (let i = 0; i < values.length; i++) {
        const val = values[i]!;
        out[i] = Number.isFinite(val) ? BigInt(Math.trunc(val)) : BigInt(0);
      }
    } else {
      out.set(values);
    }
    return out;
  }

  /**
   * Decodes GRIB2 binary bytes into the target layout array.
   */
  async decode(bytes: Uint8Array): Promise<{
    data: ArrayBufferView;
    shape: number[];
    stride: number[];
  }> {
    const { GribMessage } = await import("@mattnucc/gribberish");
    let out: ArrayBufferView;
    
    const isLatitude = this.#var === "latitude" || this.#var === "lat";
    const isLongitude = this.#var === "longitude" || this.#var === "lon";

    const msg = GribMessage.parseFromBuffer(bytes, 0);
    try {
      if (isLatitude || isLongitude) {
        const latlng = msg.latlngAdjusted(this.#adjustLon, this.#northUp);
        try {
          const values = isLatitude ? latlng.latitude : latlng.longitude;
          out = this.#copyToTypedArray(values);
        } finally {
          if (latlng && typeof (latlng as any).free === "function") {
            (latlng as any).free();
          }
        }
      } else {
        const values = msg.dataAdjusted(this.#adjustLon, this.#northUp);
        out = this.#copyToTypedArray(values);
      }
    } finally {
      if (msg && typeof (msg as any).free === "function") {
        (msg as any).free();
      }
    }

    return { data: out, shape: this.#shape, stride: this.#stride };
  }
}

// Register the codec globally in Zarrita
registry.set("gribberish", async () => GribberishCodec as any);
registry.set("numcodecs.gribberish", async () => GribberishCodec as any);
