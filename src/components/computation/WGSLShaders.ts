export type Precision = 'f16' | 'f32';

export const createShaders = (precision: Precision) => {

    const enableF16 = precision === 'f16' ? 'enable f16;' : '';

    // #region BOILERPLATES

    const ReductionBoilerPlate = /* WGSL */`
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
        @group(0) @binding(1) var<storage, read_write> outputData: array<${precision}>;
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
    `
    const ConvolutionBoilerPlate = /* WGSL */`
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
        @group(0) @binding(0) var<storage, read> inputData: array<${precision}>;
        @group(0) @binding(1) var<storage, read_write> outputData: array<${precision}>;
        @group(0) @binding(2) var<uniform> params: Params;
        
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

            let xy_start: i32 = select(-xy_radius, 0, kernelSize == 1u);
            let xy_end: i32 = select(xy_radius + 1, 1, kernelSize == 1u);
            let z_start: i32 = select(-z_radius, 0, kernelDepth == 1u);
            let z_end: i32 = select(z_radius + 1, 1, kernelDepth == 1u);
    `
    const ConvolutionBoilerPlate2D = /* WGSL */`
        ${enableF16}
        struct Params {
            xStride: u32,
            yStride: u32,
            xSize: u32,
            ySize: u32,
            kernelSize: u32,
            kernelDepth: u32
        };
        @group(0) @binding(0) var<storage, read> inputData: array<${precision}>;
        @group(0) @binding(1) var<storage, read_write> outputData: array<${precision}>;
        @group(0) @binding(2) var<uniform> params: Params;

        @compute @workgroup_size(16, 16, 1)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>,) {
            let xStride = params.xStride; 
            let yStride = params.yStride;
            let xSize = params.xSize;
            let ySize = params.ySize;
            let kernelSize = params.kernelSize;

            let outX = global_id.x; 
            let outY = global_id.y;

            if (outX >= xSize|| outY >= ySize) {
                return;
            }

            let globalIdx = outY * xSize + outX;
            let thisVal = inputData[globalIdx];
            let isNaN: bool = thisVal != thisVal;
            if (isNaN){
                outputData[globalIdx] = thisVal;
                return;
            }   

            let xy_radius: i32 = i32(kernelSize/2u);

    `
    // #endregion

    const allShaders = {
    // #region REDUCTION SHADERS
    MeanReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            var sum: f32 = 0.0;
            
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
                        continue;
                    }
                    sum += newVal;
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
                        continue;
                    }
                    sum += newVal;
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
                        continue;
                    }
                    sum += newVal;
                }
            }
            
            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(sum / f32(dimLength));
        }
    `,

    MinReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            var min: f32 = 1e12;
            
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let newMin = f32(inputData[inputIndex]);
                    if (newMin < min) {
                        min = newMin;
                    }
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let newMin = f32(inputData[inputIndex]);
                    if (newMin < min) {
                        min = newMin;
                    }
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newMin = f32(inputData[inputIndex]);
                    if (newMin < min) {
                        min = newMin;
                    }
                }
            }
            
            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(min);
        }
    `,

    MaxReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            
            var max: f32 = -1e12;
            
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let newMax = f32(inputData[inputIndex]);
                    if (newMax > max) {
                        max = newMax;
                    }
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let newMax = f32(inputData[inputIndex]);
                    if (newMax > max) {
                        max = newMax;
                    }
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newMax = f32(inputData[inputIndex]);
                    if (newMax > max) {
                        max = newMax;
                    }
                }
            }
            
            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(max);
        }
    `,

    StDevReduction: /* wgsl */`
        ${ReductionBoilerPlate}
            var sum: f32 = 0.0;
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
                        continue;
                    }
                    sum += newVal;
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
                        continue;
                    }
                    sum += newVal;
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
                        continue;
                    }
                    sum += newVal;
                }
            }
            
            let mean: f32 = sum / f32(dimLength);

            var squaredDiffSum: f32 = 0.0;

            // Iterate along the dimension again
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
                        continue;
                    }
                    let diff: f32 = mean - newVal;
                    squaredDiffSum += diff*diff;
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (x * xStride);
                    let newVal = f32(inputData[u32(inputIndex)]);
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
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
                    if (newVal != newVal){ //This only evaluates if newVal is NaN
                        continue;
                    }
                    let diff: f32 = mean - newVal;
                    squaredDiffSum += diff*diff;
                }
            }

            let stDev: f32 = sqrt(squaredDiffSum / f32(dimLength));
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


            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    sum += f32(inputData[inputIndex]);
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    sum += f32(inputData[inputIndex]);
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    sum += f32(inputData[inputIndex]);
                }
            }
            
            let meanX: f32 = sum / f32(dimLength);
            var numSum: f32 = 0;
            var denomSum: f32 = 0;

            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let xi: f32 = f32(inputData[inputIndex]);
                    numSum += (xi - meanX)*(f32(z) - meanY);
                    denomSum += (f32(z) - meanY)*(f32(z) - meanY);
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let xi: f32 = f32(inputData[inputIndex]);
                    numSum += (xi - meanX)*(f32(y) - meanY);
                    denomSum += (f32(y) - meanY)*(f32(y) - meanY);
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let xi: f32 = f32(inputData[inputIndex]);
                    numSum += (xi - meanX)*(f32(x) - meanY);
                    denomSum += (f32(x) - meanY)*(f32(x) - meanY);
                }
            }
            
            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(numSum/denomSum);
        }
    `,

    // #endregion


    // #region TWO VARIABLE REDUCTION SHADERS
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

            var ySum: f32 = 0;
            var xSum: f32 = 0.0;

            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { 
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    xSum += f32(firstData[inputIndex]);
                    ySum += f32(secondData[inputIndex]);
                }
            } else if (reduceDim == 1u) { 
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    xSum += f32(firstData[inputIndex]);
                    ySum += f32(secondData[inputIndex]);
                }
            } else { 
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    xSum += f32(firstData[inputIndex]);
                    ySum += f32(secondData[inputIndex]);
                }
            }
            
            let xMean: f32 = xSum / f32(dimLength);
            let yMean: f32 = ySum / f32(dimLength);
            var numSum: f32 = 0;
            var denomSum: f32 = 0;

            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
                    numSum += (xi - xMean)*(f32(yi) - yMean);
                    denomSum += (f32(yi) - yMean)*(f32(yi) - yMean);
                }
            } else if (reduceDim == 1u) { // Average along Y
                let cCoord = outX * xStride + outY * zStride;
                for (var y: u32 = 0u; y < dimLength; y++) {
                    let inputIndex = cCoord + (y * yStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
                    numSum += (xi - xMean)*(f32(yi) - yMean);
                    denomSum += (f32(yi) - yMean)*(f32(yi) - yMean);
                }
            } else { // Average along X
                let cCoord = outX * yStride + outY * zStride;
                for (var x: u32 = 0u; x < dimLength; x++) {
                    let inputIndex = cCoord + (x * xStride);
                    let xi: f32 = f32(firstData[inputIndex]);
                    let yi: f32 = f32(secondData[inputIndex]);
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

            // Single pass: calculate sums, means, and covariance
            for (var i: u32 = 0u; i < dimLength; i++) {
                let inputIndex = baseCoord + (i * iterStride);
                let xi: f32 = f32(firstData[inputIndex]);
                let yi: f32 = f32(secondData[inputIndex]);
                xSum += xi;
                ySum += yi;
            }

            let xMean: f32 = xSum / f32(dimLength);
            let yMean: f32 = ySum / f32(dimLength);

            // Second pass for covariance calculation
            for (var i: u32 = 0u; i < dimLength; i++) {
                let inputIndex = baseCoord + (i * iterStride);
                let xi: f32 = f32(firstData[inputIndex]);
                let yi: f32 = f32(secondData[inputIndex]);
                numSum += (xi - xMean) * (yi - yMean);
            }

            let outputIndex = outY * xSize + outX;
            outputData[outputIndex] = ${precision}(numSum / (f32(dimLength) - 1));
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

            var xSum: f32 = 0.0;
            var xxSum: f32 = 0.0;
            var ySum: f32 = 0.0;
            var yySum: f32 = 0.0;
            var xySum: f32 = 0.0;
            // Iterate along the dimension we're averaging
            if (reduceDim == 0u) { // Average along Z
                let cCoord = outX * xStride + outY * yStride;
                for (var z: u32 = 0u; z < dimLength; z++) {
                    let inputIndex = cCoord + (z * zStride);
                    let xI = f32(firstData[inputIndex]);
                    let yI = f32(secondData[inputIndex]);
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
                    xSum += xI;
                    xxSum += xI * xI;
                    ySum += yI;
                    yySum += yI * yI;
                    xySum += xI * yI;
                }
            }

            let N: f32 = f32(dimLength);
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
    // #endregion


    // #region CONVOLUTION SHADERS
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

                            sum += f32(inputData[u32(newIdx)]);
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
                            if (sampledVal < minVal){
                                minVal = sampledVal;
                            }
                        }
                    }
                }
            }
            
            outputData[globalIdx] = ${precision}(minVal);
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
                            if (sampledVal > maxVal){
                                maxVal = sampledVal;
                            }
                        }
                    }
                }
            }
            outputData[globalIdx] = ${precision}(maxVal);
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
                            if (newVal != newVal){ //This only evaluates if newVal is NaN
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
                            if (newVal != newVal){ //This only evaluates if newVal is NaN
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
    // #endregion

    // #region TWO VARIABLE CONVOLUTION SHADERS
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
                            xSum += xI;    
                            ySum += yI;
                            count ++;
                        }
                    }
                }
            }

            let N: f32 = f32(count);
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
                            numSum += (xI - meanX) * (yI - meanY);
                            count ++;
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
                            xSum += xI;    
                            ySum += yI;
                            count ++;
                        }
                    }
                }
            }


            let N: f32 = f32(count);
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
                            numSum += (xI - meanX)*(f32(yI) - meanY);
                            denomSum += (f32(yI) - meanY)*(f32(yI) - meanY);
                        }
                    }
                }
            }
            outputData[globalIdx] = ${precision}(numSum/denomSum);
        }
    `,
    // #endregion

    // #region 2D CONVOLUTION SHADERS
    MeanConvolution2D: /* wgsl */`
            ${ConvolutionBoilerPlate2D}    
            var sum: f32 = 0;
            var count: u32 = 0u;
            for (var kx: i32 = -xy_radius; kx <= xy_radius; kx++) {
                for (var ky: i32 = -xy_radius; ky <= xy_radius; ky++) {
                    let in_coord = vec2<i32>(i32(global_id.x), i32(global_id.y)) + vec2<i32>(kx, ky);
                    if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                        in_coord.y >= 0 && in_coord.y < i32(ySize)) { //Ensure the sampled point is within 3D dataspace
                        let xOffset = kx * i32(xStride);
                        let yOffset = ky * i32(yStride);
                        let newIdx = i32(globalIdx) + xOffset + yOffset;
                        let newVal = f32(inputData[u32(newIdx)]);
                        if (newVal != newVal){ //This only evaluates if newVal is NaN
                            continue;
                        }
                        sum += newVal;
                        count ++;
                    }
                }
            }
            outputData[globalIdx] = ${precision}(sum / f32(count));
        }
    `,

    MinConvolution2D: /* wgsl */`
        ${ConvolutionBoilerPlate2D}   
            var minVal: f32 = 1e12;
            for (var kx: i32 = -xy_radius; kx <= xy_radius; kx++) {
                for (var ky: i32 = -xy_radius; ky <= xy_radius; ky++) {
                    let in_coord = vec2<i32>(i32(global_id.x), i32(global_id.y)) + vec2<i32>(kx, ky);
                    if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                        in_coord.y >= 0 && in_coord.y < i32(ySize)) { //Ensure the sampled point is within 3D dataspace
                        let xOffset = kx * i32(xStride);
                        let yOffset = ky * i32(yStride);
                        let newIdx = i32(globalIdx) + xOffset + yOffset;
                        let newVal = f32(inputData[u32(newIdx)]);
                        if (newVal != newVal){ //This only evaluates if newVal is NaN
                            continue;
                        }
                        if (newVal < minVal){
                            minVal = newVal;
                        }
                    }
                }
            }
            outputData[globalIdx] = ${precision}(minVal);
        }
    `,

    MaxConvolution2D: /* wgsl */`
        ${ConvolutionBoilerPlate2D}  
            var maxVal: f32 = -1e12;
            for (var kx: i32 = -xy_radius; kx <= xy_radius; kx++) {
                for (var ky: i32 = -xy_radius; ky <= xy_radius; ky++) {
                    let in_coord = vec2<i32>(i32(global_id.x), i32(global_id.y)) + vec2<i32>(kx, ky);
                    if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                        in_coord.y >= 0 && in_coord.y < i32(ySize)) { //Ensure the sampled point is within 3D dataspace
                        let xOffset = kx * i32(xStride);
                        let yOffset = ky * i32(yStride);
                        let newIdx = i32(globalIdx) + xOffset + yOffset;
                        let newVal = f32(inputData[u32(newIdx)]);
                        if (newVal != newVal){ //This only evaluates if newVal is NaN
                            continue;
                        }
                        if (newVal > maxVal){
                            maxVal = newVal;
                        }
                    }
                }
            }
            outputData[globalIdx] = ${precision}(maxVal);
        }
    `,

    StDevConvolution2D: /* wgsl */`
        ${ConvolutionBoilerPlate2D}  
            var sum: f32 = 0.;
            var count: u32 = 0u;
            for (var kx: i32 = -xy_radius; kx <= xy_radius; kx++) {
                for (var ky: i32 = -xy_radius; ky <= xy_radius; ky++) {
                    let in_coord = vec2<i32>(i32(global_id.x), i32(global_id.y)) + vec2<i32>(kx, ky);
                    if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                        in_coord.y >= 0 && in_coord.y < i32(ySize)) { //Ensure the sampled point is within 3D dataspace
                        let xOffset = kx * i32(xStride);
                        let yOffset = ky * i32(yStride);
                        let newIdx = i32(globalIdx) + xOffset + yOffset;
                        let newVal = f32(inputData[u32(newIdx)]);
                        if (newVal != newVal){ //This only evaluates if newVal is NaN
                            continue;
                        }
                        sum += newVal;
                        count ++;
                    }
                }
            }
            
            let mean: f32 = sum / f32(count);

            var squaredDiffSum: f32 = 0.0;

            for (var kx: i32 = -xy_radius; kx <= xy_radius; kx++) {
                for (var ky: i32 = -xy_radius; ky <= xy_radius; ky++) {
                    let in_coord = vec2<i32>(i32(global_id.x), i32(global_id.y)) + vec2<i32>(kx, ky);
                    if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                        in_coord.y >= 0 && in_coord.y < i32(ySize)) { //Ensure the sampled point is within 3D dataspace
                        let xOffset = kx * i32(xStride);
                        let yOffset = ky * i32(yStride);
                        let newIdx = i32(globalIdx) + xOffset + yOffset;
                        let newVal = f32(inputData[u32(newIdx)]);
                        if (newVal != newVal){ //This only evaluates if newVal is NaN
                            continue;
                        }
                        let diff: f32 = mean - newVal;
                        squaredDiffSum += diff*diff;
                    }
                }
            }
            let stDev: f32 = sqrt(squaredDiffSum / f32(count));

            outputData[globalIdx] = ${precision}(stDev);
        }
    `,
    // #endregion


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

        @compute @workgroup_size(4, 4, 4)
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
                    accum += f32(inputData[idx]);
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
                    accum += f32(inputData[idx]);
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
                    accum += f32(inputData[idx]);
                }
            }
                outputData[baseIdx] = accum;
        }
    `
    }
    return allShaders;
}
