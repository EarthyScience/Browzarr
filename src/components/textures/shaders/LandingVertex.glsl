precision highp float;

uniform float uSphereMix;
uniform float uCubeMix;
uniform float uPlaneMix;
uniform float uRandomMix;
uniform float uArrivalProgress;
uniform float uHold;
uniform float uTime;
uniform float uSize;
uniform sampler2D cmap;

in vec3 aSpherePosition;
in vec3 aCubePosition;
in vec3 aPlanePosition;
in vec3 aSpawnPosition;
in vec3 aRandomPosition;
in float aDelay;

out vec3 vColor;
out float vGreyMix;

vec3 flowField(vec3 p, float t) {
    float s = 0.4;
    return vec3(
        sin(p.x * s + t) * cos(p.y * s),
        cos(p.y * s + t) * sin(p.z * s),
        sin(p.z * s) * cos(p.x * s + t)
    ) * 0.3;
}

void main() {
    float arrival = smoothstep(aDelay, aDelay + 0.3, uArrivalProgress);

    vec3 shape = mix(aSpherePosition, aCubePosition, uCubeMix);
    shape = mix(shape, aPlanePosition, uPlaneMix);
    shape = mix(shape, aRandomPosition, uRandomMix);

    float transition = uCubeMix + uPlaneMix + uRandomMix;
    shape += flowField(shape, uTime) * transition * 0.5;

    vec3 pos = mix(aSpawnPosition, shape, arrival);

    float dist = distance(pos, shape);
    float farMask = smoothstep(0.3, 0.8, dist);
    vGreyMix = farMask * uHold;

    float signal = sin(pos.x + pos.y + pos.z + uTime * 0.3);
    float mag = clamp((signal + 1.0) * 0.5, 0.0, 0.996);
    vColor = texture(cmap, vec2(mag, 0.5)).rgb;

    vec4 mv = viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float sizeScale = mix(1.0, 0.65, vGreyMix);
    gl_PointSize = clamp((uSize * sizeScale) / -mv.z, 2.0, 20.0);
}
