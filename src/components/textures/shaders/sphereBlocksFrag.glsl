uniform sampler2D cmap;
uniform float cOffset;
uniform float cScale;
uniform bool useBorderTexture;
uniform sampler2D borderTexture;
uniform float borderWidth;
uniform vec3 borderColor;

in float vStrength;
in vec2 vUv;

out vec4 Color;


void main() {
    float strength = vStrength;

    strength *= cScale;
    strength = min(strength+cOffset,0.996);

    vec3 sampColor = texture(cmap, vec2(strength, 0.5)).rgb;

    if (useBorderTexture){
        float borderDist = texture(borderTexture, vUv).r;
        if (borderDist <= borderWidth) {
            Color = vec4(borderColor, 1.0);
            return;
        }
    }

    Color = vec4(sampColor, 1.);
}