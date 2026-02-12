const reduction = /* wgsl */`
enable f16;
struct Params {
    zStride: u32,
    yStride: u32,
    xStride: u32,
    xSize: u32,
    ySize: u32,
    reduceDim: u32,
    dimLength: u32,
};
@group(0) @binding(0) var<storage, read> inputData: array<f16>;
@group(0) @binding(1) var<storage, read_write> outputData: array<f16>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(16, 16, 1) // Don't touch this as workgroups are predefined
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

    //Start code here

    if (reduceDim == 0u) { // Compute along Z
        let cCoord = outX * xStride + outY * yStride;
        for (var z: u32 = 0u; z < dimLength; z++) {
            let inputIndex = cCoord + (z * zStride);
            // Write function here
        }
    } else if (reduceDim == 1u) { // Compute along Y
        let cCoord = outX * xStride + outY * zStride;
        for (var y: u32 = 0u; y < dimLength; y++) {
            let inputIndex = cCoord + (y * yStride);
            // Write function here
        }
    } else { // Compute along X
        let cCoord = outX * yStride + outY * zStride;
        for (var x: u32 = 0u; x < dimLength; x++) {
            let inputIndex = cCoord + (x * xStride);
            // Write function here
        }
    }
            
    //Continue Here

    let outputIndex = outY * xSize + outX;

    // Cast final value to f16 and write to output
    let calculatedValue = 0.0; 
    outputData[outputIndex] = f16(calculatedValue); 
}
`

const convolution3D = /* wgsl */`
enable f16;
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
@group(0) @binding(0) var<storage, read> inputData: array<f16>;
@group(0) @binding(1) var<storage, read_write> outputData: array<f16>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(4, 4, 4) // Don't touch this as workgroups are predefined
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
    
    //WRITE YOUR CODE HERE

    for (var kx: i32 = xy_start; kx < xy_end; kx++) {
        for (var ky: i32 = xy_start; ky < xy_end; ky++) {
            for (var kz: i32 = z_start; kz < z_end; kz++){
                let in_coord = vec3<i32>(global_id) + vec3<i32>(kx, ky, kz);
                if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                    in_coord.y >= 0 && in_coord.y < i32(ySize) &&
                    in_coord.z >= 0 && in_coord.z < i32(zSize)) { //Ensure the sampled point is within dataspace
                    let xOffset = kx * i32(xStride);
                    let yOffset = ky * i32(yStride);
                    let zOffset = kz * i32(zStride);
                    let newIdx = i32(globalIdx) + xOffset + yOffset + zOffset;

                    //Write your Kernel Code here
                }
            }
        }
    }
    //Continue Here

    let outputIndex = outY * xSize + outX;

    // Cast final value to f16 and write to output
    let calculatedValue = 0.0; 
    outputData[outputIndex] = f16(calculatedValue); 
}
`

const convolution2D = /* wgsl */`
enable f16;
struct Params {
    xStride: u32,
    yStride: u32,
    xSize: u32,
    ySize: u32,
    kernelSize: u32,
};
@group(0) @binding(0) var<storage, read> inputData: array<f16>;
@group(0) @binding(1) var<storage, read_write> outputData: array<f16>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(16, 16, 1) // Don't touch this as workgroups are predefined
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
    
    //WRITE YOUR CODE HERE

     for (var kx: i32 = -xy_radius; kx <= xy_radius; kx++) {
        for (var ky: i32 = -xy_radius; ky <= xy_radius; ky++) {
            let in_coord = vec2<i32>(i32(global_id.x), i32(global_id.y)) + vec2<i32>(kx, ky);
            if (in_coord.x >= 0 && in_coord.x < i32(xSize) &&
                in_coord.y >= 0 && in_coord.y < i32(ySize)) { //Ensure the sampled point is within dataspace
                let xOffset = kx * i32(xStride);
                let yOffset = ky * i32(yStride);
                let newIdx = i32(globalIdx) + xOffset + yOffset;
                
                //Write your Kernel Code here
            }
        }
    }
    //Continue Here

    let outputIndex = outY * xSize + outX;

    // Cast final value to f16 and write to output
    let calculatedValue = 0.0; 
    outputData[outputIndex] = f16(calculatedValue); 
}
`

export const templates = {
    "ReductionBoilerPlate": reduction,
    "ConvolutionBoilerPlate": convolution3D,
    "ConvolutionBoilerPlate2D": convolution2D
}