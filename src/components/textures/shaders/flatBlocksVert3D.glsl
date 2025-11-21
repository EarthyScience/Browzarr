 // by Jeran Poehls

attribute vec2 instanceUV;

out float vDepth;

uniform sampler3D map[14];
uniform vec3 textureDepths;

uniform float aspect;
uniform float displaceZero;
uniform float displacement;
uniform float animateProg;

#define PI 3.1415926535

vec3 givePosition(vec2 uv) {
    return vec3(uv.x*2., uv.y/aspect*2., 0.);
}


float sample1(vec3 p, int index) { // Shader doesn't support dynamic indexing so we gotta use switching
    if (index == 0) return texture(map[0], p).r;
    else if (index == 1) return texture(map[1], p).r;
    else if (index == 2) return texture(map[2], p).r;
    else if (index == 3) return texture(map[3], p).r;
    else if (index == 4) return texture(map[4], p).r;
    else if (index == 5) return texture(map[5], p).r;
    else if (index == 6) return texture(map[6], p).r;
    else if (index == 7) return texture(map[7], p).r;
    else if (index == 8) return texture(map[8], p).r;
    else if (index == 9) return texture(map[9], p).r;
    else if (index == 10) return texture(map[10], p).r;
    else if (index == 11) return texture(map[11], p).r;
    else if (index == 12) return texture(map[12], p).r;
    else if (index == 13) return texture(map[13], p).r;
    else return 0.0;
}

out float vStrength;

void main() {

    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 
    vec3 texCoord = vec3(instanceUV, animateProg);
    ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1); // Ivec3 is like running a "floor" operation on all three at once. The clamp is because the very last idx is OOR
    int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
    vec3 localCoord = texCoord * textureDepths; // Scale up
    localCoord = fract(localCoord);

    float dispStrength = sample1(localCoord, textureIdx);

    if (dispStrength == 1.0){ // Invalid value. Just hide it
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    } else {
        vec2 centeredUV = (instanceUV - vec2(0.5, 0.5)); 
        vec3 planePosition = givePosition(centeredUV);
        float heightFactor = (dispStrength - displaceZero) * displacement;
        vec3 scaledPosition = position;
        scaledPosition.z += 0.005;
        scaledPosition.z *= heightFactor;
        vStrength = dispStrength;
        vec3 worldPosition = planePosition + scaledPosition;
        vec4 position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
        vDepth = position.z;
        gl_Position = position;
    }
}