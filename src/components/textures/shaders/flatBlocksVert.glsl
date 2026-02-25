attribute vec2 instanceUV;

uniform sampler2D map[14];
uniform sampler2D maskTexture;
uniform vec3 textureDepths;
uniform float aspect;
uniform float displaceZero;
uniform float displacement;
uniform float animateProg;
uniform int maskValue;
uniform vec2 latBounds;
uniform vec2 lonBounds;


#define PI 3.1415926535

vec3 givePosition(vec2 uv) {
    return vec3(uv.x*2., uv.y/aspect*2., 0.);
}
vec2 realCoords(vec2 uv){
    vec2 normalizedLon = lonBounds/2./PI+0.5;
    vec2 normalizedLat = latBounds/PI+0.5;
    float lonScale = normalizedLon.y-normalizedLon.x;
    float latScale = normalizedLat.y-normalizedLat.x;
    
    float u = uv.x * lonScale + normalizedLon.x;
    float v = uv.y * latScale + normalizedLat.x;

    return vec2(u, v);
}

float sample1(vec2 p, int index) { // Shader doesn't support dynamic indexing so we gotta use switching
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
    if (maskValue != 0){
        vec2 maskUV = realCoords(instanceUV);
        float mask = texture(maskTexture, maskUV).r;
        bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
        if (cond){
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
    }
    int yStepSize = int(textureDepths.x); 
    ivec2 idx = clamp(ivec2(instanceUV * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
    int textureIdx = idx.y * yStepSize + idx.x;
    vec2 localCoord = instanceUV * (textureDepths.xy); // Scale up
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
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);

    }
}