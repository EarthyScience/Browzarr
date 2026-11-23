import type { ShaderContext } from './common';

export const reductionShaders = ({ precision, enableF16, ReductionBoilerPlate }: ShaderContext) => ({
    MeanReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            var sum: f32 = 0.0;
            var nanCount: u32 = 0u;
            
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){ 
                        nanCount++;
                        continue;
                    }
                    sum += newVal;
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){ 
                        nanCount++;
                        continue;
                    }
                    sum += newVal;
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){ 
                        nanCount++;
                        continue;
                    }
                    sum += newVal;
                }
            }
            
            let outputIndex = outY * xSize + outX;
            let N = f32(dimLength - nanCount);
            outputData[outputIndex] = ${precision}(sum / N);
        }
    `,

    MinReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            var min: f32 = 1e12;
            var nanCount: u32 = 0u;
            
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let newMin = f32(inputData[inputIndex]);
                    if (isNaN(newMin)) { nanCount++; continue; }
                    if (newMin < min) {
                        min = newMin;
                    }
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let newMin = f32(inputData[inputIndex]);
                    if (isNaN(newMin)) { nanCount++; continue; }
                    if (newMin < min) {
                        min = newMin;
                    }
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newMin = f32(inputData[inputIndex]);
                    if (isNaN(newMin)) { nanCount++; continue; }
                    if (newMin < min) {
                        min = newMin;
                    }
                }
            }
            
            let outputIndex = outY * xSize + outX;
            if (nanCount == dimLength) {
                let zero = 0.0;
                outputData[outputIndex] = ${precision}(zero / zero);
            } else {
                outputData[outputIndex] = ${precision}(min);
            }
        }
    `,

    MaxReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            
            var max: f32 = -1e12;
            var nanCount: u32 = 0u;
            
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let newMax = f32(inputData[inputIndex]);
                    if (isNaN(newMax)) { nanCount++; continue; }
                    if (newMax > max) {
                        max = newMax;
                    }
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let newMax = f32(inputData[inputIndex]);
                    if (isNaN(newMax)) { nanCount++; continue; }
                    if (newMax > max) {
                        max = newMax;
                    }
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newMax = f32(inputData[inputIndex]);
                    if (isNaN(newMax)) { nanCount++; continue; }
                    if (newMax > max) {
                        max = newMax;
                    }
                }
            }
            
            let outputIndex = outY * xSize + outX;
            if (nanCount == dimLength) {
                let zero = 0.0;
                outputData[outputIndex] = ${precision}(zero / zero);
            } else {
                outputData[outputIndex] = ${precision}(max);
            }
        }
    `,

    StDevReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            var sum: f32 = 0.0;
            var nanCount: u32 = 0u;
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){ 
                        nanCount++;
                        continue;
                    }
                    sum += newVal;
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){ 
                        nanCount++;
                        continue;
                    }
                    sum += newVal;
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){
                        nanCount++;
                        continue;
                    }
                    sum += newVal;
                }
            }
            
            let N: f32 = f32(dimLength - nanCount);
            let mean: f32 = sum / N;

            var squaredDiffSum: f32 = 0.0;

            // Iterate along the dimension again
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){ 
                        continue;
                    }
                    let diff: f32 = mean - newVal;
                    squaredDiffSum += diff*diff;
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){ 
                        continue;
                    }
                    let diff: f32 = mean - newVal;
                    squaredDiffSum += diff*diff;
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (isNaN(newVal)){ 
                        continue;
                    }
                    let diff: f32 = mean - newVal;
                    squaredDiffSum += diff*diff;
                }
            }

            let stDev: f32 = sqrt(squaredDiffSum / N);
            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(stDev);
        }
    `,

    CUMSUMReduction: /* wgsl */`
        ${enableF16}
        struct Params {
            zStride: u32,
            yStride: u32,
            xStride: u32,
            xSize: u32,
            ySize: u32,
            reduceDim: u32,
            dimLength: u32,
        };
        @group(0) @binding(0) var<storage, read> inputData: array<${precision}>;
        @group(0) @binding(1) var<storage, read_write> outputData: array<f32>;
        @group(0) @binding(2) var<uniform> params: Params;

        @compute @workgroup_size(16, 16, 1)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let zStride = params.zStride;
            let yStride = params.yStride;
            let xStride = params.xStride;
            let xSize = params.xSize;
            let ySize = params.ySize;
            let reduceDim = params.reduceDim;
            let dimLength = params.dimLength;
                            
            let outX = global_id.y;
            let outY = global_id.x;
            
            if (outX >= xSize || outY >= ySize) {
                return;
            }
            
            var accum: f32 = 0;
            
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    accum += f32(inputData[inputIndex]);
                    
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    accum += f32(inputData[inputIndex]);
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    accum += f32(inputData[inputIndex]);
                }
            }
            
            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = accum;
        }
    `,
    LinearSlopeReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            let meanY: f32 = f32(dimLength)/2;
            var sum: f32 = 0.0;
            var nanCount: u32 = 0u;

            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let val = f32(inputData[inputIndex]);
                    if (isNaN(val)) { nanCount++; continue; }
                    sum += val;
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let val = f32(inputData[inputIndex]);
                    if (isNaN(val)) { nanCount++; continue; }
                    sum += val;
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let val = f32(inputData[inputIndex]);
                    if (isNaN(val)) { nanCount++; continue; }
                    sum += val;
                }
            }
            
            let N: f32 = f32(dimLength - nanCount);
            if (N <= 1.0) {
                let zero = 0.0;
                let outputIndex = outY * xSize + outX;
                outputData[outputIndex] = ${precision}(zero / zero);
                return;
            }

            let meanX: f32 = sum / N;
            var numSum: f32 = 0;
            var denomSum: f32 = 0;

            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let xi: f32 = f32(inputData[inputIndex]);
                    if (isNaN(xi)) { continue; }
                    numSum += (xi - meanX)*(f32(z) - meanY);
                    denomSum += (f32(z) - meanY)*(f32(z) - meanY);
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let xi: f32 = f32(inputData[inputIndex]);
                    if (isNaN(xi)) { continue; }
                    numSum += (xi - meanX)*(f32(y) - meanY);
                    denomSum += (f32(y) - meanY)*(f32(y) - meanY);
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let xi: f32 = f32(inputData[inputIndex]);
                    if (isNaN(xi)) { continue; }
                    numSum += (xi - meanX)*(f32(x) - meanY);
                    denomSum += (f32(x) - meanY)*(f32(x) - meanY);
                }
            }
            
            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(numSum/denomSum);
        }
    `,
});
