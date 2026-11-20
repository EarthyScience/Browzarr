// Block min/max/NaN reduction over Uint8 (255 = NaN) or Uint16 (half-float bits) texture data.
// Input and output are bound as u32 since WGSL has no 8/16-bit storage types.
// Output per voxel: RG = [min, max]. R is NaN-coded if the whole block is NaN, G if any voxel is NaN.
export const coarsenMinMaxShader = /* WGSL */`
	struct Params {
		zStride: u32,
		yStride: u32,
		xStride: u32,
		dimZ: u32,
		dimY: u32,
		dimX: u32,
		outZ: u32,
		outY: u32,
		outX: u32,
		kz: u32,
		ky: u32,
		kx: u32,
		isU16: u32,
	};
	@group(0) @binding(0) var<storage, read> inputData: array<u32>;
	@group(0) @binding(1) var<storage, read_write> outputData: array<atomic<u32>>;
	@group(0) @binding(2) var<uniform> params: Params;

	fn readRaw(i: u32) -> u32 {
		if (params.isU16 == 1u) {
			return (inputData[i >> 1u] >> ((i & 1u) * 16u)) & 0xFFFFu;
		}
		return (inputData[i >> 2u] >> ((i & 3u) * 8u)) & 0xFFu;
	}

	fn rawIsNaN(b: u32) -> bool {
		if (params.isU16 == 1u) {
			return (b & 0x7C00u) == 0x7C00u && (b & 0x03FFu) != 0u;
		}
		return b == 255u;
	}

	fn rawToF32(b: u32) -> f32 {
		if (params.isU16 == 1u) {
			return unpack2x16float(b).x;
		}
		return f32(b);
	}

	@compute @workgroup_size(4, 4, 4)
	fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
		let ox = gid.x;
		let oy = gid.y;
		let oz = gid.z;
		if (ox >= params.outX || oy >= params.outY || oz >= params.outZ) {
			return;
		}

		// Include a 1-voxel halo around each block: with linear filtering, samples near a brick edge
		// blend in the neighbouring voxel, so the brick's range has to cover those values too
		let z0 = max(oz * params.kz, 1u) - 1u;
		let y0 = max(oy * params.ky, 1u) - 1u;
		let x0 = max(ox * params.kx, 1u) - 1u;
		let z1 = min((oz + 1u) * params.kz + 1u, params.dimZ);
		let y1 = min((oy + 1u) * params.ky + 1u, params.dimY);
		let x1 = min((ox + 1u) * params.kx + 1u, params.dimX);

		var minV: f32 = 3.0e38;
		var maxV: f32 = -3.0e38;
		var minB: u32 = 0u;
		var maxB: u32 = 0u;
		var nanCount: u32 = 0u;
		var total: u32 = 0u;

		for (var z = z0; z < z1; z++) {
			for (var y = y0; y < y1; y++) {
				for (var x = x0; x < x1; x++) {
					let b = readRaw(z * params.zStride + y * params.yStride + x * params.xStride);
					total++;
					if (rawIsNaN(b)) {
						nanCount++;
						continue;
					}
					let v = rawToF32(b);
					if (v < minV) { minV = v; minB = b; }
					if (v > maxV) { maxV = v; maxB = b; }
				}
			}
		}

		let allNaN = nanCount == total;
		let someNaN = nanCount > 0u;
		let outIdx = (oz * params.outY + oy) * params.outX + ox;

		// R = min (NaN only if all NaN), G = max (NaN if any NaN, so the max is lost for partial bricks)
		if (params.isU16 == 1u) {
			let nanH = 0x7E00u;
			let r = select(minB, nanH, allNaN);
			let g = select(maxB, nanH, someNaN);
			atomicOr(&outputData[outIdx], r | (g << 16u));
		} else {
			// Two voxels share a u32, so OR into the zero-initialized buffer to avoid races
			let r = select(minB, 255u, allNaN);
			let g = select(maxB, 255u, someNaN);
			atomicOr(&outputData[outIdx >> 1u], (r | (g << 8u)) << ((outIdx & 1u) * 16u));
		}
	}
`
