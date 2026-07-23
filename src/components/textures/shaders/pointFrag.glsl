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

// APPLY_COLOR_SCALE

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
