 // by Jeran Poehls

#ifdef IS_FLAT
    uniform sampler2D map[12];
#else
    uniform sampler3D map[12];
#endif

uniform vec3 textureDepths;

uniform float displaceZero;
uniform float displacement;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform float animateProg;

uniform sampler2D remapTexture;
uniform bool is360;

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = -atan(n.z, n.x);
    latitude = (latitude - latBounds.x)/(latBounds.y - latBounds.x);
    longitude = (longitude - lonBounds.x)/(lonBounds.y - lonBounds.x);

    return vec2(longitude, latitude);
}

float sample1(
    #ifdef IS_FLAT
        vec2 p,
    #else
        vec3 p,
    #endif
    int index
    ) { // Shader doesn't support dynamic indexing so we gotta use switching
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
    else return 0.0;
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
        float noNan = float(dispStrength != 1.0);
        vec3 newPos = position + (normal * (dispStrength-displaceZero) * noNan * displacement);
        //Pass out position for sphere frag
        vec4 worldPos = modelViewMatrix * vec4( newPos, 1.0 );
        gl_Position = projectionMatrix * worldPos;
    } else {
        vec4 worldPos = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * worldPos;
    }
}