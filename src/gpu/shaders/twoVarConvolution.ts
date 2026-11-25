import type { ShaderContext } from './common';

export const twoVarConvolutionShaders = ({ precision, enableF16, isNaNFunc }: ShaderContext) => ({
    CorrelationConvolution: /* WGSL */`
        ${enableF16}
        struct Params {
            xStride: u32,
            yStride: u32,
            zStride: u32,
            xSize: u32,
            ySize: u32,
            zSize: u32,
            workGroups: vec3<u32>,
            kernelSize: u32,
            kernelDepth: u32
        };
        @group(0) @binding(0) var<storage, read> firstData: array<${precision}>;
        @group(0) @binding(1) var<storage, read> secondData: array<${precision}>;
        @group(0) @binding(2) var<storage, read_write> outputData: array<${precision}>;
        @group(0) @binding(3) var<uniform> params: Params;

        ${isNaNFunc}
        @compute @workgroup_size(4, 4, 4)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let zStride = params.zStride;
            let yStride = params.yStride;
            let xStride = params.xStride; 
            let xSize = params.xSize;
            let ySize = params.ySize;
            let zSize = params.zSize; 
            let workGroups = params.workGroups;
            let kernelSize = params.kernelSize;
            let kernelDepth = params.kernelDepth;

            let outX = global_id.x; 
            let outY = global_id.y;
            let outZ = global_id.z; 

            if (outX >= xSize || outY >= ySize || outZ >= zSize) {
                return;
            }

            let total_threads_per_slice = workGroups.x * workGroups.y * 16;
            let globalIdx = global_id.z * total_threads_per_slice + 
                            global_id.y * (workGroups.x * 4) + 
                            global_id.x;

            let xy_radius: i32 = i32(kernelSize/2u);
            let z_radius: i32 = i32(kernelDepth/2u);

            var xyOffset: i32 = 0; //These offsets are for kernelsizes of 1. I didn't wanna rewrite everything else for that case
            var zOffset: i32 = 0;
            if (xy_radius == 0){
                xyOffset = -1;
            }
            if (z_radius == 0){
                zOffset = -1;
            }

            var xSum: f32 = 0.0;
            var xxSum: f32 = 0.0;
            var ySum: f32 = 0.0;
            var yySum: f32 = 0.0;
            var xySum: f32 = 0.0;

            var count: u32 = 0u;
            for (var kx: i32 = -xy_radius + xyOffset; kx < xy_radius; kx++) {
                for (var ky: i32 = -xy_radius + xyOffset; ky < xy_radius; ky++) {
                    for (var kz: i32 = -z_radius + zOffset; kz < z_radius; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);
                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { //Ensure the sampled point is within 3D dataspace
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;

                            let xI = f32(firstData[newIdx]);
                            let yI = f32(secondData[newIdx]);
                            if (isNaN(xI) || isNaN(yI)) { continue; }
                            xSum += xI;
                            xxSum += xI * xI;
                            ySum += yI;
                            yySum += yI * yI;
                            xySum += xI * yI;
                            count ++;
                        }
                    }
                }
            }

            let N: f32 = f32(count);
            if (N <= 1.0) {
                let zero = 0.0;
                outputData[globalIdx] = ${precision}(zero / zero);
                return;
            }
            let meanX = xSum / N;
            let meanY = ySum / N;
            let varX = (xxSum / N) - (meanX * meanX);
            let varY = (yySum / N) - (meanY * meanY);
            let covXY = (xySum / N) - (meanX * meanY);
            let sigmaX = sqrt(max(0.0, varX));
            let sigmaY = sqrt(max(0.0, varY));
            let epsilon = 1e-6;
            let denominator = sigmaX * sigmaY + epsilon;
            let correlation = covXY / denominator;

            outputData[globalIdx] = ${precision}(correlation);
        }
    `,

    CovarianceConvolution: /* WGSL */`
        ${enableF16}
        struct Params {
            xStride: u32,
            yStride: u32,
            zStride: u32,
            xSize: u32,
            ySize: u32,
            zSize: u32,
            workGroups: vec3<u32>,
            kernelSize: u32,
            kernelDepth: u32
        };
        @group(0) @binding(0) var<storage, read> firstData: array<${precision}>;
        @group(0) @binding(1) var<storage, read> secondData: array<${precision}>;
        @group(0) @binding(2) var<storage, read_write> outputData: array<${precision}>;
        @group(0) @binding(3) var<uniform> params: Params;
        ${isNaNFunc}
        @compute @workgroup_size(4, 4, 4)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let zStride = params.zStride;
            let yStride = params.yStride;
            let xStride = params.xStride; 
            let xSize = params.xSize;
            let ySize = params.ySize;
            let zSize = params.zSize; 
            let workGroups = params.workGroups;
            let kernelSize = params.kernelSize;
            let kernelDepth = params.kernelDepth;

            let outX = global_id.x; 
            let outY = global_id.y;
            let outZ = global_id.z; 

            if (outX >= xSize || outY >= ySize || outZ >= zSize) {
                return;
            }

            let total_threads_per_slice = workGroups.x * workGroups.y * 16;
            let globalIdx = global_id.z * total_threads_per_slice + 
                            global_id.y * (workGroups.x * 4) + 
                            global_id.x;

            let xy_radius: i32 = i32(kernelSize/2u);
            let z_radius: i32 = i32(kernelDepth/2u);

            var xyOffset: i32 = 0; //These offsets are for kernelsizes of 1. I didn't wanna rewrite everything else for that case
            var zOffset: i32 = 0;
            if (xy_radius == 0){
                xyOffset = -1;
            }
            if (z_radius == 0){
                zOffset = -1;
            }

            var xSum: f32 = 0.0;
            var ySum: f32 = 0.0;
            var numSum: f32 = 0.0;

            var count: u32 = 0u;
            for (var kx: i32 = -xy_radius + xyOffset; kx < xy_radius; kx++) {
                for (var ky: i32 = -xy_radius + xyOffset; ky < xy_radius; ky++) {
                    for (var kz: i32 = -z_radius + zOffset; kz < z_radius; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);
                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { 
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;
                            let xI = f32(firstData[newIdx]);
                            let yI = f32(secondData[newIdx]);
                            if (isNaN(xI) || isNaN(yI)) { continue; }
                            xSum += xI;    
                            ySum += yI;
                            count ++;
                        }
                    }
                }
            }

            let N: f32 = f32(count);
            if (N <= 1.0) {
                let zero = 0.0;
                outputData[globalIdx] = ${precision}(zero / zero);
                return;
            }
            let meanX = xSum / N;
            let meanY = ySum / N;
            
            for (var kx: i32 = -xy_radius + xyOffset; kx < xy_radius; kx++) {
                for (var ky: i32 = -xy_radius + xyOffset; ky < xy_radius; ky++) {
                    for (var kz: i32 = -z_radius + zOffset; kz < z_radius; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);
                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { 
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;
                            let xI = f32(firstData[newIdx]);
                            let yI = f32(secondData[newIdx]);
                            if (isNaN(xI) || isNaN(yI)) { continue; }
                            numSum += (xI - meanX) * (yI - meanY);
                        }
                    }
                }
            }
            outputData[globalIdx] = ${precision}(numSum/(N-1));
        }
    `,

    TwoVarLinearSlopeConvolution: /* WGSL */`
        ${enableF16}
        struct Params {
            xStride: u32,
            yStride: u32,
            zStride: u32,
            xSize: u32,
            ySize: u32,
            zSize: u32,
            workGroups: vec3<u32>,
            kernelSize: u32,
            kernelDepth: u32
        };
        @group(0) @binding(0) var<storage, read> firstData: array<${precision}>;
        @group(0) @binding(1) var<storage, read> secondData: array<${precision}>;
        @group(0) @binding(2) var<storage, read_write> outputData: array<${precision}>;
        @group(0) @binding(3) var<uniform> params: Params;
        ${isNaNFunc}
        @compute @workgroup_size(4, 4, 4)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let zStride = params.zStride;
            let yStride = params.yStride;
            let xStride = params.xStride; 
            let xSize = params.xSize;
            let ySize = params.ySize;
            let zSize = params.zSize; 
            let workGroups = params.workGroups;
            let kernelSize = params.kernelSize;
            let kernelDepth = params.kernelDepth;

            let outX = global_id.x; 
            let outY = global_id.y;
            let outZ = global_id.z; 

            if (outX >= xSize || outY >= ySize || outZ >= zSize) {
                return;
            }

            let total_threads_per_slice = workGroups.x * workGroups.y * 16;
            let globalIdx = global_id.z * total_threads_per_slice + 
                            global_id.y * (workGroups.x * 4) + 
                            global_id.x;

            let xy_radius: i32 = i32(kernelSize/2u);
            let z_radius: i32 = i32(kernelDepth/2u);

            var xyOffset: i32 = 0; //These offsets are for kernelsizes of 1. I didn't wanna rewrite everything else for that case
            var zOffset: i32 = 0;
            if (xy_radius == 0){
                xyOffset = -1;
            }
            if (z_radius == 0){
                zOffset = -1;
            }

            var xSum: f32 = 0.0;
            var ySum: f32 = 0.0;

            var count: u32 = 0u;
            for (var kx: i32 = -xy_radius + xyOffset; kx < xy_radius; kx++) {
                for (var ky: i32 = -xy_radius + xyOffset; ky < xy_radius; ky++) {
                    for (var kz: i32 = -z_radius + zOffset; kz < z_radius; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);
                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { 
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;
                            let xI = f32(firstData[newIdx]);
                            let yI = f32(secondData[newIdx]);
                            if (isNaN(xI) || isNaN(yI)){ 
                                continue;
                            }
                            xSum += xI;    
                            ySum += yI;
                            count ++;
                        }
                    }
                }
            }


            let N: f32 = f32(count);
            if (N <= 1.0) {
                let zero = 0.0;
                outputData[globalIdx] = ${precision}(zero / zero);
                return;
            }
            let meanX = xSum / N;
            let meanY = ySum / N;
            var numSum: f32 = 0;
            var denomSum: f32 = 0;
            
            for (var kx: i32 = -xy_radius + xyOffset; kx < xy_radius; kx++) {
                for (var ky: i32 = -xy_radius + xyOffset; ky < xy_radius; ky++) {
                    for (var kz: i32 = -z_radius + zOffset; kz < z_radius; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);
                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { 
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;
                            let xI = f32(firstData[newIdx]);
                            let yI = f32(secondData[newIdx]);
                            if (isNaN(xI) || isNaN(yI)){ 
                                continue;
                            }
                            numSum += (xI - meanX)*(f32(yI) - meanY);
                            denomSum += (f32(yI) - meanY)*(f32(yI) - meanY);
                        }
                    }
                }
            }
            outputData[globalIdx] = ${precision}(numSum/denomSum);
        }
    `,
});
