attribute float direction; 
attribute vec3 next;
attribute vec3 previous;
attribute float normed;

out float vNormed;

uniform float zoom;
uniform float thickness;
uniform int miter;
uniform float xScale; 
uniform float yScale;

float getOrthographicZoom(mat4 projectionMatrix, float referenceWidth) {
    float m0 = projectionMatrix[0][0]; // Scaling factor: 2/(right-left)
    float viewWidth = 2.0 / m0; // Viewable width
    return referenceWidth / viewWidth; // Zoom level
}

void main() {
    vec3 pos = position;
    vec3 prev = previous;
    vec3 nex = next;
    pos.x *= xScale/2.0;
    pos.y *= yScale;
    prev.x *= xScale/2.0;
    prev.y *= yScale;
    nex.x *= xScale/2.0;
    nex.y *= yScale;

    // Transform positions to view space (before projection)
    float zoom = getOrthographicZoom(projectionMatrix, 2.);
    float zoomLevel = 2. / projectionMatrix[0][0]; // Extract vertical scale
    vec4 currentView = modelViewMatrix * vec4(pos, 1.0);
    vec4 prevView = modelViewMatrix * vec4(prev, 1.0);
    vec4 nextView = modelViewMatrix * vec4(nex, 1.0);

    // Compute directions in view space
    vec3 dir = vec3(0.0);
    if (currentView.xyz == prevView.xyz) {
        dir = normalize(nextView.xyz - currentView.xyz);
    } else if (currentView.xyz == nextView.xyz) {
        dir = normalize(currentView.xyz - prevView.xyz);
    } else {
        vec3 dirA = normalize(currentView.xyz - prevView.xyz);
        if (miter == 1) {
            vec3 dirB = normalize(nextView.xyz - currentView.xyz);
            vec3 tangent = normalize(dirA + dirB);
            vec3 perp = vec3(-dirA.y, dirA.x, 0.0); // Perpendicular in view space
            vec3 miterVec = vec3(-tangent.y, tangent.x, 0.0);
            float miterLen = dot(miterVec, perp);
            miterLen = max(miterLen, 0.5); // Avoid division by zero
            dir = tangent;
        } else {
            dir = dirA;
        }
    }

    // Compute normal in view space
    vec3 normal = vec3(-dir.y, dir.x, 0.0); // Perpendicular to direction
    float len = thickness / zoom/500.; // Thickness in world/view space units
    normal *= 0.5 * len * direction; // Apply thickness and direction

    // Apply offset in view space
    currentView.xyz += normal;

    // Project to clip space
    gl_Position = projectionMatrix * currentView;


    vNormed = normed;
    gl_PointSize = 1.0;
}