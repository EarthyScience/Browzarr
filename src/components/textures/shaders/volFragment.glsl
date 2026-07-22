// by Jeran Poehls
precision highp float;
precision highp sampler3D;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform sampler3D map[12]; // We are limited to 16 textures. Cmap counts as one. 15 is weird so we use 14. 
uniform sampler2D maskTexture;
uniform sampler2D cmap;
uniform sampler2D remapTexture;
uniform vec3 textureDepths;

uniform float cOffset;
uniform float cScale;
uniform vec3 scale;
uniform vec2 threshold;
uniform float steps;
uniform vec4 flatBounds;
uniform vec2 vertBounds;
uniform float animateProg;
uniform float transparency;
uniform float nanAlpha;
uniform vec3 nanColor;
uniform float opacityMag;
uniform bool useClipScale;
uniform float fillValue;
uniform int maskValue;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform int colorScale;
uniform float logConstant;
uniform float logEps;
uniform float dataRange;
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

#define epsilon 0.000001
#define pi 3.1415926535

float applyColorScale(float x, int scaleType, float c, float eps, float range) {
    float safeRange = max(range, 1.0);
    if (scaleType == 1) {
        float safeEps = max(eps, 0.000001);
        float clamped = max(x, safeEps);
        return (log(clamped) - log(safeEps)) / (log(1.0) - log(safeEps));
    } else if (scaleType == 2) {
        float clampedX = max(x, 0.0);
        float num = log(1.0 + clampedX * safeRange);
        float denom = log(1.0 + safeRange);
        return denom != 0.0 ? num / denom : x;
    } else if (scaleType == 3) {
        float safeC = max(c, 0.00001);
        float clampedX = max(x, 0.0);
        float num = log(safeC + clampedX * safeRange) - log(safeC);
        float denom = log(safeC + safeRange) - log(safeC);
        return denom != 0.0 ? num / denom : x;
    } else if (scaleType == 4) {
        return sign(x) * sqrt(abs(x));
    } else if (scaleType == 5) {
        float clampedX = max(x, 0.0);
        float expR = min(safeRange, 10.0);
        float num = exp(clampedX * expR) - 1.0;
        float denom = exp(expR) - 1.0;
        return denom != 0.0 ? num / denom : x;
    }
    return x;
}

vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 box_min = vec3(-(scale * 0.5));
    vec3 box_max = vec3(scale * 0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
}


vec2 realCoords(vec2 uv){
    vec2 normalizedLon = lonBounds/2./pi+0.5;
    vec2 normalizedLat = latBounds/pi+0.5;
    float lonScale = normalizedLon.y-normalizedLon.x;
    float latScale = normalizedLat.y-normalizedLat.x;
    
    float u = uv.x * lonScale + normalizedLon.x;
    float v = uv.y * latScale + normalizedLat.x;

    return vec2(u, v);
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
    else return 0.0;
}




void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);

    if (bounds.x > bounds.y) discard;

    bounds.x = max(bounds.x, 0.0);

    vec3 p = vOrigin + bounds.x * rayDir;
    vec3 inc = 1.0 / abs(rayDir);
    float delta = min(inc.x, min(inc.y, inc.z));
    delta /= steps;
    vec4 accumColor = vec4(0.0);
    float alphaAcc = 0.0;

    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 

    for (float t = bounds.x; t < bounds.y; t += delta) {
        p = vOrigin + rayDir * t;
        if (p.x > -flatBounds.x || p.x < -flatBounds.y) { 
            continue;
        }
        if (-p.z > -flatBounds.z || -p.z < -flatBounds.w) {
            continue;
        }
        if (p.y < vertBounds.x || p.y > vertBounds.y) {
            continue;
        }
        vec3 texCoord = p / scale + 0.5;
        #ifdef REPROJECT
            vec3 remap = texture2D(remapTexture, texCoord.xy).rgb;
            texCoord.xy = remap.rg;
            if (remap.b < 0.5) {continue;}
        #endif

        if (maskValue != 0){
            vec2 newV = texCoord.xy; 
            vec2 realV = realCoords(newV);
            float mask = texture(maskTexture, realV).r;
            bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
            if (cond){
                continue;
            }
        }
        texCoord.z = mod(texCoord.z + animateProg, 1.0001);
        texCoord = clamp(texCoord, vec3(0.0), 1. - vec3(epsilon)); // This prevents the the very end of the dimensions having floating point errors

        ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
        int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
        vec3 localCoord = texCoord * (textureDepths);  
        localCoord = fract(localCoord);
        float d = sample1(localCoord, textureIdx);

        if (d == 1. || abs(d - fillValue) < 0.005) {
            accumColor.rgb += (1.0 - alphaAcc) * pow(nanAlpha, 5.) * nanColor.rgb;
            alphaAcc += pow(nanAlpha, 5.);
        } else {
            float range = max(threshold.y - threshold.x, 0.0001);
            float normD = clamp((d - threshold.x) / range, 0.0, 1.0);
            if (colorScale == 1 && normD < logEps) {
                if (useLowclip) {
                    accumColor.rgb += (1.0 - alphaAcc) * lowclip.a * lowclip.rgb;
                    alphaAcc += lowclip.a * (1.0 - alphaAcc);
                }
            } else {
                float scaledD = applyColorScale(normD, colorScale, logConstant, logEps, dataRange);
                float rawSampLoc = scaledD * cScale + cOffset;

                if (d < threshold.x || rawSampLoc < 0.0) {
                    if (useLowclip) {
                        accumColor.rgb += (1.0 - alphaAcc) * lowclip.a * lowclip.rgb;
                        alphaAcc += lowclip.a * (1.0 - alphaAcc);
                    }
                } else if (d > threshold.y || rawSampLoc > 1.0) {
                    if (useHighclip) {
                        accumColor.rgb += (1.0 - alphaAcc) * highclip.a * highclip.rgb;
                        alphaAcc += highclip.a * (1.0 - alphaAcc);
                    }
                } else {
                    float sampLoc = clamp(rawSampLoc, 0.0, 0.99);
                    vec4 col = texture(cmap, vec2(sampLoc, 0.5));
                    float alpha;
                    if (useClipScale) {
                        float normalizedOpacity = clamp(scaledD, 0.0, 1.0);
                        alpha = pow(max(normalizedOpacity, 0.001), transparency * opacityMag);
                    } else {
                        alpha = pow(max(sampLoc, 0.001), transparency * opacityMag);
                    }
                    accumColor.rgb += (1.0 - alphaAcc) * alpha * col.rgb;
                    alphaAcc += alpha * (1.0 - alphaAcc);
                }
            }
        }

        if (alphaAcc >= 1.0) break;
    }
    accumColor.a = alphaAcc; // Set the final accumulated alpha
    color = accumColor;
    if (color.a == 0.0) discard;
}
