import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import * as THREE from 'three';

import proj4 from 'proj4';

function normalizeArray(array: Array<number>){
    const len = array.length;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < len; i++){
        const v = array[i];
        if (v < min) min = v;
        if (v > max) max = v;
    }
    const range = max - min;
    const scaler = 1/range;
    const out = new Float32Array(len);
    for (let i = 0; i < array.length; i++){
        out[i] = (array[i]-min)* scaler;
    }
    return out;
}

function isUniformStep(array: Array<number>): boolean {
    const len = array.length;
    if (len < 3) return true; // any 0–2 element array trivially qualifies

    const step = array[1] - array[0];

    for (let i = 2; i < len; i++) {
        if (array[i] - array[i - 1] !== step) {
            return false;
        }
    }
    return true;
}

function createRemapTexture(xArray: Array<number>, yArray: Array<number>) {
  const width = xArray.length;
  const height = yArray.length;

  const normX = normalizeArray(xArray);
  const normY = normalizeArray(yArray);

  const data = new Float32Array(width * height * 2);
  let ptr = 0;
  for (let j = 0; j < height; j++) {
    const y = normY[j];
    for (let i = 0; i < width; i++) {
      const x = normX[i];
      data[ptr++] = x;
      data[ptr++] = y;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGFormat,
    THREE.FloatType
  );

  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return texture;
}

export function SetReprojectionTexture(dimArrays: Array<number>[]){
    const dimCount = dimArrays.length;
    const xArray = dimArrays[dimCount-1];
    const yArray = dimArrays[dimCount-2];
    const isRegular = isUniformStep(xArray) && isUniformStep(yArray)
    if (isRegular) return;

    const remapTexture = createRemapTexture(xArray, yArray);
    useGlobalStore.setState({remapTexture});
}

export function reproject(){
    const {defaultProjection, projection} = usePlotStore.getState()
    const {dimArrays, remapTexture } = useGlobalStore.getState()
    if (remapTexture) remapTexture.dispose();
    const dimCount = dimArrays.length;
    const xArray = dimArrays[dimCount-1];
    const yArray = dimArrays[dimCount-2];

    const width = xArray.length;
    const height = yArray.length;

    const coords = [];
    for (let j = 0; j < height; j++) {
        const y = yArray[j];
        for (let i = 0; i < width; i++) {
            const x = xArray[i];
            coords.push([x,y])
        }
    }

    const proj = proj4(defaultProjection, projection);
    const floatData = new Float64Array(width * height * 2);
    const data = new Uint16Array(width * height * 2);
    let [xMin, xMax] = [Infinity, -Infinity];
    let [yMin, yMax] = [Infinity, -Infinity];

    let ptr = 0;
    for (let j = 0; j < height; j++) {
        const y = yArray[j];
        for (let i = 0; i < width; i++) {
            const [px, py] = proj.forward([xArray[i], y]);
            if (py > yMax) yMax = py;
            if (py < yMin) yMin = py;
            if (px > xMax) xMax = px;
            if (px < xMin) xMin = px;
            floatData[ptr++] = px;
            floatData[ptr++] = py;
        }
    }
    const xRange = xMax - xMin;
    const xScaler = 1/xRange;
    const yRange = yMax - yMin;
    const yScaler = 1/yRange;

    for (let i = 0; i < width * height; i++){
        const idx = i * 2;
        const nx = (floatData[idx] - xMin) * xScaler;     // normalized to [0, 1]
        const ny = (floatData[idx + 1] - yMin) * yScaler; // normalized to [0, 1]
        data[idx] = THREE.DataUtils.toHalfFloat(nx);
        data[idx + 1] = THREE.DataUtils.toHalfFloat(ny);
    }
    
    const texture = new THREE.DataTexture(
        data,
        width,
        height,
        THREE.RGFormat,
        THREE.HalfFloatType
    );
    texture.needsUpdate = true;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    useGlobalStore.setState({remapTexture: texture})
}