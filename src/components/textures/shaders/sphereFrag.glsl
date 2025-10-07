 // by Jeran Poehls
precision highp float;
precision highp sampler3D;

out vec4 color;

in vec3 aPosition;

uniform sampler3D map;
uniform sampler2D cmap;

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

void main(){
    vec2 sampleCoord = giveUV(aPosition);
    bool inBounds = all(greaterThanEqual(sampleCoord, vec2(0.0))) && 
                all(lessThanEqual(sampleCoord, vec2(1.0)));
    
    if (inBounds) {
    float strength = texture(map, vec3(sampleCoord, animateProg)).r;
    bool isNaN = strength == 1.;
    strength = isNaN ? strength : (strength)*cScale;
    strength = isNaN ? strength : min(strength+cOffset,0.99);
    color = isNaN ? vec4(nanColor, nanAlpha) : texture(cmap, vec2(strength, 0.5));
    if (!isNaN){
        color.a = 1.;
    }
    bool cond = isValid(sampleCoord);
    if (!cond && selectTS){
        color.rgb *= 0.65;
    }
    } else {
        color = vec4(nanColor, 1.); // Black
        color.a = nanAlpha;
    }

}