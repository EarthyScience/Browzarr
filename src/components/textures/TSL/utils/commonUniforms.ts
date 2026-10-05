import { Data3DTexture, DataTexture, Texture } from 'three/webgpu';
import { texture, uniform } from 'three/tsl';


export const map = Array.from({length: 12}, () => texture(new Data3DTexture()))
export const maskTexture = texture( new DataTexture() );
export const cmap = texture( new DataTexture() );
export const remapTexture = texture( new DataTexture() );
export const borderTexture = texture( new Texture() );
export const remapBorders = uniform( 'bool' );
export const useBorderTexture = uniform( 'bool' );
export const borderWidth = uniform( 'float' );
export const borderColor = uniform( 'vec3' );
export const textureDepths = uniform( 'vec3' );
export const bivariate = uniform( 'bool' );
export const bottomLeft = uniform( 'vec3' );
export const topLeft = uniform( 'vec3' );
export const bottomRight = uniform( 'vec3' );
export const resolution = uniform( 'float' );
export const mixMode = uniform( 'int' );
export const bivariateSelection = uniform( 'int' );
export const is360 = uniform( 'bool' );
export const cOffset = uniform( 'float' );
export const cScale = uniform( 'float' );
export const threshold = uniform( 'vec2' );
export const animateProg = uniform( 'float' );
export const nanAlpha = uniform( 'float' );
export const nanColor = uniform( 'vec3' );
export const maskValue = uniform( 'int' );
export const fillValue = uniform( 'float' );
export const latBounds = uniform( 'vec2' );
export const lonBounds = uniform( 'vec2' );
export const valueRange = uniform( 'vec2' );
export const useF16 = uniform( 'bool' );
export const isFlat = uniform( 'bool' );
export const reproject = uniform( 'bool' );