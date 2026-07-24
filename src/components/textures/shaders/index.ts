import colorPipelineChunk from './colorPipeline.glsl';
import pointFragRaw from './pointFrag.glsl';
import pointVert from './pointVertex.glsl';
import vertexShader from './vertex.glsl';
import fragmentShaderRaw from './volFragment.glsl';
import sphereFragRaw from './sphereFrag.glsl';
import sphereVertex from './sphereVertex.glsl';
import fragOptRaw from './fragmentOpt.glsl';
import bordersFrag from './bordersFrag.glsl';
import flatFragRaw from './flatFrag.glsl';
import sphereBlocksVert from './sphereBlocksVert.glsl';
import sphereBlocksFragRaw from './sphereBlocksFrag.glsl';
import orthoVertex from './orthoVertex.glsl';
import flatBlocksVert from './flatBlocksVert.glsl';

function injectColorScale(shaderStr: string): string {
  return shaderStr.replace('// APPLY_COLOR_SCALE', colorPipelineChunk);
}

const pointFrag = injectColorScale(pointFragRaw);
const fragmentShader = injectColorScale(fragmentShaderRaw);
const sphereFrag = injectColorScale(sphereFragRaw);
const fragOpt = injectColorScale(fragOptRaw);
const flatFrag = injectColorScale(flatFragRaw);
const sphereBlocksFrag = injectColorScale(sphereBlocksFragRaw);

export {
    pointFrag,
    pointVert,
    vertexShader,
    fragmentShader,
    sphereFrag,
    sphereVertex,
    fragOpt,
    bordersFrag,
    flatFrag,
    sphereBlocksVert,
    sphereBlocksFrag,
    orthoVertex,
    flatBlocksVert,
}