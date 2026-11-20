export type Precision = 'f16' | 'f32';


export const createShaderContext = (precision: Precision, wgs: {wgx: number, wgy:number, wgz:number}) => {
    /// Install WGSL Literal extension in VS code for syntax highlighting

    const enableF16 = precision === 'f16' ? 'enable f16;' : '';
    const {wgx, wgy, wgz} = wgs;
    const isNaNFunc = /* WGSL */`
            fn isNaN(val: f32) -> bool {
                let bits = bitcast<u32>(val);
                // If the exponent is all 1s (0x7f800000), it's either NaN or Infinity
                return (bits & 0x7f800000u) == 0x7f800000u;
            }
        `

    // #region BOILERPLATES
    //They are untabbed for formatting reasons in the editor
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

    ${isNaNFunc}

    @compute @workgroup_size(${wgx}, ${wgy}, ${wgz})
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

        let globalIdx = outX * xStride + outY * yStride + outZ * zStride;
        let xy_radius: i32 = i32(kernelSize/2u);
        let z_radius: i32 = i32(kernelDepth/2u);

        let xy_start: i32 = select(-xy_radius, 0, kernelSize == 1u);
        let xy_end: i32 = select(xy_radius + 1, 1, kernelSize == 1u);
        let z_start: i32 = select(-z_radius, 0, kernelDepth == 1u);
        let z_end: i32 = select(z_radius + 1, 1, kernelDepth == 1u);
    `
    // #endregion
    return { precision, enableF16, wgx, wgy, wgz, isNaNFunc, ReductionBoilerPlate, ConvolutionBoilerPlate };
}

export type ShaderContext = ReturnType<typeof createShaderContext>;
