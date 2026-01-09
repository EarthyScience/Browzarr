 // by Jeran Poehls
precision highp float;
precision highp sampler2D;

out vec4 color;

in vec3 aPosition;

uniform sampler2D map[14];
uniform sampler2D cmap;
uniform vec3 textureDepths;

uniform float cOffset;
uniform float cScale;
uniform float animateProg;
uniform bool selectTS;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform vec3 nanColor;
uniform float nanAlpha;
uniform float fillValue;

#define pi 3.141592653

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

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = atan(n.z, n.x);
    latitude = (latitude - latBounds.x)/(latBounds.y - latBounds.x);
    longitude = (longitude - lonBounds.x)/(lonBounds.y - lonBounds.x);

    return vec2(1.-longitude, latitude);
}

void main(){
    vec2 texCoord = giveUV(aPosition);
    int yStepSize = int(textureDepths.x); 
    ivec2 idx = clamp(ivec2(texCoord * textureDepths.xy), ivec2(0), ivec2(textureDepths.xy) - 1);
    int textureIdx = idx.y * yStepSize + idx.x;
    vec2 localCoord = texCoord * (textureDepths.xy); // Scale up
    localCoord = fract(localCoord);

    float strength = sample1(localCoord, textureIdx);
    bool isNaN = strength == 1. || abs(strength - fillValue) < 0.005;
    strength = isNaN ? strength : (strength - 0.5)*cScale + 0.5;
    strength = isNaN ? strength : min(strength+cOffset,0.99);
    color = isNaN ? vec4(nanColor, nanAlpha) : texture(cmap, vec2(strength, 0.5));
    if (!isNaN){
        color.a = 1.;
    }

}