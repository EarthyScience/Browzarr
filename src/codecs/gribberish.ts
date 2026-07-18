import { registry } from "zarrita";

// Minimal dtype -> TypedArray constructor map. GRIB decodes to float; dynamical
// stores use float64/float32 (the coordinate helper path may hit either).
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

// C-order (row-major) strides for a chunk shape.
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

  static fromConfig(config: GribberishConfig, meta: ChunkMeta): GribberishCodec {
    return new GribberishCodec(config, meta);
  }

  encode(): never {
    throw new Error("gribberish codec is read-only (decode only)");
  }

  async decode(bytes: Uint8Array): Promise<{
    data: ArrayBufferView;
    shape: number[];
    stride: number[];
  }> {
    const { GribMessage } = await import("@mattnucc/gribberish");
    let values: ArrayLike<number>;
    
    const isLatitude = this.#var === "latitude" || this.#var === "lat";
    const isLongitude = this.#var === "longitude" || this.#var === "lon";

    if (isLatitude || isLongitude) {
      const msg = GribMessage.parseFromBuffer(bytes, 0);
      const latlng = msg.latlngAdjusted(this.#adjustLon, this.#northUp);
      values = isLatitude ? latlng.latitude : latlng.longitude;
    } else {
      const msg = GribMessage.parseFromBuffer(bytes, 0);
      values = msg.dataAdjusted(this.#adjustLon, this.#northUp);
    }

    // Copy into the array's native dtype. gribberish returns JS numbers, so
    // integer dtypes go through the BigInt/Number constructors as needed.
    const out = new this.#ctor(values.length);
    const isBig = out instanceof BigInt64Array || out instanceof BigUint64Array;
    if (isBig) {
      for (let i = 0; i < values.length; i++) {
        out[i] = BigInt(Math.trunc(values[i]!));
      }
    } else {
      out.set(values);
    }

    return { data: out, shape: this.#shape, stride: this.#stride };
  }
}

// Register the codec globally in Zarrita
registry.set("gribberish", async () => GribberishCodec as any);
registry.set("numcodecs.gribberish", async () => GribberishCodec as any);
