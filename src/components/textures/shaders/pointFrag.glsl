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
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

float applyColorScale(float x, int scaleType, float c, float eps) {
    if (scaleType == 1) {
        float safeEps = max(eps, 0.000001);
        float clamped = max(x, safeEps);
        return (log(clamped) - log(safeEps)) / (log(1.0) - log(safeEps));
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

    float scaledVal = applyColorScale(normVal, colorScale, logConstant, logEps);
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
