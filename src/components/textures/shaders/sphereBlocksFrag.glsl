uniform sampler2D cmap;
uniform float cOffset;
uniform float cScale;
uniform vec2 threshold;
uniform float fillValue;
uniform vec3 nanColor;
uniform float nanAlpha;
uniform int colorScale;
uniform vec4 lowclip;
uniform vec4 highclip;
uniform bool useLowclip;
uniform bool useHighclip;

in float vStrength;

out vec4 Color;

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
    float scaledS = applyColorScale(normS, colorScale);
    float sampLoc = min(scaledS * cScale + cOffset, 0.996);
    vec3 sampColor = texture(cmap, vec2(sampLoc, 0.5)).rgb;

    Color = vec4(sampColor, 1.0);
}