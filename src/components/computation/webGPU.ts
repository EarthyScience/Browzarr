import {
  makeShaderDataDefinitions,
  makeStructuredView,
} from 'webgpu-utils';

import { createShaders } from './WGSLShaders';
import { ArrayMinMax } from '@/utils/HelperFuncs';
import { RescaleArray } from '../zarr/utils';


const twoDim = {
    Mean: "MeanReduction",
    Min: "MinReduction",
    Max: "MaxReduction",
    StandardDeviation: "StDevReduction",
    LinearSlope: "LinearSlopeReduction",
}
const convolutionShaders = {
    ConvolutionMean:"MeanConvolution",
    ConvolutionMin:"MinConvolution",
    ConvolutionMax:"MaxConvolution",
    ConvolutionStandardDeviation:"StDevConvolution",
    ConvolutionCorrelation:"CorrelationConvolution",
    ConvolutionLinearSlope:"TwoVarLinearSlopeConvolution",
    ConvolutionCovariance:"CovarianceConvolution"
}

const multiVariate = {
    Correlation:"CorrelationReduction",
    LinearSlope:"TwoVarLinearSlopeReduction",
    Covariance:"CovarianceReduction"
}


const ShaderMap = {
    // Reductions
    Mean: "MeanReduction",
    Min: "MinReduction",
    Max: "MaxReduction",
    StDev: "StDevReduction",
    LinearSlope: "LinearSlopeReduction",
    // 3D Convolutions
    Mean3D: "MeanConvolution",
    Min3D: "MinConvolution",
    Max3D: "MaxConvolution",
    StDev3D: "StDevConvolution",
    // 2D Convolutions
    Mean2D: "MeanConvolution2D",
    Min2D: "MinConvolution2D",
    Max2D: "MaxConvolution2D",
    StDev2D: "StDevConvolution2D",
    // Multivariate
    Correlation2D: "CorrelationReduction",
    Correlation3D: "CorrelationConvolution",
    TwoVarLinearSlope2D: "TwoVarLinearSlopeReduction",
    TwoVarLinearSlope3D: "TwoVarLinearSlopeConvolution",
    Covariance2D: "CovarianceReduction",
    Covariance3D: "CovarianceConvolution",
    // Special
    CUMSUM3D: "CUMSUM3D"
};

const InitializeDevice = async () => {
    const adapter = await navigator.gpu?.requestAdapter();
    const maxSize = adapter?.limits.maxBufferSize;
    const maxStorage = adapter?.limits.maxStorageBufferBindingSize;
    const hasF16 = adapter ? adapter.features.has("shader-f16") : false
    const device = hasF16 ? await adapter?.requestDevice({requiredFeatures: ["shader-f16"], requiredLimits: {
        maxBufferSize: maxSize,
        maxStorageBufferBindingSize: maxStorage}}) : 
        await adapter?.requestDevice({requiredLimits: {
            maxBufferSize: maxSize,
            maxStorageBufferBindingSize: maxStorage 
    }});
    if (!device) {
        Error('need a browser that supports WebGPU');
        return {device, hasF16};
    } else{
        return {device, hasF16}
    }
}

export async function DataProcess(
    inputArray : ArrayBufferView, 
    secondArray: ArrayBufferView | undefined,
    dimInfo : {
        shape: number[], 
        strides: number[]
    }, 
    operation: string,
    kernelOp: string | undefined,
    kernel: {
        size: number, 
        depth: number
    },
    reduceDim: number | undefined,
    reverse: boolean | undefined
  ){
    // ---- FUNCTION START ----//
    const {device, hasF16} = await InitializeDevice();
    if (!device) { // Redundant check but needed to satisfy typescript that device is not undefined
        Error('need a browser that supports WebGPU');
        return;
    }
    // ---- Unload Parameters ---- //
    const {strides, shape} = dimInfo;
    const {size:kernelSize, depth:kernelDepth} = kernel;
    const xStride = strides.at(-1);
    const yStride = strides.at(-2) ?? 0;
    const zStride = strides.at(-3) ?? 0;
    const isMultiVar = Boolean(secondArray)
    const isCUMSUM = operation === 'CUMSUM3D';
    const noReduction = operation === 'Convolution' || isCUMSUM;
    const is3D = noReduction ? shape.length == 3 : false;
    const workerSize = is3D ? 4 : 16; // 16 for 2D outputs and 4 for 3D outputs
    const thisShape = shape.filter((e, idx) => idx != reduceDim || noReduction)
    const dimLength = reduceDim !== undefined ? shape[reduceDim] : undefined;
    const outputSize = thisShape.reduce((val, acc) => val * acc, 1)
    const workGroups = thisShape.map(e => Math.ceil(e/workerSize));
    const precision = hasF16 ? 'f16' : 'f32';
    const shaders = createShaders(precision, {wgx:workerSize, wgy:workerSize, wgz: is3D ? workerSize : 1});
    let shaderCatalog: Record<string, any>;
    if (operation == "Convolution"){
        operation =  operation + kernelOp?.replace(/\s+/g, "");
        shaderCatalog = convolutionShaders;
    } else if (isMultiVar) shaderCatalog = multiVariate;
    else if (operation == "CUMSUM3D") shaderCatalog = {CUMSUM3D: "CUMSUM3D"}
    else shaderCatalog = twoDim;
    operation = operation.replace(/\s+/g, "")
    const shaderKey = shaderCatalog[operation as keyof typeof shaderCatalog] as keyof typeof shaders;
    const shader = shaders[shaderKey];
    // ---- START PIPELINE ---- //
    const computeModule = device.createShaderModule({
        label: 'analysis compute module',
        //@ts-ignore will remove with refactor
        code:shader,
    });

    const pipeline = device.createComputePipeline({
        label: 'analysis compute pipeline',
        layout: 'auto',
        compute: {
            module: computeModule,
        },
    });

    const defs = makeShaderDataDefinitions(shader);
    const myUniformValues = makeStructuredView(defs.uniforms.params);
    myUniformValues.set({
        xStride,
        yStride,
        zStride,
        xSize: thisShape.at(-1), 
        ySize: thisShape.at(-2),
        zSize: is3D ? thisShape.at(0) : 1,
        workGroups: [workGroups.at(-1), workGroups.at(-2), is3D ? workGroups[0] : 1],
        kernelDepth: is3D ? kernelDepth : 1,
        kernelSize,
        reduceDim,
        dimLength,
        reverse: Number(reverse)
    });

    // ---- Create buffers ---- //
    const outputBytes = outputSize * (isCUMSUM ? 4 : (hasF16 ? 2 : 4)); // if cumsum we use f32 cause it can easily surpass safe f16 limits
    const inputBuffer = device.createBuffer({
        label: 'Input Buffer',
        size: inputArray.byteLength * (hasF16 ? 1 : 2), 
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    const secondInputBuffer = secondArray ? device.createBuffer({
        label: 'Second Input Buffer',
        size: secondArray.byteLength * (hasF16 ? 1 : 2),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }) : undefined;

    const outputBuffer = device.createBuffer({
        label: 'Output Buffer',
        size: outputBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const uniformBuffer = device.createBuffer({
        label: 'Uniform Buffer',
        size: myUniformValues.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const readBuffer = device.createBuffer({
        label:'Read Buffer',
        size: outputBytes,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // Write Buffers to GPU
    device.queue.writeBuffer(inputBuffer, 0, (hasF16 ? inputArray : new Float32Array(inputArray as Float16Array)) as GPUAllowSharedBufferSource);
        secondInputBuffer && 
        device.queue.writeBuffer(secondInputBuffer, 0, (hasF16 ? secondArray : new Float32Array(secondArray as Float16Array)) as GPUAllowSharedBufferSource);
    device.queue.writeBuffer(uniformBuffer, 0, myUniformValues.arrayBuffer as GPUAllowSharedBufferSource);
    const offset = secondInputBuffer ? 1 : 0;

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries:[ { binding: 0, resource: { buffer: inputBuffer } },
        ...(secondInputBuffer ? [{ binding: 1, resource: { buffer: secondInputBuffer } }] : []),
        { binding: 1 + offset, resource: { buffer: outputBuffer } },
        { binding: 2 + offset, resource: { buffer: uniformBuffer } }]
    });


    const encoder = device.createCommandEncoder({
        label: 'convolution encoder',
    });
    const pass = encoder.beginComputePass({
        label: 'convolution compute pass',
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(workGroups.at(-1) as number, workGroups.at(-2), is3D ? workGroups[0] : 1)
    pass.end();

    encoder.copyBufferToBuffer(
        outputBuffer, 0,
        readBuffer, 0,
        outputBytes
    );

    // Submit work to GPU
    device.queue.submit([encoder.finish()]);

    // Map staging buffer to read results
    await readBuffer.mapAsync(GPUMapMode.READ);
    const resultArrayBuffer = readBuffer.getMappedRange();
    let results;
    let scalingFactor = 0;
    if (isCUMSUM){
        const float32Arr = new Float32Array(resultArrayBuffer.slice())
        const [minVal, maxVal] = ArrayMinMax(float32Arr)
        const isComp = (val: number) => Math.abs(val) <= 65504;
        if (isComp(minVal) && isComp(maxVal)) results = new Float16Array(float32Arr);
        else {
            const thisMax = Math.max(Math.abs(minVal), Math.abs(minVal))
            const thisScaling = Math.ceil(Math.log10(thisMax / 65504));
            RescaleArray(float32Arr, thisScaling)
            results = new Float16Array(float32Arr);
            scalingFactor = thisScaling;
        }
    } else results = hasF16 ? new Float16Array(resultArrayBuffer.slice()) : new Float16Array(new Float32Array(resultArrayBuffer.slice()));

    // Clean up
    readBuffer.unmap();
    return {array:results, shape:thisShape, scalingFactor};
}

export async function Convolve(inputArray :  ArrayBufferView, dimInfo : {shape: number[], strides: number[]}, kernel: {kernelSize: number, kernelDepth: number}){
    const {kernelSize:size, kernelDepth:depth} = kernel;
    const output = await DataProcess(inputArray, undefined, dimInfo, "Convolution", "Mean", {size, depth}, undefined, undefined)
    return output?.array;
}


export async function CustomShader(inputArray :  ArrayBufferView, dimInfo : {dataShape: number[], outputShape: number[], strides: number[]}, kernel: {kernelSize: number, kernelDepth: number}, reduceDim: number, shaderCode: string){
    const {device, hasF16} = await InitializeDevice();
    if (!device) { // Redundant check but needed to satisfy typescript that device is not undefined
        Error('need a browser that supports WebGPU');
        return;
    }
    const {strides, dataShape, outputShape} = dimInfo;
    const {kernelDepth, kernelSize} = kernel;
    const dimLength = dataShape[reduceDim];

    const rank = outputShape.length;
    const is2D = rank === 2
    const shape = is2D ? [1, ...outputShape] : outputShape;
    const outputSize = shape.map(e => e).reduce((a,b) => a*b, 1);
    const [zStride, yStride, xStride] = dataShape.length === 3 
        ?   [strides[0], strides[1], strides[2]]
        :   [1, strides[strides.length-2], strides[strides.length-1]]

    const scaler = is2D ? 16 : 4; // We assume the workgroups are 4 threads per dimension for 3D and 16 threads per dimension for 2D
    const workGroups = shape.map(e => Math.ceil(e/scaler))
    const computeModule = device.createShaderModule({
        label: 'Custom Shader Module',
        code:shaderCode,
    });
    
    const pipeline = device.createComputePipeline({
        label: 'Custom Shader pipeline',
        layout: 'auto',
        compute: {
        module: computeModule,
        },
    });

    const defs = makeShaderDataDefinitions(shaderCode);
    const myUniformValues = makeStructuredView(defs.uniforms.params);
    myUniformValues.set({
        xStride,
        yStride,
        zStride,
        xSize: shape[2], 
        ySize: shape[1],
        zSize: shape[0],
        workGroups:[workGroups[2], workGroups[1], workGroups[0]],
        kernelDepth,
        kernelSize,
        reduceDim,
        dimLength
    });
    
    // Create buffers
    const inputBuffer = device.createBuffer({
        label: 'Input Buffer',
        size: inputArray.byteLength * (hasF16 ? 1 : 2), 
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const outputBuffer = device.createBuffer({
        label: 'Output Buffer',
        size: outputSize * (hasF16 ? 2 : 4),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const uniformBuffer = device.createBuffer({
        label: 'Uniform Buffer',
        size: myUniformValues.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const readBuffer = device.createBuffer({
        label:'Read Buffer',
        size: outputSize * (hasF16 ? 2 : 4),
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // Write Buffers to GPU
    device.queue.writeBuffer(inputBuffer, 0, (hasF16 ? inputArray : new Float32Array(inputArray as Float16Array)) as GPUAllowSharedBufferSource);
    device.queue.writeBuffer(uniformBuffer, 0, myUniformValues.arrayBuffer as GPUAllowSharedBufferSource);

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: inputBuffer } },
            { binding: 1, resource: { buffer: outputBuffer } },
            { binding: 2, resource: { buffer: uniformBuffer } },
        ],
    });
    const encoder = device.createCommandEncoder({
        label: 'convolution encoder',
    });
    const pass = encoder.beginComputePass({
        label: 'convolution compute pass',
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    if (is2D){
        pass.dispatchWorkgroups(workGroups[1], workGroups[2]); //Honestly don't know why it's Y/X on 2D but X/Y/Z on 3D but it is what it is
    } else {
        pass.dispatchWorkgroups(workGroups[2], workGroups[1], workGroups[0]);
    }
    pass.end();

    encoder.copyBufferToBuffer(
        outputBuffer, 0,
        readBuffer, 0,
        outputSize * (hasF16 ? 2 : 4)
    );

    // Submit work to GPU
    device.queue.submit([encoder.finish()]);

    // Map staging buffer to read results
    await readBuffer.mapAsync(GPUMapMode.READ);
    const resultArrayBuffer = readBuffer.getMappedRange();
    const results = hasF16 ? new Float16Array(resultArrayBuffer.slice()) : new Float16Array(new Float32Array(resultArrayBuffer.slice()));

    // Clean up
    readBuffer.unmap();
    return results;
}