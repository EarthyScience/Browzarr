import type { ShaderContext } from './common';

export const cumsumShaders = ({ precision, enableF16, isNaNFunc, wgx, wgy, wgz }: ShaderContext) => ({
    CUMSUM3D: /* wgsl */`
        ${enableF16}
        struct Params {
            xStride: u32,
            yStride: u32,
            zStride: u32,
            xSize: u32,
            ySize: u32,
            zSize: u32,
            reduceDim: u32,
            reverse: u32,
            workGroups: vec3<u32>,
        };
        @group(0) @binding(0) var<storage, read> inputData: array<${precision}>;
        @group(0) @binding(1) var<storage, read_write> outputData: array<f32>;
        @group(0) @binding(2) var<uniform> params: Params;
        ${isNaNFunc}
        @compute @workgroup_size(${wgx}, ${wgy}, ${wgz})
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let zStride = params.zStride;
            let yStride = params.yStride;
            let xStride = params.xStride; 
            let xSize = params.xSize;
            let ySize = params.ySize;
            let zSize = params.zSize; 
            let reverse = params.reverse;
            let workGroups = params.workGroups;
            let reduceDim = params.reduceDim;

            let outX = global_id.x; 
            let outY = global_id.y;
            let outZ = global_id.z; 

            if (outX >= xSize || outY >= ySize || outZ >= zSize) {
                return;
            }
            let totalSize: u32 = xSize * ySize * zSize;
            var baseIdx = outZ * zStride + outY * yStride + outX * xStride;
            var accum: f32 = 0;
            var validCount: u32 = 0u;

            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // CUMSUM along Z
                if (reverse == u32(1)){
                    baseIdx = (zSize - outZ - 1) * zStride + outY * yStride + outX * xStride;
                }
                for (var z: u32 = 0u; z < outZ; z++) {
                    var newZ: u32 = z;
                    if (reverse == u32(1)){
                        newZ = zSize - z - 1;
                    }
                    let idx = newZ * zStride + outY * yStride + outX * xStride;
                    let val = f32(inputData[idx]);
                    if (isNaN(val)) { continue; }
                    accum += val;
                    validCount++;
                }

            } else if (reduceDim == 1u) { // CUMSUM along Y
                if (reverse == u32(1)){
                    baseIdx = outZ * zStride + (ySize - outY - 1)* yStride + outX * xStride;
                }
                for (var y: u32 = 0u; y < outY; y++) {
                    var newY: u32 = y;
                    if (reverse == u32(1)){
                        newY = ySize - y - 1;
                    }
                    let idx = outZ * zStride + newY * yStride + outX * xStride;
                    let val = f32(inputData[idx]);
                    if (isNaN(val)) { continue; }
                    accum += val;
                    validCount++;
                }
            } else { // CUMSUM along X
                if (reverse == u32(1)){
                    baseIdx = outZ * zStride + outY* yStride + (xSize - outX - 1) * xStride;
                }
                for (var x: u32 = 0u; x < outX; x++) {
                    var newX: u32 = x;
                    if (reverse == u32(1)){
                        newX = xSize - x - 1;
                    }
                    let idx = outZ * zStride + outY * yStride + newX * xStride;
                    let val = f32(inputData[idx]);
                    if (isNaN(val)) { continue; }
                    accum += val;
                    validCount++;
                }
            }
            let current_val = f32(inputData[baseIdx]);
            if (validCount == 0u && isNaN(current_val)) {
                let zero = 0.0;
                outputData[baseIdx] = f32(zero / zero);
            } else {
                outputData[baseIdx] = f32(accum);
            }
        }
    `
});
