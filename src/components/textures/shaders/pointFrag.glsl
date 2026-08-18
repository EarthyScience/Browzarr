out vec4 Color;

in float vValue;
in vec2 vUv;

void main() {
    if (useBorderTexture){
        vec2 borderUV = realCoords(vUv);
        float borderDist = texture(borderTexture, borderUV).r;
        if (borderDist <= borderWidth) {
            Color = vec4(borderColor, 1.0);
            return;
        }
    }
    float sampLoc = vValue == 1. ? vValue : (vValue - 0.5)*cScale + 0.5;
    sampLoc = vValue == 1. ? vValue : min(sampLoc+cOffset,0.99);
    vec4 color = texture(cmap, vec2(sampLoc, 0.5));
    color.a = 1.;
    Color = color;    
}
