uniform sampler2D data;
uniform sampler2D cmap;

uniform float cOffset;
uniform float cScale;
uniform vec2 threshold;
uniform int colorScale;
uniform float logConstant;
uniform float logEps;
uniform float dataRange;
uniform float minVal;
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

in vec2 vUv;
out vec4 Color;

// APPLY_COLOR_SCALE

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
    float scaledD = applyColorScale(normD, colorScale, logConstant, logEps, dataRange, minVal);
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