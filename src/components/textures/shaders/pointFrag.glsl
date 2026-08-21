out vec4 Color;

in float vValue;
in vec2 vUv;

void main() {
    if (useBorderTexture){
        float borderDist = texture(borderTexture, vUv).r;
        if (borderDist <= borderWidth) {
            Color = vec4(borderColor, 1.0);
            return;
        }
    }
    vec4 color = texture(cmap, vec2(vValue, 0.5));
    color.a = 1.;
    Color = color;    
}
