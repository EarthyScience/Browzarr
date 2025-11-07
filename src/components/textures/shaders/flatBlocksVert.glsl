attribute vec2 instanceUV;

uniform sampler2D map[14];
uniform vec3 textureDepths;

uniform float displaceZero;
uniform float displacement;
uniform vec2 latBounds;
uniform vec2 lonBounds;
uniform float animateProg;

#define PI 3.1415926535

