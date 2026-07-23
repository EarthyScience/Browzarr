out vec4 Color;

in float vValue;

uniform sampler2D cmap;
uniform float cScale;
uniform float cOffset;
uniform vec2 valueRange;
uniform float fillValue;
uniform vec3 nanColor;
uniform float nanAlpha;
uniform int colorScale;
uniform float logConstant;
uniform float logEps;
uniform float dataRange;
uniform float minVal;
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

float applyColorScale(float x, int scaleType, float c, float eps, float range, float minV) {
    float safeRange = max(range, 0.000001);
    if (scaleType == 1) {
        if (minV > 0.0) {
            float K = safeRange / minV;
            float clampedX = max(x, 0.0);
            float num = log(1.0 + clampedX * K);
            float denom = log(1.0 + K);
            return denom != 0.0 ? num / denom : x;
        } else {
            float safeEps = max(eps, 0.000001);
            if (x < safeEps) return 0.0;
            float xRel = (x - safeEps) / (1.0 - safeEps);
            float K = (1.0 - safeEps) / safeEps;
            float num = log(1.0 + xRel * K);
            float denom = log(1.0 + K);
            return denom != 0.0 ? num / denom : x;
        }
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

void main() {
    bool isNaN = (vValue == 1.) || (abs(vValue - fillValue) < 0.005);
    if (isNaN) {
        Color = vec4(nanColor, nanAlpha);
        return;
    }
    if (vValue < valueRange.x) {
        if (useLowclip) Color = lowclip;
        else Color = vec4(0.);
        return;
    }
    if (vValue > valueRange.y) {
        if (useHighclip) Color = highclip;
        else Color = vec4(0.);
        return;
    }

    float range = max(valueRange.y - valueRange.x, 0.0001);
    float normVal = clamp((vValue - valueRange.x) / range, 0.0, 1.0);

    if (colorScale == 1 && normVal < logEps) {
        if (useLowclip) Color = lowclip;
        else Color = vec4(texture(cmap, vec2(0.0, 0.5)).rgb, 1.0);
        return;
    }

    float scaledVal = applyColorScale(normVal, colorScale, logConstant, logEps, dataRange, minVal);
    float rawSampLoc = scaledVal * cScale + cOffset;

    if (rawSampLoc < 0.0) {
        if (useLowclip) Color = lowclip;
        else Color = vec4(texture(cmap, vec2(0.0, 0.5)).rgb, 1.0);
        return;
    }
    if (rawSampLoc > 1.0) {
        if (useHighclip) Color = highclip;
        else Color = vec4(texture(cmap, vec2(0.995, 0.5)).rgb, 1.0);
        return;
    }

    float sampLoc = clamp(rawSampLoc, 0.0, 0.995);
    vec4 color = texture(cmap, vec2(sampLoc, 0.5));
    color.a = 1.;
    Color = color;    
}
