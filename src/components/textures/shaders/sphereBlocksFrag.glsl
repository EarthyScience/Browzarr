uniform sampler2D cmap;
uniform sampler2D depthMap;
uniform float cOffset;
uniform float cScale;
uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;


varying float vStrength;

out vec4 Color;
in float vDepth;

float unpackDepth(float z_b) {
  float z_n = 2.0 * z_b - 1.0;
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z_n * (cameraFar - cameraNear));
}

void main() {
    float strength = vStrength;
    vec2 screenCoord = gl_FragCoord.xy/resolution;
    float thisDepth = unpackDepth(texture2D(depthMap, screenCoord).r);
    if (vDepth > thisDepth ) discard;
    strength *= cScale;
    strength = min(strength+cOffset,0.996);

    vec3 sampColor = texture(cmap, vec2(strength, 0.5)).rgb;

    Color = vec4(sampColor, 1.0);
}