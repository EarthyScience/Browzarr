out vec4 Color;

in float vValue;

uniform sampler2D cmap;
uniform float cScale;
uniform float cOffset;

void main() {
    float sampLoc = vValue == 1. ? vValue : (vValue - 0.5)*cScale + 0.5;
    sampLoc = vValue == 1. ? vValue : min(sampLoc+cOffset,0.99);
    vec4 color = texture(cmap, vec2(sampLoc, 0.5));
    color.a = 1.;
    Color = color;    
}
