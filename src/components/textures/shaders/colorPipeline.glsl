#ifndef CUSTOM_EXPR
#define CUSTOM_EXPR(val) (val)
#endif

float evalCustomExpr(float val) {
    return CUSTOM_EXPR(val);
}

float applyColorScale(float x, int scaleType, float c, float eps, float range, float minV) {
    float safeRange = max(range, 0.000001);
    if (scaleType == 1) {
        float effMin = minV > 0.0 ? minV : max(0.000001, eps * safeRange);
        float K = safeRange / effMin;
        float clampedX = max(x, 0.0);
        float num = log(1.0 + clampedX * K);
        float denom = log(1.0 + K);
        return denom != 0.0 ? num / denom : x;
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
    } else if (scaleType == 6) {
        float v0 = evalCustomExpr(0.0);
        float v1 = evalCustomExpr(1.0);
        float vx = evalCustomExpr(x);
        float denom = v1 - v0;
        return denom != 0.0 ? (vx - v0) / denom : vx;
    }
    return x;
}

bool isMasked(float maskSample, int maskVal) {
    if (maskVal == 0) return false;
    return maskVal == 1 ? (maskSample < 0.5) : (maskSample >= 0.5);
}

vec4 getLowclipColor(bool useLow, vec4 lowclipVal, vec4 fallbackVal) {
    return useLow ? lowclipVal : fallbackVal;
}

vec4 getHighclipColor(bool useHigh, vec4 highclipVal, vec4 fallbackVal) {
    return useHigh ? highclipVal : fallbackVal;
}

void accumulateSample(inout vec4 accumColor, inout float alphaAcc, vec4 colorSample) {
    if (colorSample.a > 0.0) {
        accumColor.rgb += (1.0 - alphaAcc) * colorSample.a * colorSample.rgb;
        alphaAcc += colorSample.a * (1.0 - alphaAcc);
    }
}

vec4 evaluateColorScale(
    float val,
    vec2 bounds,
    float fillVal,
    vec3 nanC,
    float nanA,
    sampler2D colormap,
    float cScaleVal,
    float cOffsetVal,
    int scaleType,
    float logC,
    float eps,
    float dataR,
    float minV,
    vec4 lowClipVal,
    vec4 highClipVal,
    bool useLow,
    bool useHigh
) {
    bool isNaN = (val == 1.0) || (abs(val - fillVal) < 0.005);
    if (isNaN) {
        return vec4(nanC, nanA);
    }
    if (val < bounds.x) {
        return getLowclipColor(useLow, lowClipVal, vec4(0.0));
    }
    if (val > bounds.y) {
        return getHighclipColor(useHigh, highClipVal, vec4(0.0));
    }

    float range = max(bounds.y - bounds.x, 0.0001);
    float normS = clamp((val - bounds.x) / range, 0.0, 1.0);

    vec4 cmapMinColor = vec4(texture(colormap, vec2(0.5 / 256.0, 0.5)).rgb, 1.0);
    vec4 cmapMaxColor = vec4(texture(colormap, vec2(254.5 / 256.0, 0.5)).rgb, 1.0);

    if (scaleType == 1 && normS < eps) {
        return getLowclipColor(useLow, lowClipVal, cmapMinColor);
    }

    float scaledS = applyColorScale(normS, scaleType, logC, eps, dataR, minV);
    float rawSampLoc = scaledS * cScaleVal + cOffsetVal;

    if (rawSampLoc < 0.0) {
        return getLowclipColor(useLow, lowClipVal, cmapMinColor);
    }
    if (rawSampLoc > 1.0) {
        return getHighclipColor(useHigh, highClipVal, cmapMaxColor);
    }

    float sampU = (0.5 + clamp(rawSampLoc, 0.0, 1.0) * 254.0) / 256.0;
    return vec4(texture(colormap, vec2(sampU, 0.5)).rgb, 1.0);
}

vec4 evaluateVolumeColorScale(
    float val,
    vec2 bounds,
    float fillVal,
    vec3 nanC,
    float nanA,
    sampler2D colormap,
    float cScaleVal,
    float cOffsetVal,
    int scaleType,
    float logC,
    float eps,
    float dataR,
    float minV,
    vec4 lowClipVal,
    vec4 highClipVal,
    bool useLow,
    bool useHigh,
    bool useClipScale,
    float transparency,
    float opacityMag
) {
    bool isNaN = (val == 1.0) || (abs(val - fillVal) < 0.005);
    if (isNaN) {
        return vec4(nanC, pow(nanA, 5.0));
    }
    if (val < bounds.x) {
        return useLow ? lowClipVal : vec4(0.0);
    }
    if (val > bounds.y) {
        return useHigh ? highClipVal : vec4(0.0);
    }

    float range = max(bounds.y - bounds.x, 0.0001);
    float normS = clamp((val - bounds.x) / range, 0.0, 1.0);

    if (scaleType == 1 && normS < eps) {
        return useLow ? lowClipVal : vec4(0.0);
    }

    float scaledS = applyColorScale(normS, scaleType, logC, eps, dataR, minV);
    float rawSampLoc = scaledS * cScaleVal + cOffsetVal;

    if (rawSampLoc < 0.0) {
        return useLow ? lowClipVal : vec4(0.0);
    }
    if (rawSampLoc > 1.0) {
        return useHigh ? highClipVal : vec4(0.0);
    }

    float sampU = (0.5 + clamp(rawSampLoc, 0.0, 1.0) * 254.0) / 256.0;
    vec4 col = texture(colormap, vec2(sampU, 0.5));
    float alpha;
    if (useClipScale) {
        float normalizedOpacity = clamp(scaledS, 0.0, 1.0);
        alpha = pow(max(normalizedOpacity, 0.001), transparency * opacityMag);
    } else {
        alpha = pow(max(rawSampLoc, 0.001), transparency * opacityMag);
    }
    return vec4(col.rgb, alpha);
}
