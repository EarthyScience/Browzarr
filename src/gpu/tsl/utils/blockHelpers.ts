import { clamp, float, Fn, instanceIndex, mix, varying, vec2, vec4 } from 'three/tsl';
import * as h from './commonHelpers';
import * as u from './uniforms';

// Center UV of this instance's cell in the displacement grid
export const instanceUV = Fn(() => {
    const resolution = u.displacementResolution;
    const px = instanceIndex.mod(resolution.x);
    const py = instanceIndex.div(resolution.x).mod(resolution.y);
    return vec2(
        px.toFloat().add(0.5),
        py.toFloat().add(0.5)
    ).div(resolution)
})

// Vertex-stage sample for a block. colorIn is what the fragment stage receives: vec2(first, second), unswapped for bivariate
export const sampleBlockStrength = (localCoord: any, textureIdx: any) => {
    if (u.bivariate.value){
        const raw = h.sample2(localCoord, textureIdx);
        return {
            isNan: h.isNanVal(raw.r).or(h.isNanVal(raw.g)),
            strength: mix(raw.r, raw.g, u.bivariateSelection), // For some reason select and Ifs don't work as expected on vertex/varying. Mix works though
            colorIn: varying(raw, 'vBivar'),
        };
    }
    const rescaled = h.rescaler(h.sample1(localCoord, textureIdx).toVar());
    const strength = clamp(rescaled.mul(u.cScale).add(u.cOffset), 0.0, 0.995);
    return {
        isNan: h.isNanVal(rescaled),
        strength,
        colorIn: vec2(varying(strength, 'vStrength'), float(0)),
    };
}

export const instanceColor = Fn(([strengths] : [any])=>{
   if (u.bivariate.value){
        const biCol = h.colorMixer( strengths.x, strengths.y ).toVar();
        return vec4(biCol.rgb, 1)
    } else{
        const color = u.cmap.sample(vec2(strengths.x, 0.5))
        return vec4(color.rgb, 1)
    }
})
