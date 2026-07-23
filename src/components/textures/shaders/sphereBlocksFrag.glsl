uniform sampler2D cmap;
uniform float cOffset;
uniform float cScale;
uniform vec2 threshold;
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

in float vStrength;

out vec4 Color;

// APPLY_COLOR_SCALE

void main() {
    float strength = vStrength;
    bool isNaN = (strength == 1.) || (abs(strength - fillValue) < 0.005);
    if (isNaN) {
        Color = vec4(nanColor, nanAlpha);
        return;
    }
    if (strength < threshold.x) {
        if (useLowclip) Color = lowclip;
        else Color = vec4(0.);
        return;
    }
    if (strength > threshold.y) {
        if (useHighclip) Color = highclip;
        else Color = vec4(0.);
        return;
    }

    float range = max(threshold.y - threshold.x, 0.0001);
    float normS = clamp((strength - threshold.x) / range, 0.0, 1.0);

    if (colorScale == 1 && normS < logEps) {
        if (useLowclip) Color = lowclip;
        else Color = vec4(texture(cmap, vec2(0.0, 0.5)).rgb, 1.0);
        return;
    }

    float scaledS = applyColorScale(normS, colorScale, logConstant, logEps, dataRange, minVal);
    float rawSampLoc = scaledS * cScale + cOffset;

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
    vec3 sampColor = texture(cmap, vec2(sampLoc, 0.5)).rgb;
    Color = vec4(sampColor, 1.0);
}