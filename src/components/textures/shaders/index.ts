import pointFrag from './pointFrag.glsl';
import pointVert from './pointVertex.glsl';
import vertexShader from './vertex.glsl';
import rayMarchFrag from './rayMarchFragment.glsl';
import sphereFrag from './sphereFrag.glsl';
import sphereVertex from './sphereVertex.glsl';
import bordersFrag from './bordersFrag.glsl'
import flatFrag from './flatFrag.glsl'
import sphereBlocksVert from './sphereBlocksVert.glsl';
import sphereBlocksFrag from './sphereBlocksFrag.glsl';
import orthoVertex from './orthoVertex.glsl';
import flatBlocksVert from './flatBlocksVert.glsl';
import ddaFrag from './DDAFrag.glsl'

import commonUniforms from './chunks/commonUniforms.glsl'
import commonHelpers from './chunks/commonHelpers.glsl'

const commonPrefix = [commonUniforms, commonHelpers].join('\n')
const wrapShader = (shader: string) => [commonPrefix, shader].join('\n')

const wrappedRayMarch = wrapShader(rayMarchFrag);
const wrappedFlat = wrapShader(flatFrag);
const wrappedflatBlocksVert = wrapShader(flatBlocksVert);

export {
    pointFrag,
    pointVert,
    vertexShader,
    wrappedRayMarch as rayMarchFrag,
    sphereFrag,
    sphereVertex,
    bordersFrag,
    wrappedFlat as flatFrag,
    sphereBlocksVert,
    sphereBlocksFrag,
    orthoVertex,
    wrappedflatBlocksVert as flatBlocksVert,
    ddaFrag
}