import type { ShaderContext } from './common';

export const convolutionShaders = ({ precision, ConvolutionBoilerPlate }: ShaderContext) => ({
    MeanConvolution: /* wgsl */`
            ${ConvolutionBoilerPlate}    
            var sum: f32 = 0.0;
            var count: u32 = 0u;
            for (var kx: i32 = xy_start; kx < xy_end; kx++) {
                for (var ky: i32 = xy_start; ky < xy_end; ky++) {
                    for (var kz: i32 = z_start; kz < z_end; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);
                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { //Ensure the sampled point is within 3D dataspace
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;

                            let val = f32(inputData[u32(newIdx)]);
                            if (isNaN(val)) { continue; }
                            sum += val;
                            count ++;
                        }
                    }
                }
            }
            outputData[globalIdx] = ${precision}(sum / f32(count));
        }
    `,

    MinConvolution: /* wgsl */`
        ${ConvolutionBoilerPlate}  
            var minVal: f32 = 1e12;
            var count: u32 = 0u;
            for (var kx: i32 = xy_start; kx < xy_end; kx++) {
                for (var ky: i32 = xy_start; ky < xy_end; ky++) {
                    for (var kz: i32 = z_start; kz < z_end; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);

                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { //Ensure the sampled point is within 3D dataspace
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;
                            let sampledVal = f32(inputData[u32(newIdx)]);
                            if (isNaN(sampledVal)) { continue; }
                            if (sampledVal < minVal){
                                minVal = sampledVal;
                            }
                            count++;
                        }
                    }
                }
            }
            
            if (count > 0u) {
                outputData[globalIdx] = ${precision}(minVal);
            } else {
                let zero = 0.0;
                outputData[globalIdx] = ${precision}(zero / zero);
            }
        }
    `,

    MaxConvolution: /* wgsl */`
        ${ConvolutionBoilerPlate}  

            var maxVal: f32 = -1e12;
            var count: u32 = 0u;
            for (var kx: i32 = xy_start; kx < xy_end; kx++) {
                for (var ky: i32 = xy_start; ky < xy_end; ky++) {
                    for (var kz: i32 = z_start; kz < z_end; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);

                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { //Ensure the sampled point is within 3D dataspace
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;
                            let sampledVal = f32(inputData[u32(newIdx)]);
                            if (isNaN(sampledVal)) { continue; }
                            if (sampledVal > maxVal){
                                maxVal = sampledVal;
                            }
                            count++;
                        }
                    }
                }
            }
            if (count > 0u) {
                outputData[globalIdx] = ${precision}(maxVal);
            } else {
                let zero = 0.0;
                outputData[globalIdx] = ${precision}(zero / zero);
            }
        }
    `,

    StDevConvolution: /* wgsl */`
        ${ConvolutionBoilerPlate}  
            var sum: f32 = 0.0;
            var count: u32 = 0u;
            for (var kx: i32 = xy_start; kx < xy_end; kx++) {
                for (var ky: i32 = xy_start; ky < xy_end; ky++) {
                    for (var kz: i32 = z_start; kz < z_end; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);

                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { //Ensure the sampled point is within 3D dataspace
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;
                            let newVal = f32(inputData[u32(newIdx)]);
                            if (isNaN(newVal)){ 
                                continue;
                            }
                            sum += newVal;
                            count ++;
                        }
                    }
                }
            }
            
            let mean: f32 = sum / f32(count);

            var squaredDiffSum: f32 = 0.0;

            for (var kx: i32 = xy_start; kx < xy_end; kx++) {
                for (var ky: i32 = xy_start; ky < xy_end; ky++) {
                    for (var kz: i32 = z_start; kz < z_end; kz++){
                        let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);

                        if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                            in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                            in_coord.z >= 0 && in_coord.z < i32(zSize)) { //Ensure the sampled point is within 3D dataspace
                            let xOffset = kx * i32(xStride);
                            let yOffset = ky * i32(yStride);
                            let zOffset = kz * i32(zStride);
                            let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;
                            let newVal = f32(inputData[u32(newIdx)]);
                            if (isNaN(newVal)){ 
                                continue;
                            }
                            let diff: f32 = mean - newVal;
                            squaredDiffSum += diff*diff;
                        }
                    }
                }
            }

            let stDev: f32 = sqrt(squaredDiffSum / f32(count));

            outputData[globalIdx] = ${precision}(stDev);
        }
    `,
});
