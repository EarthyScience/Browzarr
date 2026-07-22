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
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

float applyColorScale(float x, int scaleType) {
    if (scaleType == 1) {
        float eps = 0.000001;
        float clamped = max(x, eps);
        return (log(clamped) - log(eps)) / (log(1.0 + eps) - log(eps));
    } else if (scaleType == 2) {
        return log(1.0 + max(x, 0.0)) / log(2.0);
    } else if (scaleType == 3) {
        return sign(x) * sqrt(abs(x));
    } else if (scaleType == 4) {
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
    float scaledVal = applyColorScale(normVal, colorScale);
    float sampLoc = min(scaledVal * cScale + cOffset, 0.99);
    vec4 color = texture(cmap, vec2(sampLoc, 0.5));
    color.a = 1.;
    Color = color;    
}
