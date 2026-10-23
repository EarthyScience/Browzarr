out vec4 Color;

in vec2 vValue;
in vec2 vUv;

void main() {
    if (useBorderTexture){
        float borderDist = texture(borderTexture, vUv).r;
        if (borderDist <= borderWidth) {
            Color = vec4(borderColor, 1.0);
            return;
        }
    }
    vec4 color;
    if (bivariate)color = vec4(colorMixer(vValue.r, vValue.g), 1.0);
    else color = texture(cmap, vec2(vValue.r, 0.5));
    color.a = 1.;
    Color = color;    
}
