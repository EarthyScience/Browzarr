 // by Jeran Poehls

uniform sampler2D map;
uniform float displaceZero;
uniform float displacement;
uniform vec2 latBounds;
uniform vec2 lonBounds;

vec2 giveUV(vec3 position){
    vec3 n = normalize(position);
    float latitude = asin(n.y);
    float longitude = atan(n.z, n.x);
    latitude = (latitude - latBounds.x)/(latBounds.y - latBounds.x);
    longitude = (longitude - lonBounds.x)/(lonBounds.y - lonBounds.x);

    return vec2(1.-longitude, latitude);
}

out vec3 aPosition;

void main() {
    vec2 uv = giveUV(position);
    vec3 normal = normalize(position);
    float dispStrength = texture(map, uv).r;
    vec3 newPos = position + (normal * dispStrength * displacement);
    aPosition = position; //Pass out position for sphere frag
    vec4 worldPos = modelViewMatrix * vec4( newPos, 1.0 );
    gl_Position = projectionMatrix * worldPos;
}