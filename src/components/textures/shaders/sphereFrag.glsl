 // by Jeran Poehls
precision highp float;
precision highp sampler3D;

out vec4 color;

in vec3 aPosition;

uniform sampler3D map[14];
uniform sampler2D cmap;
uniform vec3 textureDepths;

uniform float cOffset;
uniform float cScale;
uniform float animateProg;
uniform vec4[10] selectBounds; 
uniform bool selectTS;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform vec3 nanColor;
uniform float nanAlpha;

#define pi 3.141592653
#define epsilon 0.0001

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = atan(n.z, n.x);
    latitude = (latitude - latBounds.x)/(latBounds.y - latBounds.x);
    longitude = (longitude - lonBounds.x)/(lonBounds.y - lonBounds.x);

    return vec2(1.-longitude, latitude);
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

void main(){
    vec2 sampleCoord = giveUV(aPosition);
    bool inBounds = all(greaterThanEqual(sampleCoord, vec2(0.0))) && 
                all(lessThanEqual(sampleCoord, vec2(1.0)));
    
    if (inBounds) {
        int zStepSize = int(textureDepths.y) * int(textureDepths.x); 
        int yStepSize = int(textureDepths.x); 
        vec3 texCoord = vec3(sampleCoord, animateProg);
        ivec3 idx = clamp(ivec3(texCoord * textureDepths), ivec3(0), ivec3(textureDepths) - 1);
        int textureIdx = idx.z * zStepSize + idx.y * yStepSize + idx.x;
        vec3 localCoord = texCoord * (textureDepths); // Scale up
        localCoord = fract(localCoord);

        float strength = sample1(localCoord, textureIdx);
        bool isNaN = strength == 1.;
        strength = isNaN ? strength : (strength)*cScale;
        strength = isNaN ? strength : min(strength+cOffset,0.99);
        color = isNaN ? vec4(nanColor, nanAlpha) : texture(cmap, vec2(strength, 0.5));
        if (!isNaN){
            color.a = 1.;
        }
        if (selectTS){
            bool cond = isValid(sampleCoord);
            color.rgb *= cond ? 1. : 0.65;
        }
    } else {
        color = vec4(nanColor, 1.); // Black
        color.a = nanAlpha;
    }

}