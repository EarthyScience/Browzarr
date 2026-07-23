 // by Jeran Poehls
out vec4 color;

in vec3 aPosition;

#ifdef IS_FLAT
    uniform sampler2D map[12];
#else
    uniform sampler3D map[12];
#endif

uniform sampler2D maskTexture;
uniform sampler2D cmap;
uniform vec3 textureDepths;
uniform sampler2D remapTexture;

uniform float cOffset;
uniform float cScale;
uniform float animateProg;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform vec2 threshold;
uniform vec3 nanColor;
uniform float nanAlpha;
uniform float fillValue;
uniform int maskValue;
uniform int colorScale;
uniform float logConstant;
uniform float logEps;
uniform float dataRange;
uniform float minVal;
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

#define pi 3.141592653
#define epsilon 0.0001

// APPLY_COLOR_SCALE

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = -atan(n.z, n.x);

    latitude = (latitude - latBounds.x)/(latBounds.y - latBounds.x);
    longitude = (longitude - lonBounds.x)/(lonBounds.y - lonBounds.x);

    return vec2(longitude, latitude);
}

vec2 giveMaskUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = -atan(n.z, n.x);
    latitude /= pi;
    longitude /= (2. * pi);
    float u = longitude + 0.5;
    float v = latitude + 0.5;
    return vec2(u, v);
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

void main(){
    #ifdef IS_FLAT
        vec2 texCoord = giveUV(aPosition);
        bool inBounds = all(greaterThanEqual(texCoord, vec2(0.0))) && 
            all(lessThanEqual(texCoord, vec2(1.0)));
        #ifdef REPROJECT
            if (inBounds) {
                vec3 remap = texture(remapTexture, texCoord.xy).rgb;
                texCoord.xy = remap.rg;
                if (remap.b < 0.5) inBounds = false;
            }
        #endif
    #else
        vec2 sampleCoord = giveUV(aPosition);
        bool inBounds = all(greaterThanEqual(sampleCoord, vec2(0.0))) && 
            all(lessThanEqual(sampleCoord, vec2(1.0)));
        #ifdef REPROJECT
            if (inBounds) {
                vec3 remap = texture(remapTexture, sampleCoord.xy).rgb;
                sampleCoord.xy = remap.rg;
                if (remap.b < 0.5) inBounds = false;
            }
        #endif
    #endif
   
    if (inBounds) {
        int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
        int yStepSize = int(textureDepths.x); 
        #ifdef IS_FLAT
            ivec2 idx = clamp(ivec2(texCoord * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
            int textureIdx = idx.y * yStepSize + idx.x;
            vec2 localCoord = texCoord * (textureDepths.xy); // Scale up
        #else
            vec3 texCoord = vec3(sampleCoord, animateProg);
            ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
            int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
            vec3 localCoord = texCoord * (textureDepths); // Scale up
        #endif
        localCoord = fract(localCoord);
        float strength = sample1(localCoord, textureIdx);

        color = evaluateColorScale(
            strength, threshold, fillValue, nanColor, nanAlpha,
            cmap, cScale, cOffset, colorScale, logConstant, logEps,
            dataRange, minVal, lowclip, highclip, useLowclip, useHighclip
        );

        if (isMasked(texture(maskTexture, giveMaskUV(aPosition)).r, maskValue)) {
            color = vec4(nanColor, nanAlpha);
        }
    } else {
        color = vec4(nanColor, nanAlpha);
    }
}