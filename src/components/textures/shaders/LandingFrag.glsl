precision highp float;

in vec3 vColor;
in float vGreyMix;

out vec4 Color;

void main() {
    // circular points
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    vec3 silver = vec3(0.75);
    vec3 finalColor = mix(vColor, silver, vGreyMix);

    Color = vec4(finalColor, 0.8);
}
