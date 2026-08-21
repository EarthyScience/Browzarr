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
    vec3 sampColor = texture(cmap, vec2(strength, 0.5)).rgb;

    if (useBorderTexture){
        float borderDist = texture(borderTexture, vUv).r;
        float latFac = cos(vUv.y);
        if (borderDist <= borderWidth * latFac) {
            Color = vec4(borderColor, 1.0);
            return;
        }
    }
    Color = vec4(sampColor, 1.);
    // Color = vec4(vec2(vUv.x > 0.55), 0.0 , 1.0);
}