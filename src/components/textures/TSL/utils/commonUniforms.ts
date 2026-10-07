import * as THREE from 'three/webgpu'
import { Data3DTexture, DataTexture, Texture } from 'three/webgpu';
import { texture, uniform, bool, float, int, vec2, vec3, color, texture3D } from 'three/tsl';
import { useGlobalStore } from '@/GlobalStates/GlobalStore';

const placeholder3D = () => {
    const t = new THREE.Data3DTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, 1);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
    t.minFilter = t.magFilter = THREE.NearestFilter;
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
export const reproject = uniform( bool(false) );
