import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { ArrayMinMax, linspace } from '@/utils/HelperFuncs';
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

export function reproject(resolution: number = 256){
    const {defaultProjection, projection} = usePlotStore.getState()
    if (!defaultProjection || !projection) return; // This shouldn't trigger as the button will be disabled for this same condition
    const {dimArrays, remapTexture } = useGlobalStore.getState()
    if (remapTexture) remapTexture.dispose();
    const dimCount = dimArrays.length;

    const xArray = dimArrays[dimCount-1];
    const yArray = dimArrays[dimCount-2];
    const width = xArray.length;
    const height = yArray.length;

    const [xMin, xMax] = ArrayMinMax(xArray);
    const [yMin, yMax] = ArrayMinMax(yArray);
    // We need the border points as the min/max of the old CRS won't always be the min/max of the new CRS
    const boundaryPoints: [number, number][] = [];
    console.log(xMin, xMax, yMin, yMax)
    // top edge: j = 0, all i
    for (let i = 0; i < width; i++) {
        boundaryPoints.push([xArray[i], yArray[0]]);
    }
    // bottom edge: j = height - 1, all i
    for (let i = 0; i < width; i++) {
        boundaryPoints.push([xArray[i], yArray[height - 1]]);
    }
    // left edge: i = 0, all j
    for (let j = 0; j < height; j++) {
        boundaryPoints.push([xArray[0], yArray[j]]);
    }
    // right edge: i = width - 1, all j
    for (let j = 0; j < height; j++) {
        boundaryPoints.push([xArray[width - 1], yArray[j]]);
    }

    const proj = proj4(defaultProjection, projection);
    let [minX, minY] = [Infinity, Infinity];
    let [maxX, maxY] = [-Infinity, -Infinity];

    // Get min/max of new CRS for new Axis'
    for (const [lon, lat] of boundaryPoints) {
        const [px, py] = proj.forward([lon, lat]);
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }    
 
    // ---- Get Estimate of aspectRatio ---- //
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    const [x0, y0] = proj.forward([xArray[midX], yArray[midY]]);
    const [x1, y1] = proj.forward([xArray[midX + 1], yArray[midY + 1]]);
    const xSize = Math.abs(x1 - x0);
    const ySize = Math.abs(y1 - y0);
    const aspectRatio = xSize/ySize;

    // ---- Construct new CRS axis' ----//
    const targetWidth = Math.ceil(resolution*aspectRatio);
    const targetHeight = resolution;
    const xTicks = linspace(minX, maxX, targetWidth);
    const yTicks = linspace(minY, maxY, targetHeight);
    const data = new Uint16Array(targetWidth * targetHeight * 2);
    for (let j = 0; j < targetHeight; j++) {
        for (let i = 0; i < targetWidth; i++) {
            const [lon, lat] = proj.inverse([xTicks[i], yTicks[j]]);
            const u = (lon - xMin) / (xMax - xMin);
            const v = (lat - yMin) / (yMax - yMin);
            const idx = (j * targetWidth + i) * 2;
            const valid = u >= 0 && u <= 1 && v >= 0 && v <= 1 && isFinite(lon) && isFinite(lat);
            data[idx]     = THREE.DataUtils.toHalfFloat(valid ? u : -1);  
            data[idx + 1] = THREE.DataUtils.toHalfFloat(valid ? v : -1);
        }  
    }
    const sanity = proj4(projection, defaultProjection, [-17912187.334735576, -8989370.410319714])
    console.log(sanity)
    const texture = new THREE.DataTexture(
        data,
        targetWidth,
        targetHeight,
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