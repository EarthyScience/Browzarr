in vec2 vStrength;
in vec2 vUv;

out vec4 Color;

void main() {
    if (useBorderTexture){
        float borderDist = texture(borderTexture, vUv).r;
        float latFac = cos(vUv.y);
        if (borderDist <= borderWidth * latFac) {
            Color = vec4(borderColor, 1.0);
            return;
        }
    }
    if (bivariate){
        bool flipOrder = bivariateSelection != 0;
        Color = vec4(flipOrder ? colorMixer(vStrength.g, vStrength.r) : colorMixer(vStrength.r, vStrength.g), 1.);
    } else Color = vec4(texture(cmap, vec2(vStrength.r, 0.5)).rgb, 1.0);
}