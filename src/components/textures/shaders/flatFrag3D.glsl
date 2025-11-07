//This is for Flat Textures but with 3D textures to sample from i,e; animation

uniform sampler3D map[14];
uniform sampler2D cmap;
uniform vec3 textureDepths;

uniform bool selectTS;
uniform float cOffset;
uniform float cScale;
uniform float animateProg;
uniform float nanAlpha;
uniform vec3 nanColor;
uniform vec4[10] selectBounds; 

varying vec2 vUv;
out vec4 Color;
#define epsilon 0.0001

float sample1(vec3 p, int index) { // Shader doesn't support dynamic indexing so we gotta use switching
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

bool isValid(vec2 sampleCoord){
    for (int i = 0; i < 10; i++){
        vec4 thisBound = selectBounds[i];
        if (thisBound.x == -1.){
            return false;
        }
        bool cond = (sampleCoord.x < thisBound.r || sampleCoord.x > thisBound.g || sampleCoord.y < thisBound.b ||  sampleCoord.y > thisBound.a);
        if (!cond){
            return true;
        }
    }
    return false;
}

void main() {
    int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
    int yStepSize = int(textureDepths.x); 
    vec3 texCoord = vec3(vUv, animateProg);
    ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
    int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
    vec3 localCoord = texCoord * (textureDepths); // Scale up
    localCoord = fract(localCoord);

    float strength = sample1(localCoord, textureIdx);

    bool isNaN = strength == 1.;
    float sampLoc = isNaN ? strength: (strength)*cScale;
    sampLoc = isNaN ? strength : min(sampLoc+cOffset,0.995);
    Color = isNaN ? vec4(nanColor, nanAlpha) : vec4(texture2D(cmap, vec2(sampLoc, 0.5)).rgb, 1.);
    bool cond = isValid(vUv);
    if (!cond && selectTS){
        Color.rgb *= 0.65;
    }
}