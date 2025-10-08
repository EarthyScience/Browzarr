 // by Jeran Poehls

uniform sampler3D map;
uniform float displaceZero;
uniform float displacement;
uniform float animProg;

#define pi 3.141592653

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = atan(n.z, n.x);
    latitude = (latitude + pi/2.)/pi;
    longitude = (longitude + pi)/(2.*pi);
    return vec2(1.-longitude, latitude);
}

out vec3 aPosition;

void main() {
    vec2 uv = giveUV(position);
    vec3 normal = normalize(position);
    float dispStrength = texture(map, vec3(uv, animProg)).r;
    vec3 newPos = position + (normal * (dispStrength-displaceZero) * displacement);
    aPosition = position; //Pass out position for sphere frag
    vec4 worldPos = modelViewMatrix * vec4( newPos, 1.0 );
    gl_Position = projectionMatrix * worldPos;
}