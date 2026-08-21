// by Jeran Poehls
precision highp float;
precision highp sampler3D;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform vec3 dataShape;
uniform vec3 scale;
uniform vec4 flatBounds;
uniform vec2 vertBounds;
uniform float transparency;
uniform float opacityMag;
uniform bool useClipScale;
uniform bool revTransparency;

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

bool shouldSkip(vec3 p, out vec3 texCoord, out vec2 maskUV) {
    // This functions creates denormalized texCoord while also checking for early skipping
    texCoord = vec3(0.0);

    if (p.x > -flatBounds.x || p.x < -flatBounds.y) return true;
    if (-p.z > -flatBounds.z || -p.z < -flatBounds.w) return true;
    if (p.y < vertBounds.x || p.y > vertBounds.y) return true;

    texCoord = p / scale + 0.5;
    maskUV = reprojector(texCoord);
    if (maskValue != 0) {
        float mask = texture(maskTexture, maskUV).r;
        bool masked = maskValue == 1 ? mask < 0.5 : mask >= 0.5;
        if (masked) return true;
    }
    texCoord.z = mod(texCoord.z + animateProg, 1.0001);
    texCoord = clamp(texCoord, vec3(0.0), 1.0 - vec3(EPSILON));

    return false;
}

bool sampleVoxel(vec3 texCoord, out float d, out bool isnan) {
    // This gets the sample value. If d is clipped by value-range return false
    ivec3 depths = ivec3(textureDepths);
    int yStepSize = depths.x;
    int zStepSize = depths.y * depths.x;

    ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), depths - 1);
    int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
    vec3 localCoord = fract(texCoord * textureDepths);
    d = sample1(localCoord, textureIdx);
    rescaler(d);
    isnan = isNaNBits(d) || (!useF16 && d == 1.0);
    d = max(min(d * cScale + cOffset, 0.995), 0.0);
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
        vec2 maskUV;
        if (!shouldSkip(pCenter, texCoord, maskUV)) {
            float d;
            bool isnan;
            if (sampleVoxel(texCoord, d, isnan)) {
                bool isNan =  isnan || (abs(d - fillValue) < 0.005);
                if (isNan) {    
                    if (nanAlpha > 0.0){ 
                        float nanA = pow(nanAlpha, 5.0);
                        accumColor += (1.0 - alphaAcc) * nanA * nanColor;
                        alphaAcc += nanA;
                    }
                } else {
                    vec3 col = texture(cmap, vec2(d, 0.5)).rgb;
                    float alphaFac = revTransparency ? 1.0 - d : d;
                    float alpha = pow(max(alphaFac, 0.001), transparency * opacityMag);
                    accumColor += (1.0 - alphaAcc) * alpha * col;
                    alphaAcc += alpha * (1.0 - alphaAcc);
                }
                if (alphaAcc >= 1.0){
                    if (useBorderTexture) {
                        vec3 pHit = vOrigin + t * rayDir;
                        vec3 localPosContinuous = (pHit - boxMin) / scale;
                        vec2 borderUV = reprojector(localPosContinuous);
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
