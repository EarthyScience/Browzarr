out vec4 Color;

in float vValue;
in vec2 vUv;

uniform sampler2D cmap;
uniform sampler2D borderTexture;
uniform float cScale;
uniform float cOffset;
uniform bool useBorderTexture;
uniform float borderWidth;
uniform vec3 borderColor;
uniform vec2 lonBounds;
uniform vec2 latBounds;

#define PI 3.1415926535

vec2 realCoords(vec2 uv) {
    vec2 normalizedLon = lonBounds / (2.0 * PI) + 0.5;
    vec2 normalizedLat = latBounds / PI + 0.5;
    float lonScale = normalizedLon.y - normalizedLon.x;
    float latScale = normalizedLat.y - normalizedLat.x;

    float u = uv.x * lonScale + normalizedLon.x;
    float v = uv.y * latScale + normalizedLat.x;

    return vec2(u, v);
}

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
