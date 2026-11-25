import type { ShaderContext } from './common';

export const twoVarReductionShaders = ({ precision, enableF16, isNaNFunc }: ShaderContext) => ({
    TwoVarLinearSlopeReduction: /* wgsl */`
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
        @group(0) @binding(0) var<storage, read> firstData: array<${precision}>;
        @group(0) @binding(1) var<storage, read> secondData: array<${precision}>;
        @group(0) @binding(2) var<storage, read_write> outputData: array<${precision}>;
        @group(0) @binding(3) var<uniform> params: Params;

        ${isNaNFunc}
        @compute @workgroup_size(16, 16, 1)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let zStride = params.zStride;
            let yStride = params.yStride;
            let xStride = params.xStride;
            let xSize = params.xSize;
            let ySize = params.ySize;
            let reduceDim = params.reduceDim;
            let dimLength = params.dimLength;
                            
            let outX = global_id.x;
            let outY = global_id.y;
            
            if (outX >= xSize || outY >= ySize) {
                return;
            }

            var ySum: f32 = 0;
            var xSum: f32 = 0.0;

            var nanCount: u32 = 0;

            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { 
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
                    if (isNaN(xi) || isNaN(yi)){ 
                        nanCount++;
                        continue;
                    }
                    xSum += f32(firstData[inputIndex]);
                    ySum += f32(secondData[inputIndex]);
                }
            } else if (reduceDim == 1u) { 
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
                    if (isNaN(xi) || isNaN(yi)){ 
                        nanCount++;
                        continue;
                    }
                    xSum += f32(firstData[inputIndex]);
                    ySum += f32(secondData[inputIndex]);
                }
            } else { 
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
                    if (isNaN(xi) || isNaN(yi)){ 
                        nanCount++;
                        continue;
                    }
                    xSum += f32(firstData[inputIndex]);
                    ySum += f32(secondData[inputIndex]);
                }
            }
            
            let N: f32 = f32(dimLength - nanCount);
            if (N <= 1.0) {
                let zero = 0.0;
                let outputIndex = outY * xSize + outX;
                outputData[outputIndex] = ${precision}(zero / zero);
                return;
            }

            let xMean: f32 = xSum / N;
            let yMean: f32 = ySum / N;
            var numSum: f32 = 0;
            var denomSum: f32 = 0;


            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
                    if (isNaN(xi) || isNaN(yi)){ 
                        continue;
                    }
                    numSum += (xi - xMean)*(f32(yi) - yMean);
                    denomSum += (f32(yi) - yMean)*(f32(yi) - yMean);
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
                    if (isNaN(xi) || isNaN(yi)){ 
                        continue;
                    }
                    numSum += (xi - xMean)*(f32(yi) - yMean);
                    denomSum += (f32(yi) - yMean)*(f32(yi) - yMean);
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
                    if (isNaN(xi) || isNaN(yi)){ 
                        continue;
                    }
                    numSum += (xi - xMean)*(f32(yi) - yMean);
                    denomSum += (f32(yi) - yMean)*(f32(yi) - yMean);
                }
            }
            
            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(numSum/(denomSum+1e-4));
        }
    `,

    CovarianceReduction: /* wgsl */`
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
        @group(0) @binding(0) var<storage, read> firstData: array<${precision}>;
        @group(0) @binding(1) var<storage, read> secondData: array<${precision}>;
        @group(0) @binding(2) var<storage, read_write> outputData: array<${precision}>;
        @group(0) @binding(3) var<uniform> params: Params;

        ${isNaNFunc}
        @compute @workgroup_size(16, 16, 1)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let zStride = params.zStride;
            let yStride = params.yStride;
            let xStride = params.xStride;
            let xSize = params.xSize;
            let ySize = params.ySize;
            let reduceDim = params.reduceDim;
            let dimLength = params.dimLength;
                            
            let outX = global_id.x;
            let outY = global_id.y;
            
            if (outX >= xSize || outY >= ySize) {
                return;
            }
            var ySum: f32 = 0;
            var xSum: f32 = 0.0;
            var numSum: f32 = 0;

        // Calculate base coordinate and stride for the dimension we're iterating over
            var baseCoord: u32;
            var iterStride: u32;

            if (reduceDim == 0u) {
                baseCoord = outX * xStride + outY * yStride;
                iterStride = zStride;
            } else if (reduceDim == 1u) {
                baseCoord = outX * xStride + outY * zStride;
                iterStride = yStride;
            } else {
                baseCoord = outX * yStride + outY * zStride;
                iterStride = xStride;
            }

            var nanCount: u32 = 0;

            // Single pass: calculate sums, means, and covariance
            for (var i: u32 = 0u; i < dimLength; i++) {
                let inputIndex = baseCoord + (i * iterStride);
                let xi: f32 = f32(firstData[inputIndex]);
                let yi: f32 = f32(secondData[inputIndex]);
                if (isNaN(xi) || isNaN(yi)){ 
                    nanCount++;
                    continue;
                }
                xSum += xi;
                ySum += yi;
            }

            var N: f32 = f32(dimLength - nanCount);
            if (N <= 1.0) {
                let zero = 0.0;
                let outputIndex = outY * xSize + outX;
                outputData[outputIndex] = ${precision}(zero / zero);
                return;
            }

            let xMean: f32 = xSum / N;
            let yMean: f32 = ySum / N;

            // Second pass for covariance calculation
            for (var i: u32 = 0u; i < dimLength; i++) {
                let inputIndex = baseCoord + (i * iterStride);
                let xi: f32 = f32(firstData[inputIndex]);
                let yi: f32 = f32(secondData[inputIndex]);
                if (isNaN(xi) || isNaN(yi)){ 
                    continue;
                }
                numSum += (xi - xMean) * (yi - yMean);
            }

            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(numSum / (N - 1));
        }
    `,

    CorrelationReduction: /* wgsl */`
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
        @group(0) @binding(0) var<storage, read> firstData: array<${precision}>;
        @group(0) @binding(1) var<storage, read> secondData: array<${precision}>;
        @group(0) @binding(2) var<storage, read_write> outputData: array<${precision}>;
        @group(0) @binding(3) var<uniform> params: Params;

        ${isNaNFunc}

        @compute @workgroup_size(16, 16, 1)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let zStride = params.zStride;
            let yStride = params.yStride;
            let xStride = params.xStride;
            let xSize = params.xSize;
            let ySize = params.ySize;
            let reduceDim = params.reduceDim;
            let dimLength = params.dimLength;
                            
            let outX = global_id.x;
            let outY = global_id.y;
            
            if (outX >= xSize || outY >= ySize) {
                return;
            }

            var xSum: f32 = 0.0;
            var xxSum: f32 = 0.0;
            var ySum: f32 = 0.0;
            var yySum: f32 = 0.0;
            var xySum: f32 = 0.0;

            var nanCount: u32 = 0;
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let xI = f32(firstData[inputIndex]);
                    let yI = f32(secondData[inputIndex]);
                    if (isNaN(xI) || isNaN(yI)){ 
                        nanCount++;
                        continue;
                    }
                    xSum += xI;
                    xxSum += xI * xI;
                    ySum += yI;
                    yySum += yI * yI;
                    xySum += xI * yI;
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let xI = f32(firstData[inputIndex]);
                    let yI = f32(secondData[inputIndex]);
                    if (isNaN(xI) || isNaN(yI)){ 
                        nanCount++;
                        continue;
                    }
                    xSum += xI;
                    xxSum += xI * xI;
                    ySum += yI;
                    yySum += yI * yI;
                    xySum += xI * yI;
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let xI = f32(firstData[inputIndex]);
                    let yI = f32(secondData[inputIndex]);
                    if (isNaN(xI) || isNaN(yI)){ 
                        nanCount++;
                        continue;
                    }
                    xSum += xI;
                    xxSum += xI * xI;
                    ySum += yI;
                    yySum += yI * yI;
                    xySum += xI * yI;
                }
            }

            let N: f32 = f32(dimLength - nanCount);
            if (N <= 1.0) {
                let zero = 0.0;
                let outputIndex = outY * xSize + outX;
                outputData[outputIndex] = ${precision}(zero / zero);
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

            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(correlation);
        }
    `,
});
