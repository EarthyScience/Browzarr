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

// Organic flow field (active only during transitions)
vec3 flowField(vec3 p, float t) {
    float s = 0.4;
    return vec3(
        sin(p.x * s + t) * cos(p.y * s),
        cos(p.y * s + t) * sin(p.z * s),
        sin(p.z * s) * cos(p.x * s + t)
    ) * 0.3;
}

void main() {
    /* ---------------- Arrival (staggered) ---------------- */
    float arrival = smoothstep(aDelay, aDelay + 0.3, uArrivalProgress);

    /* ---------------- Active shape ---------------- */
    vec3 shape = mix(aSpherePosition, aCubePosition, uCubeMix);
    shape = mix(shape, aPlanePosition, uPlaneMix);
    shape = mix(shape, aRandomPosition, uRandomMix);

    /* ---------------- Flow during transitions ---------------- */
    float transition = uCubeMix + uPlaneMix + uRandomMix;
    shape += flowField(shape, uTime) * transition * 0.5;

    /* ---------------- Spawn → shape ---------------- */
    vec3 pos = mix(aSpawnPosition, shape, arrival);

    /* ---------------- Distance-based silvering ---------------- */
    float dist = distance(pos, shape);

    // How far is "far"
    float farMask = smoothstep(0.35, 0.9, dist);

    // Smooth hold transition (prevents popping)
    float holdEase = smoothstep(0.0, 1.0, uHold);

    // Final silver influence
    vGreyMix = farMask * holdEase;

    /* ---------------- Color signal → colormap ---------------- */
    float signal = sin(pos.x + pos.y + pos.z + uTime * 0.3);
    float mag = clamp((signal + 1.0) * 0.5, 0.0, 0.996);
    vColor = texture(cmap, vec2(mag, 0.5)).rgb;

    /* ---------------- Transform ---------------- */
    vec4 mv = viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    /* ---------------- Point size (smooth + smaller when silver) ---------------- */
    float sizeScale = mix(1.0, 0.5, vGreyMix);
    float size = (uSize * sizeScale) / -mv.z;
    gl_PointSize = clamp(size, 1.5, 20.0);
}
