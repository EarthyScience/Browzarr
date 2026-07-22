uniform sampler2D data;
uniform sampler2D cmap;

uniform float cOffset;
uniform float cScale;
uniform vec2 threshold;
uniform int colorScale;
uniform float logConstant;
uniform float logEps;
uniform float dataRange;
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

in vec2 vUv;
out vec4 Color;

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

void main() {
    vec4 val = texture(data, vUv);
    float d = val.x;
    if (d >= 0.999) {
        Color = vec4(0.0);
        return;
    }
    if (threshold.y > threshold.x) {
        if (d < threshold.x) {
            if (useLowclip) { Color = lowclip; return; }
            else { Color = vec4(0.0); return; }
        }
        if (d > threshold.y) {
            if (useHighclip) { Color = highclip; return; }
            else { Color = vec4(0.0); return; }
        }
    }

    float normD = (threshold.y > threshold.x) ? clamp((d - threshold.x) / (threshold.y - threshold.x), 0.0, 1.0) : d;
    if (colorScale == 1 && normD < logEps) {
        if (useLowclip) Color = lowclip;
        else Color = vec4(texture(cmap, vec2(0.0, 0.5)).rgb, 1.0);
        return;
    }
    float scaledD = applyColorScale(normD, colorScale, logConstant, logEps, dataRange);
    float rawSampLoc = scaledD * cScale + cOffset;

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
    color.a = 1.0;

    Color = color;
}