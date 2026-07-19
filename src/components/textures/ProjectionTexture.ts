import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { usePlotStore } from '@/GlobalStates/PlotStore';
import { ArrayMinMax, linspace, ParseExtent } from '@/utils/HelperFuncs';
import { useErrorStore } from '@/GlobalStates/ErrorStore';
import * as THREE from 'three';

import proj4 from 'proj4';
import { getAxisIndices } from '@/hooks/useAxisIndices';
import { useZarrStore } from '@/GlobalStates/ZarrStore';

export function checkProjString(projString: string){
    const {setError} = useErrorStore.getState()
    try{
        const proj = proj4(projString)
        return true
    } catch{
        setError('badProj')
        return false
    }
}

export function resetProjection(){
    const {dimArrays, dimNames, dimUnits, shape, remapTexture} = useGlobalStore.getState()
    if (remapTexture) remapTexture.dispose()
    const {xSlice, ySlice} = useZarrStore.getState()
    const {xIdx, yIdx} = getAxisIndices()

    const xLength = dimArrays[xIdx].length;
    const yLength = dimArrays[yIdx].length;
    const aspectRatio = xLength/yLength;
    const newShape = new THREE.Vector3().copy(shape)
    newShape.y = 2/aspectRatio;
    

    useGlobalStore.setState({
        axisDimArrays: dimArrays,
        axisDimUnits: dimUnits,
        axisDimNames: dimNames,
        shape: newShape,
        remapTexture: undefined
    })
    usePlotStore.setState({
        xSlice, 
        ySlice
    })

}

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
    const scaler = range === 0 ? 0 : 1 / range;
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
    const {xIdx, yIdx} = getAxisIndices()
    const xArray = dimArrays[xIdx];
    const yArray = dimArrays[yIdx];
    const isRegular = isUniformStep(xArray) && isUniformStep(yArray)
    if (isRegular) return;
    //Dispose of remaptexture if you use this function
    const remapTexture = createRemapTexture(xArray, yArray);
    useGlobalStore.setState({remapTexture});
}

export function reproject(resolution: number = 256){
    const {nativeCRS, destCRS, plotType} = usePlotStore.getState()
    if (!nativeCRS || !destCRS) return; // This shouldn't trigger as the button will be disabled for this same condition
    if (!checkProjString(destCRS)) return; // nativeCRS will already be checked when the user sets it, so we don't need to check it here

    const {dimArrays, remapTexture, flipY, dataShape } = useGlobalStore.getState()
    if (remapTexture) remapTexture.dispose();

    const {xIdx, yIdx} = getAxisIndices()
    const xArray = dimArrays[xIdx];
    const yArray = dimArrays[yIdx];
    const width = xArray.length;
    const height = yArray.length;


    const [xMin, xMax] = ArrayMinMax(xArray);
    const [yMin, yMax] = ArrayMinMax(yArray);
    // We need the border points as the min/max of the old CRS won't always be the min/max of the new CRS
    const boundaryPoints: [number, number][] = [];

    
    for (let i = 0; i < width; i++) {
        boundaryPoints.push([xArray[i], yArray[0]]);
    }
    for (let i = 0; i < width; i++) {
        boundaryPoints.push([xArray[i], yArray[height - 1]]);
    }
    for (let j = 0; j < height; j++) {
        boundaryPoints.push([xArray[0], yArray[j]]);
    }
    for (let j = 0; j < height; j++) {
        boundaryPoints.push([xArray[width - 1], yArray[j]]);
    }

    const proj = proj4(nativeCRS, destCRS);
    let [minX, minY] = [Infinity, Infinity];
    let [maxX, maxY] = [-Infinity, -Infinity];

    // Get min/max of new CRS for new Axis'
    for (const [lon, lat] of boundaryPoints) {
        const [px, py] = proj.forward([lon, lat]);
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }    
 
    const xDiff = Math.abs(maxX - minX);
    const yDiff = Math.abs(maxY - minY);
    const aspectRatio = yDiff > 0 ? xDiff / yDiff : 1;
    function safeInverse(proj: any, xy: [number, number], tol = 1e-6) {
        //This function checks if the coordinates are valid and returns 0 or 1 based on conditions
        const [lon, lat] = proj.inverse(xy);
        if (!isFinite(lon) || !isFinite(lat)) return [lon, lat, 0];
        const [xCheck, yCheck] = proj.forward([lon, lat]);
        if (Math.abs(xCheck - xy[0]) > tol * Math.max(1, Math.abs(xy[0])) ||
            Math.abs(yCheck - xy[1]) > tol * Math.max(1, Math.abs(xy[1]))) {
            return [lon, lat, 0];
        }
        return [lon, lat, 1];
    }

    // ---- Construct new CRS axis' ----//
    let adjustedResolution = resolution;

    let targetWidth: number;
    let targetHeight: number;
    let data: Uint16Array;
    let xTicks: Array<number>;
    let yTicks: Array<number>;

    if (plotType === 'point-cloud') {
        targetWidth = width;
        targetHeight = height;
        xTicks = linspace(minX, maxX, targetWidth);
        yTicks = flipY ? linspace(maxY, minY, targetHeight) : linspace(minY, maxY, targetHeight);
        data = new Uint16Array(targetWidth * targetHeight * 4);

        const xDiff = Math.abs(maxX - minX);
        const yDiff = Math.abs(maxY - minY);

        for (let j = 0; j < targetHeight; j++) {
            const lat = yArray[j];
            for (let i = 0; i < targetWidth; i++) {
                const lon = xArray[i];
                const [px, py] = proj.forward([lon, lat]);
                const valid = (isFinite(px) && isFinite(py)) ? 1 : 0;

                const u = xDiff > 0 ? (px - minX) / xDiff : 0;
                const v = yDiff > 0 ? (py - minY) / yDiff : 0;

                const idx = (j * targetWidth + i) * 4;
                data[idx]     = THREE.DataUtils.toHalfFloat(u);  
                data[idx + 1] = THREE.DataUtils.toHalfFloat(v);
                data[idx + 2] = THREE.DataUtils.toHalfFloat(valid);
            }
        }
    } else {
        targetWidth = Math.ceil(adjustedResolution * aspectRatio);
        targetHeight = adjustedResolution;
        xTicks = linspace(minX, maxX, targetWidth);
        yTicks = flipY ? linspace(maxY, minY, targetHeight) : linspace(minY, maxY, targetHeight);

        // Detect if coordinate axes are descending
        const isXDescending = xArray.length > 1 ? xArray[0] > xArray[xArray.length - 1] : false;
        const isYDescending = yArray.length > 1 ? yArray[0] > yArray[yArray.length - 1] : false;

        data = new Uint16Array(targetWidth * targetHeight * 4);
        const xRangeDiff = xMax - xMin;
        const yRangeDiff = yMax - yMin;
        for (let j = 0; j < targetHeight; j++) {
            for (let i = 0; i < targetWidth; i++) {
                const [lon, lat, valid] = safeInverse(proj, [xTicks[i], yTicks[j]]);
                const u = xRangeDiff > 0 ? (isXDescending ? (xMax - lon) / xRangeDiff : (lon - xMin) / xRangeDiff) : 0;
                const v = yRangeDiff > 0 ? (isYDescending ? (yMax - lat) / yRangeDiff : (lat - yMin) / yRangeDiff) : 0;
                
                // Check boundary bounds to avoid displaying clamped blocks outside the dataset area
                const inBounds = lon >= xMin && lon <= xMax && lat >= yMin && lat <= yMax;
                const validVal = (valid === 1 && inBounds) ? 1 : 0;

                const idx = (j * targetWidth + i) * 4;
                data[idx]     = THREE.DataUtils.toHalfFloat(u);  
                data[idx + 1] = THREE.DataUtils.toHalfFloat(v);
                data[idx + 2] = THREE.DataUtils.toHalfFloat(validVal);
            }  
        }
    }
    const texture = new THREE.DataTexture(
        data,
        targetWidth,
        targetHeight,
        THREE.RGBAFormat, // Must be RGBA as HalfFloat RGB is not supported
        THREE.HalfFloatType
    );
    texture.needsUpdate = true;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    useGlobalStore.setState({remapTexture: texture})

    // ---- Update Axis and Shape information ----//
    const crsCheck = proj4(destCRS);
    const {axisDimArrays, axisDimUnits, axisDimNames, shape} = useGlobalStore.getState()
    const newAxisDimArrays = [...axisDimArrays];
    newAxisDimArrays[xIdx] = xTicks;
    newAxisDimArrays[yIdx] = yTicks;

    const newAxisDimUnits = [...axisDimUnits];
    const targetUnits = (crsCheck.oProj as any)?.units || 'degrees';
    //@ts-ignore At this point these are all valid
    newAxisDimUnits[xIdx] = targetUnits;
    //@ts-ignore At this point these are all valid
    newAxisDimUnits[yIdx] = targetUnits;

    const newAxisDimNames = [...axisDimNames];
    newAxisDimNames[xIdx] = 'X';
    newAxisDimNames[yIdx] = 'Y';
    const newShape = new THREE.Vector3().copy(shape)
    newShape.y = 2/aspectRatio;
    useGlobalStore.setState({
        axisDimArrays: newAxisDimArrays, 
        axisDimUnits: newAxisDimUnits, 
        axisDimNames: newAxisDimNames,
        shape: newShape
    })
    usePlotStore.setState({
        xSlice: [0, null],
        ySlice: [0, null]
    })
    ParseExtent(newAxisDimUnits, newAxisDimArrays);

}