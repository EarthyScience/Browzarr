import * as THREE from 'three'

export function sampleCRS(tex: THREE.DataTexture, u: number, v: number): [THREE.Vector2, boolean] {
    // Linearly interpolates a texture given UV
    const { data, width, height } = tex.image;
    if (!data) return [new THREE.Vector2(u, v), true];

    const facX = u * width - 1;
    const facY = v * height - 1;

    const x0 = Math.floor(facX);
    const y0 = Math.floor(facY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    // Interpolation weights [0-1]
    const wx = facX - x0;
    const wy = facY - y0;

    // Clamp each corner to the texture bounds
    const clampX = (x: number) => Math.min(Math.max(x, 0), width - 1);
    const clampY = (y: number) => Math.min(Math.max(y, 0), height - 1);

    const cx0 = clampX(x0);
    const cx1 = clampX(x1);
    const cy0 = clampY(y0);
    const cy1 = clampY(y1);

    const getValues = (x: number, y: number) => {
        const idx = (y * width + x) * 4;
        return {
            u: THREE.DataUtils.fromHalfFloat(data[idx]),
            v: THREE.DataUtils.fromHalfFloat(data[idx + 1]),
            valid: THREE.DataUtils.fromHalfFloat(data[idx + 2]),
        };
    };

    const t00 = getValues(cx0, cy0);
    const t10 = getValues(cx1, cy0);
    const t01 = getValues(cx0, cy1);
    const t11 = getValues(cx1, cy1);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const newU = lerp(lerp(t00.u, t10.u, wx), lerp(t01.u, t11.u, wx), wy);
    const newV = lerp(lerp(t00.v, t10.v, wx), lerp(t01.v, t11.v, wx), wy);

    // Valid only if all four corners are valid
    const valid = t00.valid > 0 && t10.valid > 0 && t01.valid > 0 && t11.valid > 0;

    return [new THREE.Vector2(newU, newV), valid];
}

export function getCRSStrip(tex: THREE.DataTexture, fac: number, row: boolean): [number, number][] {
    const { data, width, height } = tex.image;
    if (!data) return [];
    const stripLength = row ? width : height;
    const fixedDim = row ? height : width;

    const facIdx = Math.min(Math.floor(fixedDim * fac), fixedDim - 1);
    const initialOffset = row ? facIdx * width : facIdx;
    const offset = row ? 1 : width;
    const uvs: [number, number][] = []
    for (let i = 0; i < stripLength; i++){
        const idx = (initialOffset + offset * i) * 4; // RGBA
        const u = THREE.DataUtils.fromHalfFloat(data[idx]);
        const v = THREE.DataUtils.fromHalfFloat(data[idx + 1]);
        const valid = THREE.DataUtils.fromHalfFloat(data[idx + 2]);
        if (valid > 0) uvs.push([u,v]);
        else uvs.push([-1, -1]);
    }
    return uvs
}