attribute float direction;
attribute vec3 next;
attribute vec3 previous;
attribute float normed;

out float vNormed;

uniform float aspect;
uniform float thickness;
uniform int miter;

void main() {
    // Transform positions to view space
    mat4 viewModel = modelViewMatrix;
    vec4 previousView = viewModel * vec4(previous, 1.0);
    vec4 currentView = viewModel * vec4(position, 1.0);
    vec4 nextView = viewModel * vec4(next, 1.0);

    // Use x-y plane in view space for 2D direction and normal computation
    vec2 previousXY = previousView.xy;
    vec2 currentXY = currentView.xy;
    vec2 nextXY = nextView.xy;

    float len = thickness;
    float orientation = direction;

    vNormed = normed;

    // Compute direction in view space (x-y plane)
    vec2 dir = vec2(0.0);
    if (currentXY == previousXY) {
        dir = normalize(nextXY - currentXY);
    } else if (currentXY == nextXY) {
        dir = normalize(currentXY - previousXY);
    } else {
        vec2 dirA = normalize(currentXY - previousXY);
        if (miter == 1) {
            vec2 dirB = normalize(nextXY - currentXY);
            vec2 tangent = normalize(dirA + dirB);
            vec2 perp = vec2(-dirA.y, dirA.x);
            vec2 miter = vec2(-tangent.y, tangent.x);
            dir = tangent;
            len = thickness / dot(miter, perp);
        } else {
            dir = dirA;
        }
    }

    // Compute normal in view space
    vec2 normal = vec2(-dir.y, dir.x);
    normal *= min(len,thickness); // Scale by thickness
    normal.x /= aspect; // Adjust for aspect ratio to ensure uniform thickness

    // Apply offset in view space
    vec4 offset = vec4(normal * orientation, 0.0, 0.0); // Offset only in x-y
    vec4 finalView = currentView + offset;

    // Transform to clip space
    gl_Position = projectionMatrix * finalView;
    gl_PointSize = 1.0;
}