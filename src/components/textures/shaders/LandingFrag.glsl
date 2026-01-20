precision highp float;

in vec3 vColor;
in float vGreyMix;
in float vAlpha;

out vec4 Color;

void main() {
    vec3 silver = vec3(0.75);
    vec3 finalColor = mix(vColor, silver, vGreyMix);
    Color = vec4(finalColor, vAlpha);
}
