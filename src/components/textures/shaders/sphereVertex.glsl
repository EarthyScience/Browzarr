 // by Jeran Poehls

uniform float displaceZero;
uniform float displacement;

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = -atan(n.z, n.x);

    latitude = (latitude - latBounds.x)/(latBounds.y - latBounds.x);
    float span = lonBounds.y - lonBounds.x;
    longitude = mod(longitude - lonBounds.x, 2.0*PI); 
    longitude = longitude / span;
    
    return vec2(longitude, latitude);
}

out vec3 aPosition;

void main() {
    aPosition = position;
    vec2 sampleCoord = giveUV(aPosition);
    #ifdef REPROJECT
            vec3 remap = texture(remapTexture, sampleCoord).rgb;
            sampleCoord = remap.rg;
            if (remap.b < 0.5) sampleCoord = vec2(2.0); // I don't think this is ever the case
    #endif
    bool inBounds = all(greaterThanEqual(sampleCoord, vec2(0.0))) &&
    all(lessThanEqual(sampleCoord, vec2(1.0)));
    if (inBounds){
        vec3 normal = normalize(position);
        int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
        int yStepSize = int(textureDepths.x); 
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
        float dispStrength = sample1(localCoord, textureIdx);
        rescaler(dispStrength);
        bool isnan = isNaNBits(dispStrength) || (!useF16 && dispStrength == 1.);
        if (!isnan){
            vec3 newPos = position + (normal * (dispStrength - displaceZero) * displacement); // <---- Here, using dispStrength doesn't work for float16
            //Pass out position for sphere frag
            vec4 worldPos = modelViewMatrix * vec4( newPos, 1.0 );
            gl_Position = projectionMatrix * worldPos;
        } else{
            vec4 worldPos = modelViewMatrix * vec4( position, 1.0 );
            gl_Position = projectionMatrix * worldPos;
        }
        
    } else {
        vec4 worldPos = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * worldPos;
    }
}