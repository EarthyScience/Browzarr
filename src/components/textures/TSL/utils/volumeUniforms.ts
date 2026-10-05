import { uniform } from "three/tsl";

export const scale = uniform('vec3');
export const steps = uniform('int');
export const flatBounds = uniform('vec4');
export const vertBounds = uniform('vec2');
export const transparency = uniform('float');
export const opacityMag = uniform('float');
export const useClipScale = uniform('bool');
export const revTransparency = uniform('bool');