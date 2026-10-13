import * as THREE from 'three/webgpu'
import { Data3DTexture, DataTexture, Texture } from 'three/webgpu';
import { texture, uniform, bool, float, int, vec2, vec3, vec4, color, texture3D, string } from 'three/tsl';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';

const placeholder3D = () => {
    const t = new THREE.Data3DTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, 1);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
};

export let map: any[] = [ texture3D(placeholder3D()) ];

export function setMapTextures(textures: (DataTexture | Data3DTexture | Texture)[]) {
    if (!textures || !textures.length) return;
    const is3D = !!(textures[0] as any).isData3DTexture;
    const kindChanged = is3D !== !!(map[0].value as any).isData3DTexture;
    const countChanged = textures.length !== map.length;

    if (kindChanged || countChanged) {
        // New nodes: materials rebuild against these when they observe mapVersion
        map = textures.map(t => is3D ? texture3D(t as Data3DTexture) : texture(t as DataTexture));
        (useGlobalStore.getState() as any).bumpMapVersion?.();
    } else {
        // Same kind & count: hot-swap bindings, no recompile needed
        map.forEach((node, i) => {
            if (node.value !== textures[i]) {
                node.value = textures[i];
                textures[i].needsUpdate = true;
            }
        });
    }
}
//  --- GENERAL --- //
export const maskTexture = texture( new DataTexture() );
export const cmap = texture( new DataTexture() );
export const remapTexture = texture( new DataTexture() );
export const reproject = uniform( bool(false) );
export const borderTexture = texture( new Texture() );
export const remapBorders = uniform( bool() );
export const remapBorderTexture = texture( new DataTexture() );
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
export const flipY = uniform(bool(false));
export const rescaleValues = uniform(bool(false));
export const colorScale = uniform(string("x"));

// --- VOLUME UNIFORMS --- //
export const volumeScale = uniform(vec3());
export const steps = uniform(int());
export const flatBounds = uniform(vec4());
export const vertBounds = uniform(vec2());
export const dataShape = uniform(vec3())
export const tfLUT = texture( new DataTexture() );

// --- BLOCK UNIFORMS --- //
export const displacement = uniform(float(2));
export const displaceZero = uniform(float(0));
export const displacementResolution = uniform(vec2(0.0))
export const widthFactor = uniform(1), vertFactor = uniform(1);

// --- POINT UNIFORMS --- //
export const pointShape = uniform(vec3(0))
export const globalScale = uniform(float(0))
export const pointSize = uniform(float(0))
export const timeScale = uniform(float(0))
export const scaleByVal = uniform(bool(false))
export const scaleIntensity = uniform(float(0))
