 // by Jeran Poehls

attribute vec2 instanceUV;

uniform bool is360;

uniform float displaceZero;
uniform float displacement;


vec2 giveLonLat(vec2 uv) {
    // Reverse the normalization using the bounds
    float longitude = uv.x * (lonBounds.y - lonBounds.x) + lonBounds.x;
    float latitude = uv.y * (latBounds.y - latBounds.x) + latBounds.x;
    longitude = -longitude;
    
    return vec2(longitude, latitude);
}

vec3 givePosition(vec2 lonlat) {
    float longitude = lonlat.x;
    float latitude = lonlat.y;
    // Convert to Cartesian coordinates
    float x = cos(latitude) * cos(longitude);
    float y = sin(latitude);
    float z = cos(latitude) * sin(longitude);
    
    return vec3(x, y, z);
}

out float vStrength;
out vec2 vUv;

void main() {
    if (maskValue != 0 || useBorderTexture){ // need to pass vUv to frag render bordelines. Hence why useBorderTexture is here
        // Get Coordinates
        vec2 realUV = realCoords(instanceUV);
        vUv = realCoords(instanceUV + (position.xz) / vec2(2.*PI, PI));
        if (is360){
            realUV.x = fract(realUV.x + 0.5);
            vUv.x = fract(vUv.x + 0.5);
        } 
        if (maskValue != 0 ){
            float mask = texture(maskTexture, realUV).r;
            bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
            if (cond){
                gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                return;
            }
        }
    }
    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 
    vec2 sampleCoord = instanceUV;
    #ifdef REPROJECT
        vec3 remap = texture(remapTexture, sampleCoord).rgb;
        sampleCoord = remap.rg;
        if (remap.b < 0.5) sampleCoord = vec2(2.0); // I don't think this is ever the case
    #endif
    #ifdef IS_FLAT
        ivec2 idx = clamp(ivec2(sampleCoord * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
        int textureIdx = idx.y * yStepSize + idx.x;
        vec2 localCoord = sampleCoord * (textureDepths.xy); // Scale up
    #else
        vec3 texCoord = vec3(sampleCoord, animateProg);
        ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
        int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
        vec3 localCoord = texCoord * (textureDepths); // Scale up
    #endif
    localCoord = fract(localCoord);
    float dispStrength = sample1(localCoord, textureIdx);
    rescaler(dispStrength);
    bool isnan = isNaNBits(dispStrength)
        || (!useF16 && dispStrength == 1.0);
    if (isnan){gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return;}// Invalid value. Just hide it

    dispStrength *= cScale;
    dispStrength = max(min(dispStrength+cOffset,0.995), 0.0);

    bool valid = (dispStrength >= threshold.x) && (dispStrength <= threshold.y); 
    if (!valid || abs(dispStrength - fillValue) < 0.005){ // Invalid value. Just hide it
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    } 
    
    vec2 lonlat = giveLonLat(instanceUV);
    float latitudeFactor = cos(lonlat.y); // Maps -1..1 to proper latitude
    vec2 centeredUV = (instanceUV - vec2(0.5, 0.5)) * vec2(2.0, 2.0); 
    vec3 spherePosition = givePosition(lonlat);
    float widthFactor = abs(lonBounds.y-lonBounds.x)/(2.0*PI);
    float vertFactor = (latBounds.y-latBounds.x)/PI;
    float heightFactor = (dispStrength - displaceZero) * displacement;
    vec3 scaledPosition = position;
    scaledPosition.x *= latitudeFactor * widthFactor;
    scaledPosition.z *= vertFactor ;
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
    vStrength = dispStrength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);

    
}