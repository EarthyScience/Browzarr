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
out float vAlpha;

// Organic flow field (only during transitions)
vec3 flowField(vec3 p, float t) {
    float s = 0.4;
    return vec3(
        sin(p.x * s + t) * cos(p.y * s),
        cos(p.y * s + t) * sin(p.z * s),
        sin(p.z * s) * cos(p.x * s + t)
    ) * 0.3;
}

void main() {
    /* ---------------- Arrival ---------------- */
    float arrival = smoothstep(aDelay, aDelay + 0.3, uArrivalProgress);
    
    /* ---------------- Active shape ---------------- */
    vec3 shape = mix(aSpherePosition, aCubePosition, uCubeMix);
    shape = mix(shape, aPlanePosition, uPlaneMix);
    shape = mix(shape, aRandomPosition, uRandomMix);
    
    /* ---------------- Flow during morphs ---------------- */
    float transition = uCubeMix + uPlaneMix + uRandomMix;
    shape += flowField(shape, uTime) * transition * 0.5;
    
    /* ---------------- Spawn → shape ---------------- */
    vec3 pos = mix(aSpawnPosition, shape, arrival);
    
    /* ---------------- Distance logic ---------------- */
    float dist = distance(pos, shape);
    // Distance influence (soft)
    float farMask = smoothstep(0.35, 0.9, dist);
    
    // Staggered hold easing - each particle transitions at different time
    float holdOffset = aDelay * 0.5; // Use half the delay range for smoother stagger
    float particleHold = smoothstep(holdOffset, holdOffset + 0.5, uHold);
    
    // Silver influence
    vGreyMix = farMask * particleHold;
    
    /* ---------------- Subtle shimmer for near points during hold ---------------- */
    float shimmer = sin(uTime * 1.8 + pos.x * 3.0 + pos.y * 2.0) * 0.04;
    float shimmerMask = (1.0 - farMask) * particleHold;
    
    /* ---------------- Color → colormap ---------------- */
    float signal = sin(pos.x + pos.y + pos.z + uTime * 0.3);
    float mag = clamp((signal + 1.0) * 0.5 + shimmer * shimmerMask, 0.0, 0.996);
    vColor = texture(cmap, vec2(mag, 0.5)).rgb;
    
    /* ---------------- Alpha polish ---------------- */
    // Silver points slightly more transparent
    vAlpha = mix(0.85, 0.55, pow(vGreyMix, 1.2));
    
    /* ---------------- Transform ---------------- */
    vec4 mv = viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    
    /* ---------------- Point size (nonlinear shrink) ---------------- */
    float shrink = pow(vGreyMix, 1.4);
    float sizeScale = mix(1.0, 0.4, shrink);
    float size = (uSize * sizeScale) / -mv.z;
    gl_PointSize = clamp(size, 1.5, 20.0);
}