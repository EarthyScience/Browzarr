// by Jeran Poehls
precision highp float;
precision highp sampler3D;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform sampler3D map[12]; // We are limited to 16 textures. Cmap counts as one. 15 is weird so we use 12.
uniform sampler2D maskTexture;
uniform sampler2D cmap;
uniform sampler2D remapTexture;
uniform sampler2D borderTexture;
uniform bool useBorderTexture;
uniform float borderWidth;
uniform vec3 borderColor;

uniform vec3 textureDepths;

uniform vec3 dataShape;
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

#define EPSILON 0.000001
#define PI 3.1415926535

vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 boxMin = -(scale * 0.5);
    vec3 boxMax = scale * 0.5;
    vec3 invDir = 1.0 / dir;
    vec3 tMinTmp = (boxMin - orig) * invDir;
    vec3 tMaxTmp = (boxMax - orig) * invDir;
    vec3 tMin = min(tMinTmp, tMaxTmp);
    vec3 tMax = max(tMinTmp, tMaxTmp);
    float t0 = max(tMin.x, max(tMin.y, tMin.z));
    float t1 = min(tMax.x, min(tMax.y, tMax.z));
    return vec2(t0, t1);
}

vec2 realCoords(vec2 uv) {
    vec2 normalizedLon = lonBounds / (2.0 * PI) + 0.5;
    vec2 normalizedLat = latBounds / PI + 0.5;
    float lonScale = normalizedLon.y - normalizedLon.x;
    float latScale = normalizedLat.y - normalizedLat.x;

    float u = uv.x * lonScale + normalizedLon.x;
    float v = uv.y * latScale + normalizedLat.x;

    return vec2(u, v);
}

void rescaler(out float x){
    //LOGIC
}

float sample1(vec3 p, int index) {
    if (index == 0) return texture(map[0], p).r;
    if (index == 1) return texture(map[1], p).r;
    if (index == 2) return texture(map[2], p).r;
    if (index == 3) return texture(map[3], p).r;
    if (index == 4) return texture(map[4], p).r;
    if (index == 5) return texture(map[5], p).r;
    if (index == 6) return texture(map[6], p).r;
    if (index == 7) return texture(map[7], p).r;
    if (index == 8) return texture(map[8], p).r;
    if (index == 9) return texture(map[9], p).r;
    if (index == 10) return texture(map[10], p).r;
    if (index == 11) return texture(map[11], p).r;
    return 0.0;
}

bool shouldSkip(vec3 p, out vec3 texCoord) {
    // This functions creates denormalized texCoord while also checking for early skipping
    texCoord = vec3(0.0);

    if (p.x > -flatBounds.x || p.x < -flatBounds.y) return true;
    if (-p.z > -flatBounds.z || -p.z < -flatBounds.w) return true;
    if (p.y < vertBounds.x || p.y > vertBounds.y) return true;

    texCoord = p / scale + 0.5;

    #ifdef REPROJECT
        vec3 remap = texture2D(remapTexture, texCoord.xy).rgb;
        texCoord.xy = remap.rg;
        if (remap.b < 0.5) return true;
    #endif

    if (maskValue != 0) {
        vec2 realV = realCoords(texCoord.xy);
        float mask = texture(maskTexture, realV).r;
        bool masked = maskValue == 1 ? mask < 0.5 : mask >= 0.5;
        if (masked) return true;
    }
    texCoord.z = mod(texCoord.z + animateProg, 1.0001);
    texCoord = clamp(texCoord, vec3(0.0), 1.0 - vec3(EPSILON));

    return false;
}

bool sampleVoxel(vec3 texCoord, out float d) {
    // This gets the sample value. If d is clipped by value-range return false
    ivec3 depths = ivec3(textureDepths);
    int yStepSize = depths.x;
    int zStepSize = depths.y * depths.x;

    ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), depths - 1);
    int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
    vec3 localCoord = fract(texCoord * textureDepths);

    d = sample1(localCoord, textureIdx);
    return d >= threshold.x && d <= threshold.y;
}

void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);
    if (bounds.x > bounds.y) discard;
    bounds.x = max(bounds.x, 0.0);

    vec3 gridRes = dataShape;
    vec3 boxMin = -(scale * 0.5);
    vec3 voxelSize = scale / gridRes;

    // Initial voxel from the ray's entry point into the box.
    vec3 p0 = vOrigin + bounds.x * rayDir;
    vec3 localPos = clamp((p0 - boxMin) / scale, vec3(0.0), vec3(1.0) - vec3(EPSILON)) * gridRes;
    ivec3 voxel = clamp(ivec3(floor(localPos)), ivec3(0), ivec3(gridRes) - 1);

    // Standard 3D DDA (Amanatides & Woo) setup.
    vec3 stepDir = sign(rayDir);
    ivec3 stepDirI = ivec3(stepDir);
    vec3 nextBoundary = boxMin + (vec3(voxel) + max(stepDir, 0.0)) * voxelSize;

    vec3 tMax = (nextBoundary - vOrigin) / rayDir;
    vec3 tDelta = voxelSize / abs(rayDir);

    // Handle parallel rays. If ray has < eps component in an axis, it will never cross that axis
    // If it is degen just manually set the interesction distance to someting arbitrarly high
    bvec3 degenerate = lessThan(abs(rayDir), vec3(EPSILON));
    tMax = mix(tMax, vec3(1e30), degenerate);
    tDelta = mix(tDelta, vec3(1e30), degenerate);

    float t = bounds.x;
    int maxSteps = int(gridRes.x + gridRes.y + gridRes.z) * 2 + 8;

    vec3 accumColor = vec3(0.0);
    float alphaAcc = 0.0;

    for (int i = 0; i < maxSteps; i++) {
        if (t > bounds.y) break;

        // Sample at the center of the current voxel. 
        vec3 pCenter = boxMin + (vec3(voxel) + 0.5) * voxelSize;
        vec3 texCoord;

        if (!shouldSkip(pCenter, texCoord)) {
            float d;
            if (sampleVoxel(texCoord, d)) {
                bool isNan = (d == 1.0) || (abs(d - fillValue) < 0.005);

                if (isNan) {
                    if (nanAlpha > 0.0) {
                        float nanA = pow(nanAlpha, 5.0);
                        accumColor += (1.0 - alphaAcc) * nanA * nanColor;
                        alphaAcc += nanA;
                    }
                } else {
                    float sampLoc = min(d * cScale + cOffset, 0.99);
                    rescaler(sampLoc);
                    vec3 col = texture(cmap, vec2(sampLoc, 0.5)).rgb;

                    float alpha = pow(max(sampLoc, 0.001), transparency * opacityMag);
                    accumColor += (1.0 - alphaAcc) * alpha * col;
                    alphaAcc += alpha * (1.0 - alphaAcc);
                }

                if (alphaAcc >= 1.0){
                    if (useBorderTexture) {
                        vec3 pHit = vOrigin + t * rayDir;
                        vec3 localPosContinuous = (pHit - boxMin) / scale;
                        vec2 borderUV = localPosContinuous.xy;
                        #ifdef REPROJECT
                            borderUV = texture(remapTexture, borderUV).rg;
                        #endif
                        borderUV = realCoords(borderUV);
                        float borderDist = texture(borderTexture, borderUV).r;
                        if (borderDist <= borderWidth) {
                            color = vec4(borderColor, 1.0);
                            return;
                        }
                    }
                    break;
                } 
            }
        }

        // Advance to next voxel boundary AND update the tracked voxel index.
        if (tMax.x < tMax.y && tMax.x < tMax.z) {
            t = tMax.x;
            tMax.x += tDelta.x;
            voxel.x += stepDirI.x;
        } else if (tMax.y < tMax.z) {
            t = tMax.y;
            tMax.y += tDelta.y;
            voxel.y += stepDirI.y;
        } else {
            t = tMax.z;
            tMax.z += tDelta.z;
            voxel.z += stepDirI.z;
        }

        if (any(lessThan(voxel, ivec3(0))) || any(greaterThanEqual(voxel, ivec3(gridRes)))) break;
    }

    if (alphaAcc <= 0.0) discard;
    color = vec4(accumColor, alphaAcc);
}
