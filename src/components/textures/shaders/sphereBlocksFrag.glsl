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
    Color = evaluateColorScale(
        vStrength, threshold, fillValue, nanColor, nanAlpha,
        cmap, cScale, cOffset, colorScale, logConstant, logEps,
        dataRange, minVal, lowclip, highclip, useLowclip, useHighclip
    );
}