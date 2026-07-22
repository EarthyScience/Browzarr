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
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

#define pi 3.141592653
#define epsilon 0.0001

float applyColorScale(float x, int scaleType, float c) {
    if (scaleType == 1) {
        float eps = 0.000001;
        float clamped = max(x, eps);
        return (log(clamped) - log(eps)) / (log(1.0 + eps) - log(eps));
    } else if (scaleType == 2) {
        return log(1.0 + max(x, 0.0)) / log(2.0);
    } else if (scaleType == 3) {
        float safeC = max(c, 0.00001);
        float clamped = max(x + safeC, 0.000001);
        float num = log(clamped) - log(safeC);
        float denom = log(1.0 + safeC) - log(safeC);
        return denom != 0.0 ? num / denom : x;
    } else if (scaleType == 4) {
        return sign(x) * sqrt(abs(x));
    } else if (scaleType == 5) {
        return (exp(x) - 1.0) / (exp(1.0) - 1.0);
    }
    return x;
}

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
        bool isNaN = (strength == 1.) || (abs(strength - fillValue) < 0.005);
        if (isNaN) {
            color = vec4(nanColor, nanAlpha);
        } else if (strength < threshold.x) {
            color = useLowclip ? lowclip : vec4(0.);
        } else if (strength > threshold.y) {
            color = useHighclip ? highclip : vec4(0.);
        } else {
            float range = max(threshold.y - threshold.x, 0.0001);
            float normS = clamp((strength - threshold.x) / range, 0.0, 1.0);
            float scaledS = applyColorScale(normS, colorScale, logConstant);
            float rawSampLoc = scaledS * cScale + cOffset;
            if (rawSampLoc < 0.0) {
                color = useLowclip ? lowclip : vec4(texture(cmap, vec2(0.0, 0.5)).rgb, 1.0);
            } else if (rawSampLoc > 1.0) {
                color = useHighclip ? highclip : vec4(texture(cmap, vec2(0.995, 0.5)).rgb, 1.0);
            } else {
                float sampLoc = clamp(rawSampLoc, 0.0, 0.995);
                color = vec4(texture(cmap, vec2(sampLoc, 0.5)).rgb, 1.0);
            }
        }

        if (maskValue != 0){
            vec2 maskUV = giveMaskUV(aPosition);
            float mask = texture(maskTexture, maskUV).r;
            bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
            if (cond){
                color = vec4(nanColor, 1.);
                color.a = nanAlpha;  
            }
        }
    } else {
        color = vec4(nanColor, 1.);
        color.a = nanAlpha;
    }

}