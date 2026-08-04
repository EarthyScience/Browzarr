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
        proj4(projString)
        return true
    } catch{
        setError('badProj')
        return false
    }
}

export function resetProjection(){
    const {dimArrays, dimNames, dimUnits, shape} = useGlobalStore.getState()
    const {xSlice, ySlice} = useZarrStore.getState()
    const {xIdx, yIdx} = getAxisIndices()
    const xLength = dimArrays[xIdx].length;
    const yLength = dimArrays[yIdx].length;
    const aspectRatio = xLength/yLength;
    const newShape = new THREE.Vector3().copy(shape)
    newShape.y = 2/aspectRatio;
    setIrregularGridTexture(dimArrays)
    useGlobalStore.setState({
        axisDimArrays: dimArrays,
        axisDimUnits: dimUnits,
        axisDimNames: dimNames,
        shape: newShape,
    })
    usePlotStore.setState({
        xSlice, 
        ySlice
    })

}

function normalizePixels(array: number[] ): number[]{
    // Normalizes an array to the range [0.5/len, 1-1/len] for use in pixel sampling
    const len = array.length;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < len; i++){
        const v = array[i];
        if (v < min) min = v;
        if (v > max) max = v;
    }
    const range = max - min;
    const out = new Array<number>(len);
    const half = 0.5 / len;
    const span = 1 - 1 / len;
    for (let i = 0; i < len; i++) {
        const t = range === 0 ? 0 : (array[i] - min) / range; 
        out[i] = half + t * span;
    }
    return out;
}

function normalizeArray(array: number[] ): number[]{
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
    const out = new Array<number>(len);
    for (let i = 0; i < array.length; i++){
        out[i] = (array[i]-min)* scaler;
    }
    return out;
}



function isUniformStep(array: number[]): boolean {
    const len = array.length;
    if (len < 3) return true; // any 0–2 element array trivially qualifies
    const step = array[1] - array[0];

    for (let i = 2; i < len; i++) {
        const diff = array[i] - array[i - 1]
        if (Math.abs(diff - step) > 1e-4) {
            return false;
        }
    }
    return true;
}

function createIrregularUV(xArray: number[], yArray: number[], flipY: boolean) {
	// Creates a UV map if the grids of a dataset don't increase uniformly
	const width = xArray.length;
	const height = yArray.length;

	const normX = normalizePixels(xArray);
	const normY = normalizePixels(yArray);

	const data = new Uint16Array(width * height * 4); //4 for RGBA
	let ptr = 0;
	for (let j = 0; j < height; j++) {
		const y = flipY ? 1 - normY[j] : normY[j];
		for (let i = 0; i < width; i++) {
		const x = normX[i];
		data[ptr++] = THREE.DataUtils.toHalfFloat(x);
		data[ptr++] = THREE.DataUtils.toHalfFloat(y);
		data[ptr++] = THREE.DataUtils.toHalfFloat(1.); // Set Valid so can be used in same shader logic
		ptr++;
		
		}
	}
	const texture = new THREE.DataTexture(
		data,
		width,
		height,
		THREE.RGBAFormat,
		THREE.HalfFloatType
	);
	texture.needsUpdate = true;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearFilter;
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;

	return texture;
}

export function setIrregularGridTexture(dimArrays: Array<number>[]){
    // This is needed for Sphere and other projections where the grid is not uniform. It creates a texture that maps the irregular grid to a regular grid for sampling in the shader.
    const {xIdx, yIdx} = getAxisIndices()
	const {remapTexture, flipY} = useGlobalStore.getState();
	if (remapTexture) remapTexture.dispose();
    const xArray = dimArrays[xIdx];
    const yArray = dimArrays[yIdx];
    const isRegular = isUniformStep(xArray) && isUniformStep(yArray)
    if (isRegular) return;
    //Dispose of remaptexture if exists
	const {plotType} = usePlotStore.getState();
	const isSphere = plotType == 'sphere';
	const texture = isSphere ? createInverseUV(xArray, yArray, flipY, 1024) :  createIrregularUV(xArray, yArray, flipY)
    useGlobalStore.setState({remapTexture:texture});
}

export function sampleCRS(tex: THREE.DataTexture, u:number, v:number): [THREE.Vector2, boolean] {
  // Samples an array given UVs
  const { data, width, height } = tex.image;
  if (!data) return [new THREE.Vector2(u, v), true];

  const x = Math.floor(u * (width - 1));
  const y = Math.floor(v * (height - 1));

  const idx = (y * width + x) * 4; // RGBA
  const newU = THREE.DataUtils.fromHalfFloat(data[idx + 0])
  const newV = THREE.DataUtils.fromHalfFloat(data[idx + 1])
  const valid = THREE.DataUtils.fromHalfFloat(data[idx + 2])
  return [
    new THREE.Vector2(newU,newV),
    valid > 0.5
  ];
}

export function reproject(resolution: number = 256){
    const {nativeCRS, destCRS, plotType, is360Deg} = usePlotStore.getState()
	const {dimArrays, remapTexture, flipY } = useGlobalStore.getState()
	const insufficientCRS = !nativeCRS || !destCRS

	if (remapTexture && insufficientCRS){
		// If remapTexture already exists but not nativeCRS then this could be from irregular grid. In that case remake irrgular grid when CRS are missing
		// Will be disposesd in setIrregularGridTexture
		setIrregularGridTexture(dimArrays)
		return;
	}
    if (insufficientCRS) return; 
    if (!checkProjString(destCRS) || !checkProjString(destCRS)) return; 
    if (remapTexture) remapTexture.dispose();

    const {xIdx, yIdx} = getAxisIndices()
    let xArray = dimArrays[xIdx] as number[];
    const yArray = dimArrays[yIdx];
    const width = xArray.length;
    const height = yArray.length;

	if (is360Deg) {
		xArray = remap360to180Monotonic(xArray) 
	}
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
    for (const [x, y] of boundaryPoints) {
        const [px, py] = proj.forward([x, y]);
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

                const u = (px - minX) / xDiff;
                const v = (py - minY) / yDiff;

                const idx = (j * targetWidth + i) * 4;
                data[idx]     = THREE.DataUtils.toHalfFloat(u);  
                data[idx + 1] = THREE.DataUtils.toHalfFloat(v);
                data[idx + 2] = THREE.DataUtils.toHalfFloat(valid);
            }
        }
    } else {
        targetWidth = Math.ceil(adjustedResolution * aspectRatio);
        targetHeight = adjustedResolution;
        xTicks = isUniformStep(xArray) 
			? linspace(minX, maxX, targetWidth) 
			: irregularTicks(minX, maxX, targetWidth, normalizeArray(xArray) as unknown as number[]);

        yTicks = flipY 
		?(isUniformStep(yArray) 
			? linspace(maxY, minY, targetHeight)
			:  irregularTicks(maxY, minY, targetHeight, normalizeArray(yArray) as unknown as number[]))
		:(isUniformStep(yArray) 
			? linspace(minY, maxY, targetHeight)
			: irregularTicks(minY, maxY, targetHeight, normalizeArray(yArray) as unknown as number[]));

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
                const v = (isYDescending ? (yMax - lat) / yRangeDiff : (lat - yMin) / yRangeDiff)
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
    const targetUnits = (crsCheck.oProj as any)?.units;
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

export function createInverseUV(
	xArray: Array<number>,
	yArray: Array<number>,
	flipY: boolean,
	resolution : number
) {
	// Creates an inverse UV map: for each normalized (x, y) position,
	// stores the (i, j) index into xArray/yArray that best matches it.
	const width = resolution*2; 
	const height = resolution;

	const normX = normalizeArray(xArray);
	const normY = normalizeArray(yArray);

	const data = new Uint16Array(width * height * 4); // 4 for RGBA
	let ptr = 0;
	for (let j = 0; j < height; j++) {
		const vRaw = height > 1 ? j / (height - 1) : 0;
		const v = flipY ? 1 - vRaw : vRaw;
		const jIdx = findNearestIndex(normY, v);
		const jNorm = yArray.length > 1 ? jIdx / (yArray.length - 1) : 0;

		for (let i = 0; i < width; i++) {
			const u = width > 1 ? i / (width - 1) : 0;
			const iIdx = findNearestIndex(normX, u);
			const iNorm = xArray.length > 1 ? iIdx / (xArray.length - 1) : 0;

			data[ptr++] = THREE.DataUtils.toHalfFloat(iNorm);
			data[ptr++] = THREE.DataUtils.toHalfFloat(jNorm);
			data[ptr++] = THREE.DataUtils.toHalfFloat(1.); // Set Valid so can be used in same shader logic
			ptr++;
		}
	}

	const texture = new THREE.DataTexture(
		data,
		width,
		height,
		THREE.RGBAFormat,
		THREE.HalfFloatType
	);
	texture.needsUpdate = true;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearFilter;
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;

	return texture;
}

// Binary search for the index of the value in a monotonic (increasing or
// decreasing) array closest to `target`.
function findNearestIndex(arr: number[], target: number): number {
	const n = arr.length;
	if (n === 0) return 0;
	if (n === 1) return 0;

	const ascending = arr[0] <= arr[n - 1];
	let lo = 0;
	let hi = n - 1;

	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		const midVal = arr[mid];
		if (ascending ? midVal < target : midVal > target) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	// lo and hi now bracket target; pick whichever is closer
	return Math.abs(arr[lo] - target) <= Math.abs(arr[hi] - target) ? lo : hi;
}

function remap360to180Monotonic(arr: number[]) {
    const wrapped = arr.map(v => ((v + 180) % 360 + 360) % 360 - 180);
    const sorted = wrapped.sort((a, b) => a - b);

    return sorted;
}

function resampleLinear(data: number[], newLength: number): number[] {
  const oldLength = data.length;
  const result = []
  // Maps output index range [0, newLength - 1] onto input index range [0, oldLength - 1]
  const scale = (oldLength - 1) / (newLength - 1);

  for (let i = 0; i < newLength; i++) {
    const inPos = i * scale;
    const lowerIdx = Math.floor(inPos);
    const upperIdx = Math.min(lowerIdx + 1, oldLength - 1);
    const frac = inPos - lowerIdx;

    result[i] = data[lowerIdx] * (1 - frac) + data[upperIdx] * frac;
  }

  return result;
}

function irregularTicks(maxVal: number, minVal: number, resolution: number, normalizedArray: number[]){
	// Takes an irregular array from [0, 1] and mixes that with min/max 
	const newFracs = resampleLinear(normalizedArray, resolution)
	const newTicks = []
	for (let i = 0; i < resolution; i++){
		const maxFrac = newFracs[i]
		const minFrac = 1 - maxFrac
		const tick = minVal * minFrac + maxVal * maxFrac
		newTicks.push(tick)
	}
	return newTicks
}