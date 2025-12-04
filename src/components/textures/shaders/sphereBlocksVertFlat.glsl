 // by Jeran Poehls

attribute vec2 instanceUV;

uniform sampler2D map[14];
uniform vec3 textureDepths;

uniform float displaceZero;
uniform float displacement;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform float animateProg;

#define PI 3.1415926535

vec3 givePosition(vec2 uv) {
    // Reverse the normalization using the bounds
    float longitude = -((1.0 - uv.x) * (lonBounds.y - lonBounds.x) + lonBounds.x);
    float latitude = uv.y * (latBounds.y - latBounds.x) + latBounds.x;
    
    // Convert to Cartesian coordinates
    float x = cos(latitude) * cos(longitude);
    float y = sin(latitude);
    float z = cos(latitude) * sin(longitude);
    
    return vec3(x, y, z);
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

    int yStepSize = int(textureDepths.x); 
    ivec2 idx = clamp(ivec2(instanceUV * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
    int textureIdx = idx.y * yStepSize + idx.x;
    vec2 localCoord = instanceUV * (textureDepths.xy); // Scale up
    localCoord = fract(localCoord);

    float dispStrength = sample1(localCoord, textureIdx);

    if (dispStrength == 1.0){ // Invalid value. Just hide it
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    } else {
        vec2 centeredUV = (instanceUV - vec2(0.5, 0.5)) * vec2(2.0, 2.0); 
        vec3 spherePosition = givePosition(instanceUV);
        float latitudeFactor = cos(centeredUV.y * 3.14159 * 0.5); // Maps -1..1 to proper latitude
        float heightFactor = (dispStrength - displaceZero) * displacement;
        vec3 scaledPosition = position;
        scaledPosition.x *= latitudeFactor;
        scaledPosition.y += 0.025;
        scaledPosition.y *= heightFactor;


        vec3 normal = normalize(spherePosition);
        // Create orientation matrix to point cube outward
        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 tangent = normalize(cross(up, normal));
        vec3 bitangent = cross(normal, tangent);
        mat3 orientation = mat3(tangent, normal, bitangent);

        // Apply orientation and position
        vec3 oriented = orientation * scaledPosition;
        vec3 worldPosition = spherePosition + oriented;
        // worldPosition = scaledPosition + spherePosition;
        vStrength = dispStrength;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);

    }
}