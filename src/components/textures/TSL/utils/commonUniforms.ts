import { Data3DTexture, DataTexture, Texture } from 'three/webgpu';
import { texture, uniform, bool, float, int, vec2, vec3, color, texture3D } from 'three/tsl';


export const map = Array.from({length: 12}, () => texture3D((new Data3DTexture())))
export const maskTexture = texture( new DataTexture() );
export const cmap = texture( new DataTexture() );
export const remapTexture = texture( new DataTexture() );
export const borderTexture = texture( new Texture() );
export const remapBorders = uniform( bool() );
export const useBorderTexture = uniform( bool() );
export const borderWidth = uniform( float() );
export const borderColor = uniform( color() );
export const textureDepths = uniform( vec3() );
export const bivariate = uniform( bool() );
export const bottomLeft = uniform( color() );
export const topLeft = uniform( color() );
export const bottomRight = uniform( color() );
export const resolution = uniform( float() );
export const mixMode = uniform( int() );
export const bivariateSelection = uniform( int() );
export const is360 = uniform( bool() );
export const cOffset = uniform( float() );
export const cScale = uniform( float() );
export const threshold = uniform( vec2() );
export const animateProg = uniform( float() );
export const nanAlpha = uniform( float() );
export const nanColor = uniform( color() );
export const maskValue = uniform( int() );
export const fillValue = uniform( float() );
export const latBounds = uniform( vec2() );
export const lonBounds = uniform( vec2() );
export const valueRange = uniform( vec2() );
export const useF16 = uniform( bool() );
export const isFlat = uniform( bool() );
export const reproject = uniform( bool() );
