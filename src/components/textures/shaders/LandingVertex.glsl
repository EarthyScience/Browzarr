uniform float uSphereMix;
uniform float uCubeMix;
uniform float uPlaneMix;
uniform float uSize;
uniform float uTime;
uniform float uArrivalProgress;
uniform sampler2D cmap;

attribute vec3 aSpherePosition;
attribute vec3 aCubePosition;
attribute vec3 aPlanePosition;
attribute vec3 aSpawnPosition;
attribute float aDelay;

varying vec3 vColor; 

// Flow field for organic, fluid-like movement
vec3 flowField(vec3 pos, float time) {
    float scale = 0.005;
    return vec3(
        sin(pos.x * scale + time) * cos(pos.y * scale),
        cos(pos.y * scale + time) * sin(pos.z * scale),
        sin(pos.z * scale) * cos(pos.x * scale + time)
    ) * 0.3;
}

void main() {
    // Calculate staggered arrival - each particle arrives at different time
    float particleArrival = smoothstep(aDelay, aDelay + 0.3, uArrivalProgress);
    
    // Linearly interpolate between the three shapes using the mix uniforms
    vec3 pos = mix(aSpherePosition, aCubePosition, uCubeMix);
    pos = mix(pos, aPlanePosition, uPlaneMix);
    
    // Add flow field for fluid, organic movement during transitions
    vec3 flow = flowField(pos, uTime);
    float transitionAmount = uCubeMix + uPlaneMix;
    float flowStrength = transitionAmount * 0.5; // More flow during transitions
    pos += flow * flowStrength;
    
    // Interpolate from spawn position to morphed position based on arrival
    vec3 finalPos = mix(aSpawnPosition, pos, particleArrival);
    
    // Color calculation
    float minBrightness = 0.2;
    float maxBrightness = 0.96;
    float r = sin(finalPos.z + (uTime * 0.2));
    float g = cos(finalPos.y + (uTime * 0.3));
    float b = cos(finalPos.x + finalPos.y + (uTime * 0.5));
    vColor = vec3(r, g, b);
    
    float mag = min(((sin(r + g + b) + 1.0) / 2.0), 0.996);
    vec4 sampled = texture(cmap, vec2(mag, 0.5));
    vColor = sampled.rgb;
    
    // Transform position
    vec4 modelPosition = modelMatrix * vec4(finalPos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;
    
    // Make points smaller as they are further away (perspective)
    gl_PointSize = (15.0 / -viewPosition.z);
}