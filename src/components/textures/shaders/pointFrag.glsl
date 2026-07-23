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
    Color = evaluateColorScale(
        vValue, valueRange, fillValue, nanColor, nanAlpha,
        cmap, cScale, cOffset, colorScale, logConstant, logEps,
        dataRange, minVal, lowclip, highclip, useLowclip, useHighclip
    );
}
