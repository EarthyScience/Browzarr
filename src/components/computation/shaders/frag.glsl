uniform sampler2D data;
uniform sampler2D cmap;

uniform float cOffset;
uniform float cScale;
uniform vec2 threshold;
uniform int colorScale;
uniform float logConstant;
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

in vec2 vUv;
out vec4 Color;

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
    float scaledD = applyColorScale(normD, colorScale, logConstant);
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