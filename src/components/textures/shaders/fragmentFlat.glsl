 // Basic Shader for colors on a plane used in FlatMap with 2D data
precision highp float;
precision highp sampler3D;

out vec4 color;

varying vec2 vUv;

uniform sampler2D map[14];
uniform sampler2D maskTexture;
uniform vec3 textureDepths;
uniform sampler2D cmap;
uniform float nanAlpha;
uniform vec3 nanColor;
uniform float cOffset;
uniform float cScale;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform int maskValue;
#define epsilon 0.0001
#define PI 3.14159265

vec2 realCoords(vec2 uv){
    vec2 normalizedLon = lonBounds/2./PI+0.5;
    vec2 normalizedLat = latBounds/PI+0.5;
    float lonScale = normalizedLon.y-normalizedLon.x;
    float latScale = normalizedLat.y-normalizedLat.x;
    
    float u = uv.x * lonScale + normalizedLon.x;
    float v = uv.y * latScale + normalizedLat.x;

    return vec2(u, v);
}

float sample1(vec2 p, int index) { // Shader doesn't support dynamic indexing so we gotta use switching
    if (index == 0) return texture(map[0], p).r;
    else if (index == 1) return texture(map[1], p).r;
    else if (index == 2) return texture(map[2], p).r;
    else if (index == 3) return texture(map[3], p).r;
    else if (index == 4) return texture(map[4], p).r;
    else if (index == 5) return texture(map[5], p).r;
    else if (index == 6) return texture(map[6], p).r;
    else if (index == 7) return texture(map[7], p).r;
    else if (index == 8) return texture(map[8], p).r;
    else if (index == 9) return texture(map[9], p).r;
    else if (index == 10) return texture(map[10], p).r;
    else if (index == 11) return texture(map[11], p).r;
    else if (index == 12) return texture(map[12], p).r;
    else if (index == 13) return texture(map[13], p).r;
    else return 0.0;
}

void main(){
    if (maskValue != 0){
        vec2 maskUV = realCoords(vUv);
        float mask = texture(maskTexture, maskUV).r;
        bool cond = maskValue == 1 ? mask<0.5 : mask>=0.5;
        if (cond){
            color = vec4(nanColor, 1.);
            color.a = nanAlpha;  
            return;
        }
    }
    int yStepSize = int(textureDepths.x); 
    vec2 texCoord = vUv;
    texCoord.xy = clamp(texCoord.xy, vec2(0.0), 1. - vec2(epsilon)); // This prevent the very edges from looping around and causing line artifacts
    ivec2 idx = clamp(ivec2(texCoord * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
    int textureIdx = idx.y * yStepSize + idx.x;
    vec2 localCoord = texCoord * (textureDepths.xy); // Scale up
    localCoord = fract(localCoord);

    float strength = sample1(localCoord, textureIdx);
    bool isNaN = strength == 1.;
    float sampLoc = isNaN ? strength: (strength - 0.5)*cScale + 0.5;
    sampLoc = isNaN ? strength : min(sampLoc+cOffset,0.995);
    color = isNaN ? vec4(nanColor, nanAlpha) : vec4(texture2D(cmap, vec2(sampLoc, 0.5)).rgb, 1.);

}