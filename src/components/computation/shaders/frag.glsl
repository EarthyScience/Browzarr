uniform sampler2D data;
uniform sampler2D cmap;

uniform float cOffset;
uniform float cScale;

in vec2 vUv;
out vec4 Color;

void main() {
    vec4 val = texture(data,vUv);
    float d = val.x;
    float sampLoc = d == 1. ? d : (d - 0.5)*cScale + 0.5;
    sampLoc = d == 1. ? d : min(sampLoc+cOffset,0.99);
    vec4 color = texture(cmap, vec2(sampLoc,0.5));
    color.a = val.x > 0.999 ? 0. : 1.;

    Color = color;
}