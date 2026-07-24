import colorPipelineChunk from '@/components/textures/shaders/colorPipeline.glsl';
import MaxFrag from './Max.glsl'
import MinFrag from './Min.glsl'
import MeanFrag from './Mean.glsl'
import StDevFrag from './StDev.glsl'
import vertShader from './vert.glsl'
import fragShaderRaw from './frag.glsl'
import correlateFrag from './Correlation.glsl'

const fragShader = fragShaderRaw.replace('// APPLY_COLOR_SCALE', colorPipelineChunk);

export {
    MaxFrag,
    MinFrag,
    MeanFrag,
    StDevFrag,
    vertShader,
    fragShader,
    correlateFrag
}