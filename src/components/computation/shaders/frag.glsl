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

    Color = evaluateColorScale(
        d, threshold, 0.999, vec3(0.0), 0.0,
        cmap, cScale, cOffset, colorScale, logConstant, logEps,
        dataRange, minVal, lowclip, highclip, useLowclip, useHighclip
    );
}