//This File will have functions converting the array information into 2D or 3D textures that we will pass to the corresponding 2D or 3D object
import * as THREE from 'three'
import { ArrayMinMax} from '@/utils/HelperFuncs';

interface Array {
    data: Float32Array | Float64Array | Int32Array | Uint32Array | Float32Array;
    shape: number[];
}


// ? Please, try when possible to define the types of your variables. Otherwise building will fail.
function ArrayTo2D(array: Array): [ THREE.DataTexture, {minVal: number, maxVal: number}]{
    //We assume there is no slicing here. That will occur in the ZarrLoader stage. This is just pure data transfer
    const shape = array.shape;
    const data = array.data;
    const width = shape[1];
    const height = shape[0];
    const [minVal,maxVal] = ArrayMinMax(data)
    const normed = data.map((i)=>(i-minVal)/(maxVal-minVal))

    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254))
    const texture = new THREE.DataTexture(
        textureData,
        width,
        height,
        THREE.RedFormat,
        THREE.UnsignedByteType
    );

    // Update texture
    texture.needsUpdate = true;
    return [texture, {maxVal,minVal}]
}

export function ArrayTo3D(array: Array) : [ THREE.Data3DTexture, {minVal: number, maxVal: number}]{
    const shape = array.shape;
    const data = array.data;
    const [lz,ly,lx] = shape
    console.log(shape)
    const [minVal,maxVal] = ArrayMinMax(data)
    
    const normed = data.map((i)=>(i-minVal)/(maxVal-minVal))
    const textureData = new Uint8Array(normed.map((i)=>isNaN(i) ? 255 : i*254));   
    const volTexture = new THREE.Data3DTexture(textureData, lx, ly, lz);
    volTexture.format = THREE.RedFormat;
    volTexture.minFilter = THREE.NearestFilter;
    volTexture.magFilter = THREE.NearestFilter;
    volTexture.needsUpdate = true;
    return [volTexture, {maxVal,minVal}]
}

export function ArrayToTexture(array: Array): [ THREE.Data3DTexture | THREE.DataTexture, {minVal: number, maxVal: number}]{
    const shape = array.shape;
    const [texture,scales] = shape.length == 3 ? ArrayTo3D(array) : ArrayTo2D(array);
    return [texture, scales];
}

export function DefaultCubeTexture() {
    // Create a Float32Array instead of regular array
    const data = new Float32Array(1000);
    // Fill with random values
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() < 0.2 ? NaN : Math.random();
    }
    
    const shape = [10, 10, 10];
    const array: Array = {
        data,
        shape,
    }
    const [texture, _scaling] = ArrayTo3D(array)
    return texture
}