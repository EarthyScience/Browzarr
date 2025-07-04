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
uniform vec4 selectBounds; 
uniform bool selectTS;

#define pi 3.141592653

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = atan(n.z, n.x);
    vec2 uv = vec2(-longitude/(pi), latitude/(pi/2.0));
    uv /= 2.;
    uv += 0.5;
    return uv;
}


void main(){
    vec2 sampleCoord = giveUV(aPosition);
    float strength = texture(map, vec3(sampleCoord, animateProg)).r;
    strength = strength == 1. ? strength : (strength - 0.5)*cScale + 0.5;
    strength = strength == 1. ? strength : min(strength+cOffset,0.99);
    color = texture(cmap, vec2(strength, 0.5));
    bool cond = (sampleCoord.x < selectBounds.r || sampleCoord.x > selectBounds.g || sampleCoord.y < selectBounds.b ||  sampleCoord.y > selectBounds.a);
    if (cond && selectTS){
        color.rgb *= 0.65;
    }
    color.a = 1.;
    // color = vec4(sampleCoord, 0., 1.0);

}